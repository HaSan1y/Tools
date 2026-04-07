var api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: "playNow",
    title: "▶ Play Now",
    contexts: ["link", "audio", "video"],
  });
  api.contextMenus.create({
    id: "addToEnd",
    title: "➕ Add to End",
    contexts: ["link", "audio", "video"],
  });

  api.contextMenus.create({
    id: "playNext",
    title: "⏭ Play Next",
    contexts: ["link", "page", "audio", "video"],
  });
  api.tabs.create({ url: api.runtime.getURL("player.html") });
});

api.contextMenus.onClicked.addListener((info) => {
  let url = info.linkUrl || info.srcUrl || info.pageUrl;

  api.storage.local.get({ queue: [] }, (data) => {
    if (info.menuItemId === "playNow") {
      data.queue.unshift(url);
    }
    if (info.menuItemId === "playNext") {
      data.queue.unshift(url);
    }
    if (info.menuItemId === "addToEnd") {
      data.queue.push(url);
    }
    api.storage.local.set({ queue: data.queue });
    updateBadge();
  });
});

api.commands.onCommand.addListener((cmd) => {
  // api.runtime.sendMessage("next");
  if (cmd === "next") {
    api.runtime.sendMessage({ next: true });
  }
  if (cmd === "prev") {
    api.runtime.sendMessage({ prev: true });
  }
  if (cmd === "playpause") {
    api.runtime.sendMessage({ toggle: true });
  }
});

api.runtime.onMessage.addListener((msg) => {
  api.storage.local.get({
    queue: [],
    currentIndex: -1,
    shuffle: false,
    repeat: "off"
  }, data => {
    if (msg.playIndex !== undefined) {
      data.currentIndex = msg.playIndex;
    }
    // ▶ PLAY NOW
    if (msg.playNow) {
      let index = data.queue.indexOf(msg.playNow);

      if (index === -1) {
        data.queue.unshift(msg.playNow);
        // data.currentIndex = 0;
        index = 0;
      }
      data.currentIndex = index;
    }
    // ➕ ADD TO END
    if (msg.addToEnd) {
      if (!data.queue.includes(msg.addToEnd)) {
        data.queue.push(msg.addToEnd);
      }
    }
    // ⏭ NEXT
    if (msg.next) {
      // 🔁 repeat ONE → stay on same track
      if (data.repeat === "one") {
        // do nothing, keep same index
      } else {
        if (data.shuffle) {
          data.currentIndex = Math.floor(Math.random() * data.queue.length);
        } else {
          data.currentIndex++;
        }
        if (data.currentIndex >= data.queue.length) {
          if (data.repeat === "all") {
            data.currentIndex = 0;
          } else {
            data.currentIndex = -1;
          }
        }
      }
    }
    // ⏮ PREVIOUS
    if (msg.prev) {
      data.currentIndex--;
      if (data.currentIndex < 0) {
        data.currentIndex = 0;
      }
    }
    // ❌ REMOVE
    if (msg.removeIndex !== undefined) {
      data.queue.splice(msg.removeIndex, 1);
      if (msg.removeIndex <= data.currentIndex) {
        data.currentIndex--;
      }
    }
    api.storage.local.set(data);
  });
});

function updateBadge() {
  api.storage.local.get({ queue: [] }, (data) => {
    const count = data.queue.length;
    if (api.action) {
      api.action.setBadgeText({ text: count.toString() });
      api.action.setBadgeBackgroundColor({ color: "#4caf50", });
    } else {
      api.browserAction.setBadgeText({ text: count.toString() });
      api.browserAction.setBadgeBackgroundColor({ color: "#4caf50", });
    }
    // api.action.setBadgeText({
    //   text: count ? count.toString() : "",
    // });
  });
}

api.storage.onChanged.addListener((changes) => {
  if (changes.queue) {
    updateBadge();
  }
});
