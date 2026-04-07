let altActive = false;
let shiftActive = false;

createOverlay();
function createOverlay() {
    if (document.getElementById("power-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "power-overlay";
    overlay.innerHTML = `
        <div id="dragHandle">≡</div>

        <button id="altBtn">ALT</button>
        <button id="shiftBtn">SHIFT</button>
        <button id="tabBtn">TAB</button>
        <button id="highlightBtn">HL</button>
        <button id="translateBtn">TR</button>

        <button id="minBtn">_</button>
    `;

    document.body.appendChild(overlay);
    bindButtons();
    const savedX = localStorage.getItem("overlayX");
    const savedY = localStorage.getItem("overlayY");
    if (savedX && savedY) {
        overlay.style.left = savedX;
        overlay.style.top = savedY;
        overlay.style.bottom = "auto";
        overlay.style.right = "auto";
    }
}

function bindButtons() {
    document.getElementById("altBtn").onclick = () => {
        altActive = !altActive;
        toggleColor("altBtn", altActive);
    };

    document.getElementById("shiftBtn").onclick = () => {
        shiftActive = !shiftActive;
        toggleColor("shiftBtn", shiftActive);
    };
    document.getElementById("minBtn").onclick = minimizeOverlay;
    document.getElementById("tabBtn").onclick = focusNextInput;
    document.getElementById("highlightBtn").onclick = highlightSelection;
    document.getElementById("translateBtn").onclick = translateSelection;
}

function minimizeOverlay() {
    const overlay = document.getElementById("power-overlay");
    overlay.innerHTML = `<div id="restoreBtn">≡</div>`;
    document.getElementById("restoreBtn").onclick = () => {
        overlay.remove();
        createOverlay();
        makeOverlayDraggable();
    };
}

function toggleColor(id, state) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (state) {
        btn.style.background = "#00ff99";
        btn.style.color = "black";
    } else {
        btn.style.background = "#222";
        btn.style.color = "white";
    }
}

function focusNextInput() {
    const inputs = document.querySelectorAll("input, textarea");
    for (let i = 0; i < inputs.length; i++) {
        if (document.activeElement === inputs[i]) {
            if (inputs[i + 1]) {
                inputs[i + 1].focus();
                return;
            }
        }
    }
    if (inputs.length > 0) {
        inputs[0].focus();
    }
}

function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.toString().length === 0) {
        alert("Select text first");
        return;
    }
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.classList.add("highlight");
    try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
    } catch (e) {
        console.log("Highlight failed:", e);
    }
}

function translateSelection() {
    const text = window.getSelection().toString();
    if (!text) {
        alert("Select text first");
        return;
    }
    const url =
        "https://translate.google.com/?sl=auto&tl=en&text=" +
        encodeURIComponent(text) +
        "&op=translate";
    window.location.href = url;
}

makeOverlayDraggable();
function makeOverlayDraggable() {
    const overlay = document.getElementById("power-overlay");
    const handle = document.getElementById("dragHandle");
    let isDragging = false;
    let offsetX, offsetY;
    handle.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - overlay.offsetLeft;
        offsetY = e.clientY - overlay.offsetTop;
        e.preventDefault();
    });
    handle.addEventListener("touchstart", (e) => {

        isDragging = true;

        offsetX = e.touches[0].clientX - overlay.offsetLeft;
        offsetY = e.touches[0].clientY - overlay.offsetTop;
    });
    document.addEventListener("touchmove", (e) => {

        if (!isDragging) return;

        overlay.style.left = (e.touches[0].clientX - offsetX) + "px";
        overlay.style.top = (e.touches[0].clientY - offsetY) + "px";
        overlay.style.bottom = "auto";
        overlay.style.right = "auto";
    });
    document.addEventListener("touchend", () => {

        if (!isDragging) return;

        isDragging = false;

        localStorage.setItem("overlayX", overlay.style.left);
        localStorage.setItem("overlayY", overlay.style.top);
    });
    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        overlay.style.left = (e.clientX - offsetX) + "px";
        overlay.style.top = (e.clientY - offsetY) + "px";
        overlay.style.bottom = "auto";
        overlay.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        localStorage.setItem("overlayX", overlay.style.left);
        localStorage.setItem("overlayY", overlay.style.top);
    });
}

const shiftMap = {
    "1": "!",
    "2": "\"",
    "3": "§",
    "4": "$",
    "5": "%",
    "6": "&",
    "7": "/",
    "8": "(",
    "9": ")",
    "0": "=",
    "-": "_",
    "=": "+",
    ";": ":",
    "'": "\"",
    ",": "<",
    ".": ">",
    "/": "?",
    "`": "~",
    "[": "{",
    "]": "}",
    "a": "A",
    "b": "B",
    "c": "C",
    "d": "D",
    "e": "E",
    "f": "F",
    "g": "G",
    "h": "H",
    "i": "I",
    "j": "J",
    "k": "K",
    "l": "L",
    "m": "M",
    "n": "N",
    "o": "O",
    "p": "P",
    "q": "Q",
    "r": "R",
    "s": "S",
    "t": "T",
    "u": "U",
    "v": "V",
    "w": "W",
    "x": "X",
    "y": "Y",
    "z": "Z"
};

const altMap = {
    "a": "ä",
    "o": "ö",
    "u": "ü",
    "s": "ş",
    "c": "ç",
    "g": "ğ",
    "n": "ñ",
    "i": "ï",
    "A": "Ä",
    "O": "Ö",
    "U": "Ü",
    "S": "ß",
    "1": "!",
    "2": "\"",
    "3": "§",
    "4": "$",
    "5": "%",
    "6": "&",
    "7": "/",
    "8": "(",
    "9": ")",
    "0": "=",
    "-": "_",
    "=": "+",
    ";": ":",
    "'": "\"",
    ",": "<",
    ".": ">",
    "/": "?",
    "`": "~",
    "[": "{",
    "]": "}"
};

document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
    let value = el.value;
    if (value.length === 0) return;
    let lastChar = value[value.length - 1];
    if (shiftActive) {
        if (shiftMap[lastChar]) {
            el.value =
                value.slice(0, -1) +
                shiftMap[lastChar];

        } else {
            el.value =
                value.slice(0, -1) +
                lastChar.toUpperCase();
        }
        shiftActive = false;
        toggleColor("shiftBtn", shiftActive);
    }

    if (altActive) {
        if (altMap[lastChar]) {
            el.value =
                value.slice(0, -1) +
                altMap[lastChar];
        }
        altActive = false;
        toggleColor("altBtn", altActive);
    }
});

function showSelectionPopup() {

    const text = window.getSelection().toString();

    const hlBtn = document.getElementById("highlightBtn");
    const trBtn = document.getElementById("translateBtn");

    if (!hlBtn || !trBtn) return;

    if (text.length > 0) {

        hlBtn.style.display = "block";
        trBtn.style.display = "block";

    } else {

        hlBtn.style.display = "none";
        trBtn.style.display = "none";
    }
}

document.addEventListener("selectionchange", showSelectionPopup);
showSelectionPopup();
