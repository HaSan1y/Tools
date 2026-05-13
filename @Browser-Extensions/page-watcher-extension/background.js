const CHECK_INTERVAL_MINUTES = 5;

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("checkPages", {
        periodInMinutes: CHECK_INTERVAL_MINUTES
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkPages") {
        checkAllPages();
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "manualCheck") {
        checkAllPages();
    }
});

async function checkAllPages() {
    const data = await chrome.storage.local.get("pages");
    const pages = data.pages || [];
    let changed = false;

    for (let page of pages) {
        try {
            const response = await fetch(page.url);
            const html = await response.text();

            let content = html;
            if (page.selector) {
                content = extractBySelector(html, page.selector);
            }

            const normalized = normalizeContent(content);
            const hash = await hashText(normalized);

            if (page.lastHash && page.lastHash !== hash) {
                notifyChange(page.url);
                changed = true;
            }

            page.lastHash = hash;

        } catch (e) {
            console.error("Error:", page.url, e);
        }
    }

    if (changed) {
        await chrome.storage.local.set({ pages });
    }
}

function extractBySelector(html, selector) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const element = doc.querySelector(selector);
        return element ? element.innerHTML : html;
    } catch (e) {
        return html;
    }
}

function normalizeContent(content) {
    return content.replace(/\s+/g, " ").trim();
}

function notifyChange(url) {
    chrome.notifications.create(url, {
        type: "basic",
        iconUrl: "icons/16x16.png",
        title: "Change detected!",
        message: url
    });
}

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith("http://") || notificationId.startsWith("https://")) {
        chrome.tabs.create({ url: notificationId });
    }
});

async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}