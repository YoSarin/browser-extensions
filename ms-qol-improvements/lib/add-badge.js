/** Draws `badgeText` over an icon loaded from `iconUrl`. Returns a PNG data-URI. */
async function addBadge(iconUrl, badgeText) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
        img.onload = resolve;
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
