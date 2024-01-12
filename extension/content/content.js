// Send viewport dimensions to the popup script
function sendViewportDimensions() {
    chrome.runtime.sendMessage({
        action: "viewportDimensions",
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
    });
}

// Call this function when the script is injected
sendViewportDimensions();

function createBoundingBox(location) {
    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.border = '2px solid red';
    box.style.top = location[0].y + 'px';
    box.style.left = location[0].x + 'px';
    box.style.width = (location[1].x - location[0].x) + 'px';
    box.style.height = (location[2].y - location[1].y) + 'px';
    document.body.appendChild(box);
    return box;
}

function displayTutorialStep(step) {
    console.log("Received step data:", step);
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'overlay-box';
    overlay.style.position = 'fixed';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.backgroundColor = 'white';
    overlay.style.padding = '20px';
    overlay.style.border = '1px solid black';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
        <p>${step.step}</p>
        <button id='continueButton'>Continue</button>
    `;

    document.body.appendChild(overlay);

    // If there is a location for the step, create a bounding box
    if (step.location && step.location.length > 0) {
        console.log("Creating bounding box with location:", step.location);
        const boundingBox = createBoundingBox(step.location);
        boundingBox.id = 'bounding-box';
    }

    // Set up event listener for the 'Continue' button
    document.getElementById('continueButton').addEventListener('click', function() {
        console.log("Continue button clicked, sending processNextStep message");
        removeOverlay();
        // Send message to the popup script to process the next step
        chrome.runtime.sendMessage({ action: "stepCompleted" });
    });

    // Notify popup.js that the step has been displayed
    chrome.runtime.sendMessage({ action: "stepDisplayed" });
}

function removeOverlay() {
    const overlayBox = document.getElementById('overlay-box');
    const boundingBox = document.getElementById('bounding-box');

    if (overlayBox) {
        overlayBox.remove();
    }
    if (boundingBox) {
        boundingBox.remove();
    }
}

chrome.runtime.sendMessage({ action: "stepDisplayed" });

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "displayStep") {
        displayTutorialStep(request.step);
    }
    else if (request.action === "removeOverlay") {
        removeOverlay();
    }
});


