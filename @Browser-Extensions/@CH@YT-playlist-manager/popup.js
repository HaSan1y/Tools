var api = typeof browser !== "undefined" ? browser : chrome;

const scanBtn = document.getElementById("scan");
const jsonBtn = document.getElementById("json");
const csvBtn = document.getElementById("csv");
const txtBtn = document.getElementById("txt");
const resetBtn = document.getElementById("reset");
const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");

let playlists = [];

scanBtn.onclick = async () => {

    statusEl.textContent = "Scanning...";

    const [tab] = await api.tabs.query({ active: true, currentWindow: true });

    api.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });

    api.tabs.sendMessage(tab.id, { action: "scanPlaylists" }, (response) => {

        if (!response) {
            statusEl.textContent = "Open YouTube playlists page";
            return;
        }

        playlists = response;

        countEl.textContent = playlists.length;
        statusEl.textContent = "Scan complete";
    });
};

jsonBtn.onclick = () => {

    if (!playlists.length) return;

    exportJSON(playlists);
};

csvBtn.onclick = () => {

    if (!playlists.length) return;

    exportCSV(playlists);
};

txtBtn.onclick = () => {

    if (!playlists.length) return;

    exportTXT(playlists);
};

resetBtn.onclick = () => {

    playlists = [];
    countEl.textContent = 0;
    statusEl.textContent = "Reset";
};

const extractBtn = document.getElementById("extractVideos");

extractBtn.onclick = async () => {

    statusEl.textContent = "Extracting videos...";

    const [tab] = await api.tabs.query({ active: true, currentWindow: true });

    api.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });

    api.tabs.sendMessage(tab.id, { action: "extractPlaylistVideos" }, (videos) => {

        if (!videos) {
            statusEl.textContent = "Open a playlist first";
            return;
        }

        playlists = [{
            playlist: document.title,
            url: tab.url,
            videos: videos
        }];

        countEl.textContent = videos.length;
        statusEl.textContent = "Videos extracted";
    });
};