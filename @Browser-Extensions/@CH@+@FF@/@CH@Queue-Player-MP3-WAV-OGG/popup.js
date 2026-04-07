const queueList = document.getElementById("queue");

function renderQueue() {
  chrome.storage.local.get({ queue: [] }, data => {
    queueList.innerHTML = "";
    data.queue.forEach((link, i) => {
      const li = document.createElement("li");
      li.textContent = formatName(link);
      // ❌ remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.onclick = () => {
        data.queue.splice(i, 1);
        chrome.storage.local.set({ queue: data.queue });
      };
      // ▶ play now button
      const playBtn = document.createElement("button");
      playBtn.textContent = "Play Now";
      playBtn.onclick = () => {
        chrome.runtime.sendMessage({
          playIndex: i
        });
      };
      li.appendChild(playBtn);
      li.appendChild(removeBtn);
      queueList.appendChild(li);
    });
  });
}

chrome.storage.onChanged.addListener(renderQueue);
renderQueue();

function renderNowPlaying() {
  chrome.storage.local.get(
    { queue: [], currentIndex: -1, progress: 0, duration: 1 },
    data => {
      const current = data.queue[data.currentIndex];
      document.getElementById("nowPlaying").textContent =
        formatName(current) || "Nothing playing";
      const percent = (data.progress / data.duration) * 100;
      document.getElementById("progress").value =
        isNaN(percent) ? 0 : percent;
    }
  );
}
chrome.storage.onChanged.addListener(renderNowPlaying);
renderNowPlaying();

document.getElementById("highlight").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "highlight" });
  });
};

function formatName(url) {
  if (!url) return "";
  try {
    const clean = url.split("/").pop().split("?")[0];
    return decodeURIComponent(clean).slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

document.getElementById("openPlayer").onclick = () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("player.html")
  });
};
