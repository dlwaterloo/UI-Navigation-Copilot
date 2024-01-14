from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from scraping import find_relevant_website, extract_page_content, process_content_with_langchain
from vision import extract_text_from_image, update_step_data_with_matched_locations
from dotenv import load_dotenv
import os
import json
import time
import shutil

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse({"detail": exc.errors()}, status_code=422)

# Configure CORS
origins = [
    "http://localhost:3000",  # React app (if running on localhost:3000)
    "http://localhost:8000",  # FastAPI server itself
    "chrome-extension://dolgpgkibdigfpjfflmcgcjgjnbfmgco",  # Your Chrome Extension ID
    # Add other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.post('/find_website')
async def find_website(data: dict):
    action = data['action']
    software = data['software']
    
    relevant_link = find_relevant_website(action, software)  # Make sure find_relevant_website is an async function
    if relevant_link:
        return {"url": relevant_link}
    else:
        raise HTTPException(status_code=404, detail="No relevant link found")

@app.post('/extract_content')
async def extract_content(data: dict):
    url = data['url']
    
    page_content = await extract_page_content(url)  # This function is already async
    if page_content:
        processed_info = process_content_with_langchain(page_content, url)  # If process_content_with_langchain is not async, don't use await
        return processed_info
    else:
        raise HTTPException(status_code=500, detail="Failed to extract content")

@app.post("/process_image")
async def process_image(image: UploadFile = File(...), step_data: str = Form(...), viewport_width: int = Form(...), viewport_height: int = Form()):
    unique_identifier = int(time.time() * 1000)
    image_path = f'temp_image_{unique_identifier}.png'

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    try:
        step_data_json = json.loads(step_data)
        print("Viewport dimensions received:", viewport_width, viewport_height)
        print("step_data:", step_data_json)

        if 'web_element' in step_data_json:
            ocr_results = extract_text_from_image(image_path)
            updated_step_data = update_step_data_with_matched_locations(
                [step_data_json], 
                image_path, 
                ocr_results, 
                viewport_width, 
                viewport_height
            )
            print("updated_step_data:", updated_step_data[0])
            return updated_step_data[0]
        else:
            raise HTTPException(status_code=400, detail="Invalid step data")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"JSON parsing error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
