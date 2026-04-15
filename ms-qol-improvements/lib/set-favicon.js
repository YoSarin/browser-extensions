/** Sets the page favicon. Automatically detects SVG data-URIs and sets the MIME type. */
function setFavicon(url) {
    const isSvg = url.startsWith("data:image/svg+xml");
    ["icon", "shortcut"].forEach(rel => {
        let link = document.querySelector("link[rel~='" + rel + "']");
        if (!link) {
            link = document.createElement("link");
            link.rel = rel;
            document.head.appendChild(link);
        }
        link.type = isSvg ? "image/svg+xml" : "";
        link.href = url;
    });
}
