async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
}

async function loadStats() {
    const tab = await getCurrentTab();
    try {
        chrome.tabs.sendMessage(tab.id, { type: "GET_STATS" },
            (response) => {
                if (!response) {
                    document.getElementById("stats").textContent = "No response."; return;
                }
                let text = "";
                text += "=== EVENT LISTENERS ===\n\n";
                for (const key in response.listeners) {
                    text += `${key}: ${response.listeners[key]}\n`;
                }
                text += "\n";
                text += `Intervals: ${response.intervals}\n`;
                text += `Timeouts: ${response.timeouts}\n`;
                text += `AnimationFrames: ${response.rafs}\n`;
                document.getElementById("stats").textContent = text;
            }
        );
    } catch (error) {
        // document.getElementById("stats").textContent = "Error: " + error.message;
        console.error(error);
    }
}

document.getElementById("panic").addEventListener("click", async () => {
    const tab = await getCurrentTab();
    chrome.tabs.sendMessage(tab.id, { type: "PANIC" },
        () => { alert("Panic mode activated."); }
    );
});

loadStats();
