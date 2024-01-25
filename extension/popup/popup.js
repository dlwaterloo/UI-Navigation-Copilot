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
