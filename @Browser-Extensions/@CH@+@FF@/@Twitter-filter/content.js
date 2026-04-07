const storage = chrome?.storage || browser?.storage;

let blockedUsers = [];
let blockedKeywords = [];
let filteredCount = 0;
let scanScheduled = false;

function safeGet(keys, callback) {
  try {
    storage.sync.get(keys, (data) => {
      if (chrome?.runtime?.lastError) {
        console.error("Storage get error:", chrome.runtime.lastError);
        callback({});
        return;
      }
      callback(data || {});
    });
  } catch (e) {
    console.error("Storage access failed", e);
    callback({});
  }
}
function safeSet(data) {
  try {
    storage.sync.set(data, () => {
      if (chrome?.runtime?.lastError) {
        console.error("Storage set error:", chrome.runtime.lastError);
      }
    });
  } catch (e) {
    console.error("Storage set failed", e);
  }
}

safeGet(["blockedUsers", "blockedKeywords", "filteredCount"], (data) => {
  blockedUsers = data.blockedUsers || [];
  blockedKeywords = data.blockedKeywords || [];
  filteredCount = data.filteredCount || 0;
  startFiltering();
});

function startFiltering() {
  createCounterUI();

  const observer = new MutationObserver(() => {
    scheduleScan();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleScan();
}

function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;

  requestIdleCallback(() => {
    try {
      filterTweets();
    } catch (e) {
      console.error("Filtering error:", e);
    }
    scanScheduled = false;
  }, { timeout: 1000 });
}

function filterTweets() {
  const tweets = document.querySelectorAll("article");

  tweets.forEach(tweet => {
    if (tweet.dataset.filtered) return;

    let shouldRemove = false;

    try {
      const userLinks = tweet.querySelectorAll("a[href^='/']");

      for (let link of userLinks) {
        const href = link.getAttribute("href");
        if (!href) continue;

        const username = href.split("/")[1]?.toLowerCase();
        if (!username) continue;

        if (blockedUsers.includes(username)) {
          shouldRemove = true;
          break;
        }
      }

      if (!shouldRemove) {
        const tweetText = tweet.innerText.toLowerCase();

        for (let keyword of blockedKeywords) {
          if (tweetText.includes(keyword.toLowerCase())) {
            shouldRemove = true;
            break;
          }
        }
      }

      if (shouldRemove) {
        tweet.style.display = "none";
        tweet.dataset.filtered = "true";
        filteredCount++;
        safeSet({ filteredCount });
        updateCounterUI();
      }
    } catch (e) {
      console.error("Tweet parsing error:", e);
    }
  });
}

function createCounterUI() {
  if (document.getElementById("twitter-filter-counter")) return;

  const counter = document.createElement("div");
  counter.id = "twitter-filter-counter";
  counter.style.position = "fixed";
  counter.style.bottom = "20px";
  counter.style.right = "20px";
  counter.style.background = "#0f172a";
  counter.style.color = "white";
  counter.style.padding = "10px 15px";
  counter.style.borderRadius = "10px";
  counter.style.fontSize = "14px";
  counter.style.zIndex = "999999";
  counter.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
  counter.style.fontFamily = "Arial";
  counter.innerText = `Filtered: ${filteredCount}`;

  document.body.appendChild(counter);
}

function updateCounterUI() {
  const counter = document.getElementById("twitter-filter-counter");
  if (counter) {
    counter.innerText = `Filtered: ${filteredCount}`;
  }
}