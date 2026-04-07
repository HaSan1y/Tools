chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_readme") {

    // Try multiple possible selectors
    const readmeElement =
      document.querySelector("article.markdown-body") ||
      document.querySelector("div.markdown-body") ||
      document.querySelector("[data-testid='readme']");

    if (!readmeElement) {
      sendResponse({ content: null });
      return;
    }

    const textContent = readmeElement.innerText;
    sendResponse({ content: textContent });
  }
});