const browserAPI = chrome || browser;

const fileInput = document.getElementById("fileInput");
const imageUrl = document.getElementById("imageUrl");
const loadUrlBtn = document.getElementById("loadUrlBtn");
const preview = document.getElementById("preview");

let imageFile = null;
let imageSrc = null;

fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        imageSrc = ev.target.result;
        showPreview(imageSrc);
    };
    reader.readAsDataURL(file);
});

loadUrlBtn.addEventListener("click", () => {
    if (!imageUrl.value) return;
    imageSrc = imageUrl.value;
    showPreview(imageSrc);
});

function showPreview(src) {
    preview.innerHTML = "";
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
        sizes.forEach(size => {
            const canvas = centerCrop(img, size);
            const div = document.createElement("div");
            div.className = "preview-item";
            div.innerHTML = `<p>${size}x${size}</p>`;
            div.appendChild(canvas);
            preview.appendChild(div);
        });
    };
    img.onerror = () => {
        alert("Could not load image. Try downloading it first.");
    };
}

document.getElementById("generateBtn").addEventListener("click", generateIcons);
const sizes = [600, 128, 48, 16];

function centerCrop(img, size) {
    const min = Math.min(img.width, img.height);
    const sx = (img.width - min) / 2;
    const sy = (img.height - min) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
        img,
        sx,
        sy,
        min,
        min,
        0,
        0,
        size,
        size
    );
    return canvas;
}

function generateIcons() {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
        sizes.forEach(size => {
            const canvas = centerCrop(img, size);
            canvas.toBlob(blob => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${size}x${size}.png`;
                a.click();
            });
        });
        const canvas16 = centerCrop(img, 16);
        canvas16.toBlob(blob => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "favicon.ico";
            a.click();
        });
    };
    img.onerror = () => {
        alert("Could not load image. Try downloading it first.");
    };
}
