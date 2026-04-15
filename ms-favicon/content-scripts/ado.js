class AdoInfo {
    #organizationName;
    #projectName;
    #url;

    constructor(url) {
        this.#url = new URL(url.toLocaleLowerCase());
        const pathSegments = this.#url.pathname.replace(/([/]{2,}|^\/)/, "").split("/");
        const hostnameSegments = this.#url.hostname.split(".");

        if (this.IsLegacyUrl()) {
            this.#organizationName = hostnameSegments[0];
            this.#projectName = pathSegments[0];
        } else {
            this.#organizationName = pathSegments[0];
            this.#projectName = pathSegments[1];
        }
    }

    IsLegacyUrl() { return this.#url.hostname !== "dev.azure.com"; }
    OrganizationName() { return this.#organizationName; }
    ProjectName() { return this.#projectName; }

    IsM365SupportDashboard() {
        return this.#organizationName === "m365engsec" && this.#projectName === "support";
    }
    IsBuildLogs() {
        return (/\/_build\/results$/).test(this.#url.pathname)
            && (/\bview=logs\b/).test(this.#url.search);
    }
    IsPipeline() { return (/\/_build(\/|$)/).test(this.#url.pathname); }
    IsGit() { return (/\/_git(\/|$)/).test(this.#url.pathname); }
    IsSettings() { return (/\/_settings(\/|$)/).test(this.#url.pathname); }
    IsWorkItemDetails() { return (/_workitems\/edit\//).test(this.#url.pathname); }
}

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
        observer.observe(document.body, { childList: true, subtree: true });
    });
}

function determineDefaultAdoIcon() {
    try {
        return document.getElementsByClassName("displayed-container")[0].getElementsByTagName("img")[0].src;
    } catch {
        return null;
    }
}

async function withBadge(iconUrl, badgeText) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = iconUrl;
    });

    const size = Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);

    if (badgeText !== null) {
        const text = badgeText.toString();
        const len = text.length;
        const scale = len === 1 ? 0.55 : len === 2 ? 0.45 : 0.35;
        ctx.font = `bold ${size * scale}px sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        const padding = size * 0.08;
        const x = size - padding;
        const y = size - padding;
        ctx.lineWidth = size * 0.12;
        ctx.strokeStyle = "#000000";
        ctx.strokeText(text, x, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y);
    }
    return canvas.toDataURL("image/png");
}

async function withPipelineStatusBadge(baseIconUrl) {
    let status = document.querySelector(".run-view-header svg.bolt-status desc")?.textContent?.trim();
    status ??= document.querySelector(".log-header svg.bolt-status desc")?.textContent?.trim();
    status = status?.toLowerCase();
    const badge =
        status === "success"    ? "🟢" :
        status === "failed"     ? "🔴" :
        status === "suceededwithwarnings" ? "🟡" :
        status === "cancelled"  ? "⚪" :
        status === "canceled"   ? "⚪" :
        "?";
    return withBadge(baseIconUrl, badge);
}

function svgTaskIcon(color) {
    const svg =
        `<svg width="32" height="32" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="2 2 6 6" fill="${color}">
          <path d="m6.3586 2.8161h-0.45357q0-0.36853-0.26931-0.63783t-0.63784-0.26931-0.63784 0.26931-0.26931 0.63783h-1.3607v5.4429h4.5357v-5.4429zm-2.7214 0.45357h0.90714v-0.45357q0-0.18426 0.12757-0.31183 0.14174-0.14174 0.326-0.14174 0.18426 0 0.31183 0.14174 0.14174 0.12757 0.14174 0.31183v0.45357h0.90714v0.45357h-2.7214zm0.79375 4.0821-1.1339-1.1339 0.45357-0.45357 0.68036 0.68036 1.8143-1.8143 0.45357 0.45357z"/>
        </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function setFavicon(url) {
    let favIcon = document.querySelector("link[rel~='icon']");
    if (!favIcon) {
        favIcon = document.createElement('link');
        favIcon.rel = 'icon';
        document.head.appendChild(favIcon);
    }
    favIcon.href = url;
}

async function getWorkItemIconColor() {
    await waitForElm('.work-item-type-icon');
    listenForAttributeChange('.work-item-type-icon');
    return getComputedStyle(document.getElementsByClassName('work-item-type-icon')[0]).getPropertyValue("color");
}

async function modifyIcon() {
    const pageInfo = new AdoInfo(window.location.href);

    const newIcon =
        pageInfo.IsM365SupportDashboard() ? "https://pic.onlinewebfonts.com/svg/img_463266.png" :
        pageInfo.IsBuildLogs()  ? await withPipelineStatusBadge("https://cdn-icons-png.flaticon.com/512/569/569837.png") :
        pageInfo.IsPipeline()   ? await withPipelineStatusBadge("https://cdn.vsassets.io/ext/ms.vss-build-web/common-library/Nav-Launch.3tiJhd.png") :
        pageInfo.IsGit()        ? "https://cdn.vsassets.io/ext/ms.vss-code-web/common-content/Nav-Code.0tJczm.png" :
        pageInfo.IsSettings()   ? "https://cdn3.iconfinder.com/data/icons/solid-locations-icon-set/64/Working_Tools_2-256.png" :
        pageInfo.IsWorkItemDetails() ? svgTaskIcon(await getWorkItemIconColor()) :
        determineDefaultAdoIcon();

    if (newIcon !== null) {
        setFavicon(newIcon);
    }
}

function listenForAttributeChange(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    new MutationObserver(mutations => {
        if (mutations.some(m => m.type === "attributes")) {
            modifyIcon();
        }
    }).observe(target, { attributes: true });
}

(function () {
    'use strict';

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            modifyIcon();
        }
    }).observe(document, { subtree: true, childList: true });

    modifyIcon();
})();
