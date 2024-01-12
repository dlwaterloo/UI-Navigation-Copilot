from flask import Flask, request, jsonify
from dotenv import load_dotenv
from scraping import find_relevant_website, extract_page_content, process_content_with_langchain
from vision import extract_text_from_image, update_step_data_with_matched_locations
import os
import json
import time

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

@app.route('/find_website', methods=['POST'])
def find_website():
    data = request.json
    print("Received data:", data)
    action = data['action']
    software = data['software']
    
    relevant_link = find_relevant_website(action, software)
    if relevant_link:
        return jsonify({"url": relevant_link})
    else:
        return jsonify({"error": "No relevant link found"}), 404

@app.route('/extract_content', methods=['POST'])
def extract_content():
    data = request.json
    url = data['url']
    
    page_content = extract_page_content(url)
    if page_content:
        processed_info = process_content_with_langchain(page_content, url)
        return jsonify(processed_info)
    else:
        return jsonify({"error": "Failed to extract content"}), 500

@app.route('/process_image', methods=['POST'])
def process_image():
    image = request.files['image']
    # Generate a unique filename using a timestamp
    unique_identifier = int(time.time() * 1000)
    image_path = f'temp_image_{unique_identifier}.png' 
    image.save(image_path)

    try:
        step_data = json.loads(request.form.get('step_data', '{}'))
        viewport_width = int(request.form.get('viewport_width', '0'))
        viewport_height = int(request.form.get('viewport_height', '0'))

        print("Viewport dimensions received:", viewport_width, viewport_height)
        print("step_data:", step_data)
        
        if 'web_element' in step_data:
            ocr_results = extract_text_from_image(image_path)
            
            # Pass viewport dimensions to the function
            updated_step_data = update_step_data_with_matched_locations(
                [step_data], 
                image_path, 
                ocr_results, 
                viewport_width, 
                viewport_height
            )

            print("updated_step_data:", updated_step_data[0])
            return jsonify(updated_step_data[0])
        else:
            return jsonify({"error": "Invalid step data"}), 400

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Safely remove the file if it exists
        if os.path.exists(image_path):
            os.remove(image_path)


if __name__ == '__main__':
    app.run(debug=True)