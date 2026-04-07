console.log("player loaded");

const player = document.getElementById("player");
const ytplayer = document.getElementById("ytplayer");

function getYouTubeID(url) {
  if (url.includes("youtu.be")) {
    return url.split("/").pop();
  }
  const match = url.match(/v=([^&]+)/);
  return match ? match[1] : null;
}

let lastIndex = -2;
let lastUrl = null;
function loadCurrent() {
  chrome.storage.local.get({
    queue: [],
    currentIndex: -1
  }, data => {
    const current = data.queue[data.currentIndex];
    if (data.currentIndex === lastIndex && current === lastUrl) return;
    lastIndex = data.currentIndex;
    lastUrl = current;
    if (!current) {
      console.log("Nothing playing");
      return;
    }
    console.log("PLAYING:", current);
    if (current.includes("youtube.com") || current.includes("youtu.be")) {
      const id = getYouTubeID(current);
      player.pause();
      player.src = "";
      player.style.display = "none";

      ytplayer.style.display = "block";
      ytplayer.innerHTML = ` <iframe width="300" height="200" src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen> </iframe> <a href="https://www.youtube.com/watch?v=${id}" target="_blank">open in new tab</a>`;
      // title="YouTube video player"
      // frameborder="0" allow="accelerometer; autoplay; clipboard-write; gyroscope; picture-in-picture"
    } else {
      ytplayer.innerHTML = "";
      ytplayer.style.display = "none";

      player.style.display = "block";
      player.src = current;
      player.play();
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.currentIndex || changes.queue) {
    loadCurrent();
    renderQueue();
  }
});

const queueList = document.getElementById("queue");
function renderQueue() {
  chrome.storage.local.get({ queue: [], currentIndex: -1 }, data => {
    queueList.innerHTML = "";
    console.log("QUEUE:", data.queue);

    data.queue.forEach((link, i) => {
      const li = document.createElement("li");
      // highlight current
      if (i === data.currentIndex) {
        li.style.background = "#4caf50";
        li.style.color = "#000";
        setTimeout(() => li.scrollIntoView({ block: "center" }), 50);
      }
      const title = document.createElement("span");
      title.textContent = link;
      // ▶ play selected
      const playBtn = document.createElement("button");
      playBtn.textContent = "play";
      playBtn.onclick = () => {
        chrome.storage.local.set({ currentIndex: i });
      };

      // ❌ remove
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.onclick = () => {
        data.queue.splice(i, 1);
        chrome.storage.local.set({ queue: data.queue });
      };
      // drag
      li.draggable = true;
      li.dataset.index = i;
      li.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", i);
      };
      li.ondragover = (e) => {
        e.preventDefault();
      };
      li.ondrop = (e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData("text/plain");
        const to = i;
        moveTrack(from, to);
      };
      li.ondragenter = (e) => {
        e.preventDefault();
        e.target.style.background = "#4caf50";
        e.target.style.color = "#000";
      };

      li.appendChild(playBtn);
      li.appendChild(removeBtn);
      li.appendChild(title);
      queueList.appendChild(li);
    });

    if (data.queue.length) {
      queueList.style.display = "block";
    } else {
      queueList.style.display = "none";
    }
  });
}
renderQueue();

function moveTrack(from, to) {

  chrome.storage.local.get({ queue: [] }, data => {

    const item = data.queue.splice(from, 1)[0];

    data.queue.splice(to, 0, item);

    chrome.storage.local.set({
      queue: data.queue
    });

  });
}

chrome.storage.local.get({ currentIndex: -1, queue: [] }, data => {
  if (data.currentIndex >= 0) {
    loadCurrent(); // resume last track
  } else if (data.queue.length > 0) {
    chrome.storage.local.set({ currentIndex: 0 }); // start from first
  }
});

document.getElementById("next").onclick = () => {
  chrome.runtime.sendMessage({ next: true });
};

document.getElementById("prev").onclick = () => {
  chrome.runtime.sendMessage({ prev: true });
};

player.onended = () => {
  chrome.storage.local.get({ repeat: "off" }, data => {
    if (data.repeat === "one") {
      player.currentTime = 0;
      player.play(); // 🔥 loop same track
      return;
    }
    chrome.runtime.sendMessage({ next: true });
  });
};

// document.getElementById("shuffle").onclick = () => {
//   chrome.storage.local.get({ shuffle: false }, data => {
//     chrome.storage.local.set({ shuffle: !data.shuffle });
//   });
// };

document.getElementById("repeat").onclick = () => {
  chrome.storage.local.get({ repeat: "off" }, data => {
    const next =
      data.repeat === "off" ? "all" :
        data.repeat === "all" ? "one" : "off";

    chrome.storage.local.set({ repeat: next });
  });
};

document.getElementById("savePlaylist").onclick = () => {
  const name = prompt("Playlist name?");
  if (!name) return;
  chrome.storage.local.get({ queue: [], playlists: {} }, data => {
    data.playlists[name] = [...data.queue];
    chrome.storage.local.set({ playlists: data.playlists });
  });
};

document.getElementById("loadPlaylist").onclick = () => {
  chrome.storage.local.get({ playlists: {} }, data => {
    const names = Object.keys(data.playlists);
    const choice = prompt("Available:\n" + names.join("\n"));
    if (!choice || !data.playlists[choice]) return;
    chrome.storage.local.set({
      queue: data.playlists[choice],
      currentIndex: 0
    });
  });
};
function updateRepeatUI() {
  chrome.storage.local.get({ repeat: "off" }, data => {
    document.getElementById("repeat").textContent =
      "Repeat: " + data.repeat;
  });
}
chrome.storage.onChanged.addListener((changes) => {
  if (changes.repeat) {
    updateRepeatUI();
  }
});
updateRepeatUI();

player.ontimeupdate = () => {
  chrome.storage.local.set({
    progress: player.currentTime,
    duration: player.duration || 1
  });
};

document.addEventListener("keydown", (e) => {
  // prevent typing conflicts
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

  if (e.code === "Space") {
    e.preventDefault();

    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  }

  if (e.code === "ArrowRight") {
    chrome.runtime.sendMessage({ next: true });
  }

  if (e.code === "ArrowLeft") {
    chrome.runtime.sendMessage({ prev: true });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.toggle) {
    if (player.paused) player.play();
    else player.pause();
  }
});

document.getElementById("highlighter").onclick = () => {
  const style = document.createElement("style");

  style.textContent = `
    html, body {
      background:#000 !important;
      color:#00ffcc !important;
    }

    button {
      background:#111;
      color:#00ffcc;
      border:1px solid #00ffcc;
    }

    ul {
      background:#000;
    }
  `;

  document.head.appendChild(style);
};
