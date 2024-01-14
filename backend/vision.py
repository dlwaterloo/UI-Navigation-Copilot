from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import os
import json
import re
import requests
import openai
import base64
from langchain_community.llms import OpenAI
from langchain_community.chat_models import ChatOpenAI


def extract_text_from_image(image_path):
    key = os.getenv("AZURE_FORM_RECOGNIZER_KEY")
    endpoint = os.getenv("AZURE_FORM_RECOGNIZER_ENDPOINT")
    credential = AzureKeyCredential(key)
    client = DocumentAnalysisClient(endpoint=endpoint, credential=credential)

    with open(image_path, "rb") as image_file:
        poller = client.begin_analyze_document("prebuilt-layout", image_file)
        result = poller.result()
    return result


def is_close_match(ocr_result, target):
    """
    Check if the ocr_result is within max_errors threshold of the target string.

    :param ocr_result: The string result from OCR.
    :param target: The target string to compare to.
    :param max_errors: The maximum number of errors allowed (default is 1).
    :return: True if the ocr_result is within max_errors of the target, False otherwise.
    """
    if len(ocr_result) != len(target):
        ocr_result_stripped = ocr_result.replace(" ", "")
        target_stripped = target.replace(" ", "")
        if (target in ocr_result or ocr_result in target) and (abs((len(ocr_result_stripped) - len(target_stripped)) / len(ocr_result_stripped)) <= 0.4 or 
                                     abs((len(ocr_result_stripped) - len(target_stripped)) / len(target_stripped)) <= 0.4):
            return True
        else:
            return False

    errors = sum(1 for o, t in zip(ocr_result, target) if o != t)
    return errors <= 1



def find_web_element_location(step_data, ocr_results):
    """
    Find the location of the web element in the OCR results.

    :param step_data: The step data extracted from the tutorial.
    :param ocr_results: The OCR results containing text and location data.
    :return: Updated step data with the location of the web element.
    """
    for step in step_data["steps"]:
        web_element = step["web_element"]

        if not web_element:
            step["location"] = ""
            continue

        found = False

        for page in ocr_results.pages:
            # Check at line level
            for line in page.lines:
                if is_close_match(line.content.lower(), web_element.lower()):
                    # Web element found in line, extract the polygon
                    step["location"] = [ {"x": point.x, "y": point.y} for point in line.polygon ]
                    found = True
                    break
            # Check at word level if not found in lines
            if not found:
                for word in page.words:
                    if is_close_match(word.content.lower(), web_element.lower()):
                        # Web element found in word, extract the polygon
                        step["location"] = [ {"x": point.x, "y": point.y} for point in word.polygon ]
                        found = True
                        break
            if found:
                break

        # If the web element is not found, set location to empty
        if not found:
            step["location"] = ""
    return step_data


def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def gpt4_vision_extract_match(image_path, query):
    api_key = os.environ.get("OPENAI_API_KEY")
    base64_image = encode_image(image_path)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": "gpt-4-vision-preview",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": query
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 200
    }

    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
    response_json = response.json()

    if 'error' in response_json:
        print("Error in response:", response_json['error'])  # Debugging

    choices = response_json.get('choices', [])
    if choices:
        for choice in choices:
            message = choice.get('message', {})
            if message.get('role') == 'assistant':
                content = message.get('content')
                if content:
                    return content.strip()
    return "No match found"

def update_step_data_with_matched_locations(step_data, image_path, ocr_results, viewport_width, viewport_height):
    # First, get the OCR result dimensions
    ocr_width = ocr_results.pages[0].width
    ocr_height = ocr_results.pages[0].height
    print("OCR dimensions:", ocr_width, ocr_height)

    # Then, calculate scale factors
    scale_width = viewport_width / ocr_width
    scale_height = viewport_height / ocr_height
    print("Scale factors:", scale_width, scale_height)

    updated_steps = []  # Initialize an empty list to hold the updated steps

    for step in step_data:
        this = step["web_element"]
        
        # Initialize scaled_location for each step
        scaled_location = []

        # Use OCR results to find the web element location
        location_data = find_web_element_location({"steps": [step]}, ocr_results)
        step["location"] = location_data["steps"][0]["location"]

        # Apply scaling to the location, regardless of how it was found
        if step["location"]:  # Check if location exists before scaling
            for point in step["location"]:
                scaled_location.append({
                    "x": point["x"] * scale_width,
                    "y": point["y"] * scale_height
                })
            print("Scaled location:", scaled_location)
            step["location"] = scaled_location
        else:
            # If the location is not found, use GPT-4 Vision to find the match
            query = f"Which element in the screenshot is likely to be '{this}'? Please only return the string of the web element name. If no element is likely to be '{this}', please return an empty string."
            matched_element = gpt4_vision_extract_match(image_path, query)
            print("Matched:", matched_element)

            # If a matched element is found, use the OCR results to find its location
            if matched_element != "No match found":
                location = find_web_element_location({"steps": [{"web_element": matched_element}]}, ocr_results)
                print("OCR location:", location)
                if location["steps"][0]["location"]:
                    for point in location["steps"][0]["location"]:
                        scaled_location.append({
                            "x": point["x"] * scale_width,
                            "y": point["y"] * scale_height
                        })
                    print("Scaled location for matched element:", scaled_location)
                    step["location"] = scaled_location

        updated_steps.append(step)  # Add the updated step to the list

    return updated_steps




""""

        if matched_element != "No match found":
            location = find_web_element_location({"steps": [{"web_element": matched_element}]}, ocr_results)
            if location["steps"][0]["location"]:
                scaled_location = []
                for point in location["steps"][0]["location"]:
                    scaled_location.append({
                        "x": point["x"],
                        "y": point["y"]

                    })
                print("Scaled location:", scaled_location)
                step["location"] = scaled_location

    return step_data
"""

"""
"x": point["x"] * scale_width,
"y": point["y"] * scale_height
"""