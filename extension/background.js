let currentStepIndex = 0;
let tutorialSteps = [];
let viewportWidth = 0;
let viewportHeight = 0;

let viewportDimensionsReceived = false;

// Function to save the tutorial state
function saveTutorialState() {
    chrome.storage.local.set({ tutorialSteps, currentStepIndex });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "viewportDimensions") {
        viewportWidth = request.width;
        viewportHeight = request.height;
        viewportDimensionsReceived = true; // Set the flag when dimensions are received
    } else if (request.action === "initiateTutorial") {
        tutorialSteps = request.steps;
        currentStepIndex = 0;
        saveTutorialState(); // Save state when tutorial is initiated
        processStep(tutorialSteps[currentStepIndex]);
    } else if (request.action === "stepCompleted") {
        currentStepIndex++;
        if (currentStepIndex < tutorialSteps.length) {
            processStep(tutorialSteps[currentStepIndex]);
        } else {
            // Tutorial ended, clear tutorial data and notify content script
            chrome.storage.local.remove(['tutorialSteps', 'currentStepIndex'], function() {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "endTutorial" });
                });
            });
        }
    }
    // ... other conditions if any ...
});

function waitForViewportDimensions() {
    return new Promise(resolve => {
        const checkDimensions = () => {
            if (viewportDimensionsReceived) {
                resolve();
            } else {
                setTimeout(checkDimensions, 100); // Check every 100ms
            }
        };
        checkDimensions();
    });
}

function processStep(step) {
    waitForViewportDimensions().then(() => {
        console.log("Processing step:", step);
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            // ... existing code to process image and display step ...
            fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                
                console.log("Image Blob:", blob);
                console.log("Step Data:", step);
                console.log("Viewport Width:", viewportWidth);
                console.log("Viewport Height:", viewportHeight);

                let formData = new FormData();
                formData.append('image', blob, 'screenshot.png');
                formData.append('step_data', JSON.stringify(step));
                formData.append('viewport_width', viewportWidth);
                formData.append('viewport_height', viewportHeight);

                fetch('http://localhost:8000/process_image', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(updatedStep => {
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "displayStep", step: updatedStep });
                    });
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        });
    });
}



// This function injects the content script into the active tab
function injectContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].id) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/content.js']
            });
        }
    });
}

// Listen for tabs being updated (like page reloads or new navigations)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        injectContentScript(); // Inject content script into the newly loaded page
    }
});