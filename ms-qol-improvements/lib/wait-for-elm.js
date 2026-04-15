/** Resolves when an element matching `selector` appears in the DOM (or within `parent`). */
function waitForElm(selector, parent = document) {
    return new Promise(resolve => {
        const existing = parent.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = parent.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    });
}
