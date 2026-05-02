const CHECK_INTERVAL_MINUTES = 5;

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create("checkPages", {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPages") {
    checkAllPages();
  }
});

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "manualCheck") {
    checkAllPages();
  }
});

async function checkAllPages() {
  const data = await browser.storage.local.get("pages");
  const pages = data.pages || [];

  for (let page of pages) {
    try {
      const response = await fetch(page.url);
      const text = await response.text();

      let content = text;

      // 🔥 Selector Mode (ohne DOMParser)
      if (page.selector) {
        content = extractBySelector(text, page.selector);
      }

      const hash = await hashText(content);

      if (page.lastHash && page.lastHash !== hash) {
        notifyChange(page.url);
      }

      page.lastHash = hash;

    } catch (e) {
      console.error("Error:", page.url, e);
    }
  }

  await browser.storage.local.set({ pages });
}

// 🧠 einfacher Selector Ersatz (MVP)
function extractBySelector(html, selector) {
  try {
    // sehr simpel: sucht nach id oder class
    if (selector.startsWith("#")) {
      const id = selector.replace("#", "");
      const regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>(.*?)</[^>]+>`, "s");
      const match = html.match(regex);
      return match ? match[1] : html;
    }

    if (selector.startsWith(".")) {
      const cls = selector.replace(".", "");
      const regex = new RegExp(`<[^>]*class=["'][^"']*${cls}[^"']*["'][^>]*>(.*?)</[^>]+>`, "s");
      const match = html.match(regex);
      return match ? match[1] : html;
    }

    return html;

  } catch (e) {
    return html;
  }
}

function notifyChange(url) {
  browser.notifications.create({
    type: "basic",
    iconUrl: "icons/16x16.png",
    title: "Change detected!",
    message: url
  });
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}