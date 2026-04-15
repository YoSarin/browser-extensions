// Locked tabs: tabId -> { url, windowId, index, pinned, groupId }
const lockedTabs = new Map();
// Guard against duplicate re-creates while a replacement is in flight
const replacingLocks = new Set();

const UNSUPPORTED_SCHEMES = ["chrome://", "edge://", "about:", "chrome-extension://", "extension://"];

function isLockableUrl(url) {
  if (!url) return false;
  return !UNSUPPORTED_SCHEMES.some((scheme) => url.startsWith(scheme));
}

// --- Persistence helpers ---

async function saveLocks() {
  const data = Object.fromEntries(lockedTabs);
  await chrome.storage.session.set({ lockedTabs: data });
}

async function restoreLocks() {
  const result = await chrome.storage.session.get("lockedTabs");
  const data = result.lockedTabs;
  if (!data) return;
  for (const [tabIdStr, lock] of Object.entries(data)) {
    const tabId = Number(tabIdStr);
    try {
      await chrome.tabs.get(tabId);
      lockedTabs.set(tabId, lock);
      setBadgeLocked(tabId);
    } catch {
      // Tab no longer exists — skip
    }
  }
}

// Restore locks when service worker starts
restoreLocks();

// --- Favicon badge (injected into tab context, must be self-contained) ---

async function _injectFaviconBadge() {
  const SIZE = 32;
  const EMOJI_SIZE = 14;

  if (window._lockFaviconObserver) {
    window._lockFaviconObserver.disconnect();
  }

  function getIconLink() {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.href = `${location.origin}/favicon.ico`;
      document.head.appendChild(link);
    }
    return link;
  }

  async function applyBadge() {
    const link = getIconLink();
    const currentHref = link.href;

    // Skip if we already badged this exact href
    if (currentHref === window._lockLastSetHref) return;

    window._lockLastSourceHref = currentHref;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");

    try {
      let imgSrc = currentHref;
      if (!currentHref.startsWith("data:")) {
        const resp = await fetch(currentHref);
        if (!resp.ok) throw new Error();
        const blob = await resp.blob();
        imgSrc = URL.createObjectURL(blob);
      }
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgSrc;
        });
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
      } finally {
        if (imgSrc !== currentHref) URL.revokeObjectURL(imgSrc);
      }
    } catch {
      // Badge drawn on transparent background
    }

    ctx.font = `${EMOJI_SIZE}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("\u{1F512}", 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    window._lockLastSetHref = dataUrl;
    link.href = dataUrl;
  }

  const observer = new MutationObserver(() => {
    const link = document.querySelector('link[rel~="icon"]');
    if (link && link.href !== window._lockLastSetHref) {
      applyBadge();
    }
  });

  observer.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"],
  });

  window._lockFaviconObserver = observer;
  await applyBadge();
}

function _clearFaviconBadge() {
  if (window._lockFaviconObserver) {
    window._lockFaviconObserver.disconnect();
    window._lockFaviconObserver = null;
  }

  // Restore the pre-badge favicon
  if (window._lockLastSourceHref) {
    const link = document.querySelector('link[rel~="icon"]');
    if (link) link.href = window._lockLastSourceHref;
  }

  window._lockLastSourceHref = null;
  window._lockLastSetHref = null;
}

// --- Favicon badge wrappers (background context) ---

function applyFaviconBadge(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: _injectFaviconBadge,
  }).catch(() => {});
}

function removeFaviconBadge(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: _clearFaviconBadge,
  }).catch(() => {});
}

// --- Badge helpers ---

function setBadgeLocked(tabId) {
  chrome.action.setBadgeText({ text: "L", tabId });
  chrome.action.setBadgeBackgroundColor({ color: "#e53935", tabId });
  chrome.action.setTitle({ title: "Tab is locked – click to unlock (Alt+L)", tabId });
  applyFaviconBadge(tabId);
}

function setBadgeUnlocked(tabId) {
  chrome.action.setBadgeText({ text: "", tabId });
  chrome.action.setTitle({ title: "Click to lock this tab (Alt+L)", tabId });
  removeFaviconBadge(tabId);
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
  await saveLocks();
}

function unlockTab(tabId) {
  lockedTabs.delete(tabId);
  setBadgeUnlocked(tabId);
  saveLocks();
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
  saveLocks();
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;
  lock.windowId = attachInfo.newWindowId;
  lock.index = attachInfo.newPosition;
  saveLocks();
});

chrome.tabs.onDetached.addListener((tabId, _detachInfo) => {
  // Keep the lock alive; onAttached will update position
  // If the tab is closed instead of reattached, onRemoved handles it
  void _detachInfo;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;
  if (changeInfo.pinned !== undefined) {
    lock.pinned = changeInfo.pinned;
    saveLocks();
  }
  // Re-apply badge after page reload / navigation
  if (changeInfo.status === "complete") {
    setBadgeLocked(tabId);
  }
});

// --- Re-open on close ---

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const lock = lockedTabs.get(tabId);
  if (!lock) return;

  lockedTabs.delete(tabId);

  // Don't reopen if the whole window is closing (browser shutdown / window close)
  if (removeInfo.isWindowClosing) {
    await saveLocks();
    return;
  }

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

    lockedTabs.set(newTab.id, {
      url: lock.url,
      windowId: newTab.windowId,
      index: newTab.index,
      pinned: newTab.pinned,
      groupId: lock.groupId,
    });
    setBadgeLocked(newTab.id);
    await saveLocks();
  } finally {
    replacingLocks.delete(key);
  }
});
