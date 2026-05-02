const urlInput = document.getElementById("url");
const selectorInput = document.getElementById("selector");
const addBtn = document.getElementById("add");
const checkBtn = document.getElementById("check");
const list = document.getElementById("list");

addBtn.onclick = async () => {
    const url = urlInput.value.trim();
    const selector = selectorInput.value.trim();

    if (!url) return;

    const data = await chrome.storage.local.get("pages");
    const pages = data.pages || [];

    pages.push({
        url,
        selector: selector || null,
        lastHash: null
    });

    await chrome.storage.local.set({ pages });

    urlInput.value = "";
    selectorInput.value = "";

    render();
};

checkBtn.onclick = () => {
    chrome.runtime.sendMessage({ type: "manualCheck" });
};

async function render() {
    const data = await chrome.storage.local.get("pages");
    const pages = data.pages || [];

    list.innerHTML = "";

    pages.forEach((p, index) => {
        const li = document.createElement("li");
        li.textContent = p.url + (p.selector ? ` (${p.selector})` : "");

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";

        removeBtn.onclick = async () => {
            pages.splice(index, 1);
            await chrome.storage.local.set({ pages });
            render();
        };

        li.appendChild(removeBtn);
        list.appendChild(li);
    });
}

render();