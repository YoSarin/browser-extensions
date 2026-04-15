const BLADE_ICON_SELECTOR = ".fxs-blade-header-icon svg use";

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    });
}

function resolveLinks(id, processed = new Set([id])) {
    let html = "";
    try {
        const element = document.getElementById(id.replace('#', ''));
        html = element.outerHTML;

        const refs = new Set(html.match(/(#[a-z0-9\-_]+)/ig));
        refs.forEach(refId => {
            if (!processed.has(refId)) {
                html += resolveLinks(refId, new Set([...processed, ...refs]));
            }
        });
    } catch (_) { /* element not found */ }
    return html;
}

async function determineDefaultIcon() {
    try {
        const svg = await waitForElm(BLADE_ICON_SELECTOR);
        const id = svg.href?.animVal || svg.getAttribute("href") || svg.getAttributeNS("http://www.w3.org/1999/xlink", "href");
        const html = resolveLinks(id);
        const img = '<svg sizes="any" version="1.1" xmlns="http://www.w3.org/2000/svg"><use href="' + id + '" />' + html + '</svg>';
        return 'data:image/svg+xml;charset=utf-8;base64,' + btoa(img);
    } catch (e) {
        console.error("[ms-favicon] Failed to determine icon:", e);
        return null;
    }
}

function setFavicon(dataUrl) {
    ['icon', 'shortcut'].forEach(rel => {
        let link = document.querySelector("link[rel~='" + rel + "']");
        if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
        }
        link.type = 'image/svg+xml';
        link.href = dataUrl;
    });
}

async function modifyIcon() {
    const newIcon = await determineDefaultIcon();
    if (newIcon) {
        setFavicon(newIcon);
    }
}

function listenForBladeChange() {
    const target = document.querySelector(".fxs-blade-header-icon");
    if (!target) return;
    new MutationObserver(() => modifyIcon()).observe(target, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
    });
}

(async function () {
    'use strict';
    await waitForElm(BLADE_ICON_SELECTOR);
    listenForBladeChange();
})();
