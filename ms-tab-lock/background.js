// Locked tabs: tabId -> { url, windowId, index, pinned, groupId }
const lockedTabs = new Map();
// Guard against duplicate re-creates while a replacement is in flight
const replacingLocks = new Set();

const UNSUPPORTED_SCHEMES = ["chrome://", "edge://", "about:", "chrome-extension://", "extension://"];

function isLockableUrl(url) {
  if (!url) return false;
  return !UNSUPPORTED_SCHEMES.some((scheme) => url.startsWith(scheme));
}

// --- Badge helpers ---

function setBadgeLocked(tabId) {
  chrome.action.setBadgeText({ text: "L", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#e53935", tabId });
  chrome.action.setTitle({ title: "Tab is locked – click to unlock (Alt+L)", tabId });
}

function setBadgeUnlocked(tabId) {
  chrome.action.setBadgeText({ text: "", tabId });
  chrome.action.setTitle({ title: "Click to lock this tab (Alt+L)", tabId });
}

// --- Snapshot current tab state ---

async function snapshotTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return {
    url: tab.url,
    windowId: tab.windowId,
    index: tab.index,
    pinned: tab.pinned,
    groupId: tab.groupId ?? -1,
  };
}

// --- Lock / Unlock ---

async function lockTab(tabId) {
  const snap = await snapshotTab(tabId);
  if (!isLockableUrl(snap.url)) return;
  lockedTabs.set(tabId, snap);
  setBadgeLocked(tabId);
}

function unlockTab(tabId) {
  lockedTabs.delete(tabId);
  setBadgeUnlocked(tabId);
}

// --- Toggle on action click ---

chrome.action.onClicked.addListener(async (tab) => {
  if (lockedTabs.has(tab.id)) {
    unlockTab(tab.id);
  } else {
    await lockTab(tab.id);
  }
});

// --- Keep position metadata up to date ---

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;
  lock.index = moveInfo.toIndex;
  lock.windowId = moveInfo.windowId ?? lock.windowId;
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;
  lock.windowId = attachInfo.newWindowId;
  lock.index = attachInfo.newPosition;
});

chrome.tabs.onDetached.addListener((tabId, _detachInfo) => {
  // Keep the lock alive; onAttached will update position
  // If the tab is closed instead of reattached, onRemoved handles it
  void _detachInfo;
});

// Update pinned state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;
  if (changeInfo.pinned !== undefined) {
    lock.pinned = changeInfo.pinned;
  }
});

// --- Re-open on close ---

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;

  lockedTabs.delete(tabId);

  // Don't reopen if the whole window is closing (browser shutdown / window close)
  if (removeInfo.isWindowClosing) return;

  // Guard against duplicate replacement
  const key = `${lock.windowId}:${lock.url}`;
  if (replacingLocks.has(key)) return;
  replacingLocks.add(key);

  try {
    // Clamp index: the tab count may have changed
    const tabsInWindow = await chrome.tabs.query({ windowId: lock.windowId });
    const maxIndex = tabsInWindow.length; // new tab can go at end
    const targetIndex = Math.min(lock.index, maxIndex);

    const newTab = await chrome.tabs.create({
      url: lock.url,
      windowId: lock.windowId,
      index: targetIndex,
      pinned: lock.pinned,
      active: true,
    });

    // Restore tab group if it still exists
    if (lock.groupId !== -1) {
      try {
        await chrome.tabs.group({ tabIds: newTab.id, groupId: lock.groupId });
      } catch {
        // Group may no longer exist — ignore
      }
    }

    // Re-lock the new tab
    lockedTabs.set(newTab.id, {
      url: lock.url,
      windowId: newTab.windowId,
      index: newTab.index,
      pinned: newTab.pinned,
      groupId: lock.groupId,
    });
    setBadgeLocked(newTab.id);
  } finally {
    replacingLocks.delete(key);
  }
});
