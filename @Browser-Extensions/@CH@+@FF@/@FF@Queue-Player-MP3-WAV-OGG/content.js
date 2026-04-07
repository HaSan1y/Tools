chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "highlight") {
    const style = document.createElement("style");

    style.textContent = `
  html, body, input, li, label {
  background:#000 !important;
  color:#00ffcc !important;
  }

  a {
  color:#00ffaa !important;
  }

  span[data-hovercard-id], span[role="button"], span[class*="translated"] {
  background:#00ffcc !important;
  }

  button {
    background:#111;
    color:#00ffcc;
    border:1px solid #00ffcc;
  }

  span, textarea {
    color:#000 !important;
  }

  ::selection {
    background:#00ffcc;
    color:000;
  }
`;
    document.head.appendChild(style);
  }
});

const links = document.querySelectorAll("a[href]");
links.forEach((link) => {
  if (link.href.match(/\.(mp3|wav|ogg)$/i)) {
    const btn = document.createElement("button");
    btn.textContent = "▶";
    btn.onclick = () => {
      chrome.runtime.sendMessage({
        addToEnd: link.href,
      });
    };
    link.after(btn);
  }
});

function findMedia() {
  const media = [];
  // <audio> + <video>
  document.querySelectorAll("audio, video").forEach((el) => {
    if (el.src) media.push(el.src);
  });
  // <source> inside media
  document.querySelectorAll("source").forEach((el) => {
    if (el.src) media.push(el.src);
  });
  // YouTube links
  document.querySelectorAll("a").forEach((a) => {
    if (a.href.includes("youtube.com") || a.href.includes("youtu.be")) {
      media.push(a.href);
    }
  });
  return [...new Set(media)];
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "mediahighlight") {
    const found = findMedia();
    console.log("FOUND MEDIA:", found);
    // send ALL found media to queue
    chrome.runtime.sendMessage({
      addMany: found,
    });
  }
  if (msg.type === "highlighter") {
    const style = document.createElement("style");

    style.textContent = `
    * {
      background:#000 !important;
      color:#00ffcc !important;
    }

    textarea, input {
      background:#111 !important;
      color:#00ffcc !important;
    }

    a {
      color:#00ffaa !important;
    }

    ::selection {
      background:#00ffcc;
      color:#000;
    }
  `;

    document.head.appendChild(style);
  }
});
