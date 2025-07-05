// Background script to handle tab capture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureTab") {
    // Capture the visible area of the active tab
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("StereoCamera extension installed");
});
