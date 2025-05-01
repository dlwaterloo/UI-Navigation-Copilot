# UI Navigation Copilot

A powerful Chrome extension that helps users navigate web interfaces by providing intelligent, step-by-step guidance using AI-powered visual and textual analysis.

## Features

- **Natural Language Search**: Find relevant tutorials and guides for any UI navigation task
- **Visual Element Recognition**: Automatically identifies UI elements on the screen using Azure Form Recognizer and GPT-4 Vision
- **Intelligent Step Matching**: Maps tutorial steps to actual UI elements in real-time
- **Cross-Platform Compatibility**: Works on any website thanks to the Chrome extension architecture
- **Dual Element Detection**: Uses both DOM-based and visual-based element detection for maximum accuracy
- **Smart Overlay Positioning**: Automatically positions instruction overlays to avoid UI obstruction
- **Persistent Tutorial State**: Maintains tutorial progress across page reloads

## Architecture

### Backend (`/backend`)

- **app.py**: FastAPI server handling main API endpoints for website search, content extraction, and image processing
- **scraping.py**: Implements web scraping and content processing using Playwright and LangChain
- **vision.py**: Handles visual element recognition using Azure Form Recognizer and GPT-4 Vision API
- **requirements.txt**: Python dependencies

### Extension (`/extension`)

#### Popup Interface (`/popup`)
- **popup.html**: Main extension popup interface with action input and software selection
- **popup.js**: Handles user input and communication with backend services
- **popup.css**: Styles for the popup interface

#### Content Scripts (`/content`)
- **content.js**: Injects into web pages to:
  - Create and manage tutorial overlays
  - Handle element highlighting and bounding boxes
  - Manage viewport dimensions
  - Support both DOM-based and coordinate-based element detection
  - Position overlays intelligently based on viewport and element locations

#### Background Service (`background.js`)
- Manages tutorial state and progression
- Handles communication between popup and content scripts
- Coordinates screenshot capture and image processing
- Maintains tutorial state persistence
- Handles tab updates and content script injection

#### Manifest (`manifest.json`)
- Chrome extension configuration
- Permission declarations
- Content script and background service worker registration

## Prerequisites

- Python 3.7+
- Chrome browser
- Azure Form Recognizer API key
- OpenAI API key
- SerpAPI key

## Environment Variables

Create a `.env` file in the `/backend` directory with:

```
AZURE_FORM_RECOGNIZER_KEY=your_key_here
AZURE_FORM_RECOGNIZER_ENDPOINT=your_endpoint_here
OPENAI_API_KEY=your_key_here
SERPAPI_KEY=your_key_here
```

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the FastAPI server:
```bash
python app.py
```

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` directory
4. The UI Navigation Copilot icon should appear in your Chrome toolbar

## Usage

1. Click the extension icon in Chrome
2. Enter your desired navigation task (e.g., "How to create a new repository on GitHub")
3. The extension will:
   - Find relevant tutorial content
   - Extract step-by-step instructions
   - Match UI elements on the current page
   - Guide you through each step with visual indicators

## Technical Implementation Details

### Frontend (Chrome Extension)

1. **Popup Interface**
   - Provides user input for action and software
   - Communicates with backend for tutorial generation
   - Manages tutorial state initialization

2. **Content Script**
   - Injects overlay UI for step-by-step guidance
   - Implements dual element detection strategy:
     - Primary: DOM-based element search using XPath
     - Fallback: Coordinate-based visual detection
   - Creates visual indicators (bounding boxes) around target elements
   - Manages overlay positioning based on viewport and element locations
   - Handles tutorial state persistence across page reloads

3. **Background Service**
   - Coordinates between popup and content scripts
   - Manages tutorial state and progression
   - Handles screenshot capture for visual element detection
   - Ensures content script injection on page loads
   - Maintains tutorial state persistence using Chrome storage

### Backend Services

1. **FastAPI Server**
   - Provides RESTful endpoints for tutorial generation and element detection
   - Handles asynchronous web scraping and content processing
   - Coordinates between multiple AI services

2. **Web Scraping and Processing**
   - Uses Playwright for reliable web content extraction
   - Implements LangChain for structured content processing
   - Extracts and formats tutorial steps with action/element mapping

3. **Visual Recognition**
   - Utilizes Azure Form Recognizer for OCR and layout analysis
   - Implements GPT-4 Vision API for advanced element matching
   - Provides coordinate-based element detection as fallback

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

