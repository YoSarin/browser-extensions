const SEPARATOR = " → ";
const MENUBAR_SELECTOR = 'ul[role="menubar"]';

function getNewTitle() {
    try {
        const page = document.querySelector('[aria-checked="true"]')?.text;
        const dashboardName = document.querySelector('a[aria-current="page"] > div > div')?.textContent;
        if (page && dashboardName) {
            return page + SEPARATOR + dashboardName;
        }
    } catch (e) {
        console.error("[ms-qol-improvements] Failed to determine title:", e);
    }
    return null;
}

(async function () {
    'use strict';

    const menu = await waitForElm(MENUBAR_SELECTOR);

    const observer = new MutationObserver(() => {
        const title = getNewTitle();
        if (title && document.title !== title) {
            document.title = title;
        }
    });

    observer.observe(menu, { attributes: true, childList: true, subtree: true });
    observer.observe(document.head, { attributes: true, childList: true, subtree: true });
})();
