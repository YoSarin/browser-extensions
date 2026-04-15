/** Resolves when an element matching `selector` appears in the DOM. */
function waitForElm(selector) {
    return new Promise(resolve => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
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
