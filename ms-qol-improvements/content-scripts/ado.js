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

function determineDefaultAdoIcon() {
    try {
        return document.getElementsByClassName("displayed-container")[0].getElementsByTagName("img")[0].src;
    } catch {
        return null;
    }
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
    return addBadge(baseIconUrl, badge);
}

function svgTaskIcon(color) {
    const svg =
        `<svg width="32" height="32" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="2 2 6 6" fill="${color}">
          <path d="m6.3586 2.8161h-0.45357q0-0.36853-0.26931-0.63783t-0.63784-0.26931-0.63784 0.26931-0.26931 0.63783h-1.3607v5.4429h4.5357v-5.4429zm-2.7214 0.45357h0.90714v-0.45357q0-0.18426 0.12757-0.31183 0.14174-0.14174 0.326-0.14174 0.18426 0 0.31183 0.14174 0.14174 0.12757 0.14174 0.31183v0.45357h0.90714v0.45357h-2.7214zm0.79375 4.0821-1.1339-1.1339 0.45357-0.45357 0.68036 0.68036 1.8143-1.8143 0.45357 0.45357z"/>
        </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
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

async function addPipelineSourceLink() {
    const yamlHeader = document.querySelector(".ci-yaml-editor-header");
    if (!yamlHeader || yamlHeader.querySelector("a")) return;

    const yamlPath = yamlHeader.querySelector(".editable-path-container")?.textContent;
    const yamlRepository = yamlHeader.querySelector(".repository-name")?.textContent;
    const branchInput = await waitForElm("input", yamlHeader);
    const yamlBranch = branchInput.value;
    if (!yamlPath || !yamlRepository || !yamlBranch) return;

    const pageInfo = new AdoInfo(window.location.href);
    const baseUrl = "https://dev.azure.com/" + pageInfo.OrganizationName() + "/" + pageInfo.ProjectName();
    const url = baseUrl + "/_git/" + yamlRepository + "?path=" + yamlPath + "&version=GB" + yamlBranch;

    const parent = yamlHeader.querySelector(".repository-name").parentNode;
    parent.innerHTML = '<a href="' + url + '">' + parent.innerHTML + '</a>';
}

(function () {
    'use strict';

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            modifyIcon();
            addPipelineSourceLink();
        }
    }).observe(document, { subtree: true, childList: true });

    modifyIcon();
    addPipelineSourceLink();
})();
