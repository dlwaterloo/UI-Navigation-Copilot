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

    if (overlayBox) {
        overlayBox.remove();
    }
    if (boundingBox) {
        boundingBox.remove();
    }
}

// Event listener handler for 'Continue' button
function continueButtonClickHandler(stepCount) {
    return function() {
        console.log("Continue button clicked for step:", stepCount);
        removeOverlay();
        chrome.runtime.sendMessage({ action: "stepCompleted" });
    };
}


function displayTutorialStep(step) {
    console.log("Displaying step:", step.step_count, step);
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
    overlay.style.zIndex = '1000000'; // Ensure this is high enough to be on top of other elements
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
    const continueButton = document.getElementById('continueButton');
    
    // Make sure to remove the event listener if it was previously added
    continueButton.removeEventListener('click', continueButtonClickHandler(step.step_count));
    
    // Add the event listener with stopPropagation call
    continueButton.addEventListener('click', function(event) {
        event.stopPropagation(); // This will prevent the event from bubbling up to parent elements
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





