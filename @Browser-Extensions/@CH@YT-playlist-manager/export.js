var api = typeof browser !== "undefined" ? browser : chrome;

function exportJSON(data) {

    const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    download(blob, "yt-playlists.json");
}

function exportCSV(data) {

    let csv = "Playlist,Video Title,Video URL\n";

    data.forEach(playlist => {

        playlist.videos.forEach(video => {

            csv += `"${playlist.playlist}","${video.title}","${video.url}"\n`;

        });

    });

    const blob = new Blob([csv], { type: "text/csv" });

    download(blob, "yt-playlists.csv");
}

function exportTXT(data) {

    let txt = "";
    console.log(data, "Exporting as TXT...");
    data.forEach(playlist => {

        txt += `Playlist: ${playlist.playlist}\n`;
        txt += `URL: ${playlist.url}\n\n`;

        playlist.videos.forEach(video => {

            txt += `${video.title}\n`;
            txt += `${video.url}\n\n`;

        });

        txt += "\n-----------------------\n\n";
    });

    const blob = new Blob([txt], { type: "text/plain" });

    download(blob, "yt-playlists.txt");
}

function download(blob, filename) {
    console.log(blob, filename, "Downloading...");
    const url = URL.createObjectURL(blob);

    api.downloads.download({
        url,
        filename,
        saveAs: true
    });
}