document.getElementById('generateTutorialButton').addEventListener('click', function() {
    const action = document.getElementById('actionInput').value;
    const software = document.getElementById('softwareInput').value;
    const spinner = document.getElementById('spinner');
    const resultsDiv = document.getElementById('results'); // Get the results div to display title and reason
    const statusText = document.getElementById('statusText'); // Get the status text element

    if (action && software) {
        spinner.style.display = 'inline-block';
        statusText.textContent = 'Finding UserDoc...';
        fetch('http://localhost:8000/find_website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, software })
        })
        .then(response => response.json())
        .then(data => {
            spinner.style.display = 'none';
            statusText.textContent = '';
            if (data.url) {
                // Assuming the response includes 'url', 'title', and 'reason'
                resultsDiv.innerHTML = `
                <div style="margin-top: 10px;"><strong>Title:</strong> <a href="${data.url}" target="_blank" style="display: inline-block; margin-bottom: 10px;"> ${data.title}</a></div>`;

                // display reason: <div><strong>Reason:</strong> ${data.reason}</div>
                // The link to the tutorial is provided for direct access. It opens in a new tab.
                
                fetchTutorial(data.url); // Proceed to fetch the tutorial content
            } else {
                resultsDiv.textContent = 'No URL found.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            spinner.style.display = 'none';
            statusText.textContent = '';
            resultsDiv.textContent = 'An error occurred.';
        });
    } else {
        resultsDiv.textContent = 'Please enter both action and software.';
    }
});

function fetchTutorial(url) {
    const spinner = document.getElementById('spinner');
    const statusText = document.getElementById('statusText');
    const tutorialReadyButton = document.getElementById('tutorialReadyButton');
    const resultsDiv = document.getElementById('results');

    spinner.style.display = 'inline-block';
    statusText.textContent = 'Processing User Doc...'; // Set status text for processing content

    fetch('http://localhost:8000/extract_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    })
    .then(response => response.json())
    .then(tutorial => {
        spinner.style.display = 'none';
        statusText.textContent = ''; // Clear status text when done
        tutorialSteps = tutorial.steps;
        currentStepIndex = 0;
        tutorialReadyButton.style.display = 'block'; // Show "Tutorial Ready" button
        console.log("Tutorial Instruction:", tutorial);
        // Optionally, display tutorial steps or a summary in resultsDiv if needed
        // resultsDiv.innerHTML = `<strong>Tutorial Ready:</strong> Check out the steps!`;
    })
    .catch(error => {
        console.error('Error:', error);
        spinner.style.display = 'none';
        statusText.textContent = ''; // Clear status text on error
        resultsDiv.textContent = 'An error occurred while generating the tutorial.';
    });
}

document.getElementById('tutorialReadyButton').addEventListener('click', function() {
    chrome.runtime.sendMessage({
        action: "initiateTutorial",
        steps: tutorialSteps
    });
});


function injectContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js']
        });
    });
}
