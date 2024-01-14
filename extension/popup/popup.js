let currentStepIndex = 0;
let tutorialSteps = [];
let viewportWidth = 0;
let viewportHeight = 0;

document.getElementById('generateTutorialButton').addEventListener('click', function() {
    const action = document.getElementById('actionInput').value;
    const software = document.getElementById('softwareInput').value;
    const spinner = document.getElementById('spinner');

    if (action && software) {
        spinner.style.display = 'block';
        fetch('http://localhost:8000/find_website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, software })
        })
        .then(response => response.json())
        .then(data => {
            if (data.url) {
                fetchTutorial(data.url);
            } else {
                spinner.style.display = 'none';
                document.getElementById('results').textContent = 'No URL found.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            spinner.style.display = 'none';
            document.getElementById('results').textContent = 'An error occurred.';
        });
    } else {
        document.getElementById('results').textContent = 'Please enter both action and software.';
    }
});

function fetchTutorial(url) {
    fetch('http://localhost:8000/extract_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    })
    .then(response => response.json())
    .then(tutorial => {
        document.getElementById('spinner').style.display = 'none';
        tutorialSteps = tutorial.steps;
        currentStepIndex = 0;
        document.getElementById('tutorialReadyButton').style.display = 'block';
        console.log("Tutorial Instruction:", tutorial);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('results').textContent = 'An error occurred while generating the tutorial.';
    });
}

function processStep(step) {
    return new Promise((resolve) => {
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
                        chrome.runtime.onMessage.addListener(function stepDisplayedListener(request) {
                            if (request.action === "stepCompleted") {
                                chrome.runtime.onMessage.removeListener(stepDisplayedListener);
                                resolve();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        });
    });
}

document.getElementById('tutorialReadyButton').addEventListener('click', async function() {
    injectContentScript();
    for (let step of tutorialSteps) {
        await processStep(step);
    }
    console.log("Tutorial completed.");
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "viewportDimensions") {
        viewportWidth = request.width;
        viewportHeight = request.height;
    } else if (request.action === "stepCompleted") {
        // onStepCompleted(); // Not needed anymore since we handle it in processStep
    }
});

function injectContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js']
        });
    });
}
