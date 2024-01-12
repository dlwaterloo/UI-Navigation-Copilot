chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Other background tasks can be managed here
});


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Message received in background.js:", request.action);

    // If the message comes from a content script, relay it to the popup script
    if (sender.tab) {
        chrome.runtime.sendMessage(request);
    }

    // Handle specific actions like "captureScreenshot"
    if (request.action === "captureScreenshot") {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'png' }, function(dataUrl) {
                sendResponse({ screenshotUrl: dataUrl });
            });
        });
        return true; // Keep this to handle the asynchronous response
    }
});
