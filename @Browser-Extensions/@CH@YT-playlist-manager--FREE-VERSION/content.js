var api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "scanPlaylists") {
        const links = document.querySelectorAll('a[href*="/playlist?list="]');
        let playlists = [];
        links.forEach(link => {
            const title = link.textContent.trim();
            const url = link.href;
            if (title && url) {
                playlists.push({
                    title,
                    url
                });
            }
        });
        playlists = removeDuplicates(playlists);
        sendResponse(playlists);
    }
});

function removeDuplicates(arr) {
    const seen = new Set();
    return arr.filter(p => {
        if (seen.has(p.url)) return false;
        seen.add(p.url);
        return true;
    });
}

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "extractPlaylistVideos") {
        extractVideos().then(sendResponse);
        return true;
    }
});

async function extractVideos() {
    //     if (!location.href.includes("playlist?list=")) {
    //     alert("Open full playlist page");
    //     return [];
    // }

    // await autoScroll();

    // const items = document.querySelectorAll(
    //     "ytd-playlist-video-renderer"
    // );
    const elements = document.querySelectorAll(
        "ytd-playlist-panel-video-renderer"
    );
    const videos = [];
    elements.forEach((item, index) => {
        const titleEl = item.querySelector("#video-title");
        if (!titleEl) return;
        const linkEl = item.querySelector("a[href*='watch']");
        if (!linkEl) return;
        const title = titleEl.textContent.trim();
        const url = linkEl.href.split("&")[0];
        videos.push({
            position: index + 1,
            title,
            url
        });
    });
    return videos;
}

async function autoScroll() {
    let lastHeight = 0;
    for (let i = 0; i < 15; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 1200));
        let newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) {
            break;
        }
        lastHeight = newHeight;
    }
}
