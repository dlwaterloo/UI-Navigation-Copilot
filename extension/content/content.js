// Function to send viewport dimensions
function sendViewportDimensions() {
    chrome.runtime.sendMessage({
        action: "viewportDimensions",
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
    });
}

// Call sendViewportDimensions when the DOM is fully loaded
if (document.readyState === "complete" || document.readyState === "interactive") {
    // DOM is already ready to go
    sendViewportDimensions();
} else {
    // Wait for the DOM to be ready
    document.addEventListener("DOMContentLoaded", sendViewportDimensions);
}


function createBoundingBox(location) {
    const box = document.createElement('div');
    box.style.zIndex = '10000';
    box.style.position = 'absolute';
    box.style.border = '2px solid red';
    box.style.top = location[0].y + 'px';
    box.style.left = location[0].x + 'px';
    box.style.width = (location[1].x - location[0].x) + 'px';
    box.style.height = (location[2].y - location[1].y) + 'px';
    document.body.appendChild(box);
    return box;
}

function removeOverlay() {
    console.log("Removing overlays if any");
    const overlayBox = document.getElementById('overlay-box');
    const boundingBox = document.getElementById('bounding-box');
    const domBoundingBox = document.getElementById('dom-bounding-box');

    if (overlayBox) {
        overlayBox.remove();
    }
    if (boundingBox) {
        boundingBox.remove();
    }
    if (domBoundingBox) {
        domBoundingBox.remove();
    }
}


function displayTutorialStep(step) {
    console.log("Displaying step:", step.step_count, step);
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'overlay-box';
    overlay.style.position = 'absolute'; // Changed to absolute for document-relative positioning
    overlay.style.backgroundColor = 'white';
    overlay.style.padding = '20px';
    overlay.style.border = '1px solid black';
    overlay.style.zIndex = '1000000'; // High z-index to ensure visibility
    overlay.innerHTML = `
        <p>${step.step}</p>
        <button id='continueButton' class='custom-button'>Continue</button>
    `;

    // Append overlay to document to calculate dimensions
    document.body.appendChild(overlay);

    let boundingBox;
    if (step.useFallback && step.location && step.location.length > 0) {
        // Use coordinate-based bounding box for fallback
        boundingBox = createBoundingBox(step.location);
        boundingBox.id = 'bounding-box';
    } else if (!step.useFallback && tryFindAndHighlightElement(step)) {
        // Use DOM bounding box if not using fallback
        let xpath = `//*[text()='${step["web_element"]}']`;
        let results = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        let element = results.iterateNext();
        if (element) {
            boundingBox = createDOMBoundingBox(element);
            boundingBox.id = 'dom-bounding-box';
        }
    }

    // Calculate overlay position based on bounding box and viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const overlayRect = overlay.getBoundingClientRect();
    let overlayX, overlayY;

    if (boundingBox) {
        const boxRect = boundingBox.getBoundingClientRect();

        // Check if there's enough space below the bounding box
        if (boxRect.bottom + overlayRect.height <= viewportHeight) {
            overlayY = boxRect.bottom + window.scrollY; // Position below bounding box
        } else if (boxRect.top - overlayRect.height >= 0) {
            overlayY = boxRect.top - overlayRect.height + window.scrollY; // Position above bounding box
        } else {
            overlayY = window.scrollY + 20; // Default to 20px from the top
        }

        // Position overlay horizontally within the viewport
        overlayX = Math.min(boxRect.left, viewportWidth - overlayRect.width) + window.scrollX;
    } else {
        // Center overlay if no bounding box
        overlayX = viewportWidth / 2 - overlayRect.width / 2 + window.scrollX;
        overlayY = viewportHeight / 2 - overlayRect.height / 2 + window.scrollY;
    }

    // Apply calculated positions to the overlay
    overlay.style.left = `${overlayX}px`;
    overlay.style.top = `${overlayY}px`;

    // Add styles for the custom button
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .custom-button {
            padding: 10px 20px;
            margin-top: 20px;
            background-color: #007bff; /* Bootstrap primary button color */
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            outline: none;
            transition: background-color 0.3s ease;
        }
        .custom-button:hover, .custom-button:focus {
            background-color: #0056b3; /* Darker blue on hover/focus */
        }
    `;
    document.head.appendChild(styleSheet);

    // Set up event listener for the 'Continue' button
    const continueButton = document.getElementById('continueButton');
    continueButton.removeEventListener('click', continueButtonClickHandler(step.step_count));
    continueButton.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent bubbling up
        continueButtonClickHandler(step.step_count)();
    });
}


// Assuming continueButtonClickHandler is defined as before, with any necessary modifications
function continueButtonClickHandler(stepCount) {
    return function() {
        console.log("Continue button clicked for step:", stepCount);
        removeOverlay();
        chrome.runtime.sendMessage({ action: "stepCompleted" });
    };
}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.action === "displayStep") {
        displayTutorialStep(request.step);
    } else if(request.action === "endTutorial") {
        removeOverlay();
    } else if(request.action === "findElementInDOM") {
        const found = tryFindAndHighlightElement(request.step);
        sendResponse({ found: found });
    }
    // ... other conditions ...
});




function createDOMBoundingBox(element) {
    const boundingBox = document.createElement('div');
    boundingBox.id = 'dom-bounding-box';
    boundingBox.style.position = 'absolute';
    boundingBox.style.border = '2px solid red';
    boundingBox.style.zIndex = '1000000';

    const rect = element.getBoundingClientRect();
    boundingBox.style.width = `${rect.width}px`;
    boundingBox.style.height = `${rect.height}px`;
    boundingBox.style.top = `${rect.top + window.scrollY}px`;
    boundingBox.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(boundingBox);
    return boundingBox
}



function tryFindAndHighlightElement(step) {
    let xpath = `//*[text()='${step["web_element"]}']`;
    let results = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
    let element = results.iterateNext();
  
    if (element) {
        createDOMBoundingBox(element);
        return true;
    }
    return false;
}


// Function to continue tutorial from saved state
function continueSavedTutorial() {
    chrome.storage.local.get(['tutorialSteps', 'currentStepIndex'], function(data) {
        if (data.tutorialSteps && data.currentStepIndex != null) {
            tutorialSteps = data.tutorialSteps;
            currentStepIndex = data.currentStepIndex;

            if (currentStepIndex < tutorialSteps.length) {
                displayTutorialStep(tutorialSteps[currentStepIndex]);
            } else {
                // Tutorial has ended, possibly hide the overlay or clean up
                removeOverlay(); // Make sure you have a function to remove the overlay
            }
        }
    });
}


// Call this function when the content script is loaded
continueSavedTutorial();







