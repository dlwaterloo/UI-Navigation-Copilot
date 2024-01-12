import os
import re
import json
import requests
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from serpapi import GoogleSearch
from langchain_community.llms import OpenAI
from langchain_community.chat_models import ChatOpenAI
from langchain.chains.openai_functions import create_structured_output_runnable
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate


def initialize_openai():
    return ChatOpenAI(model="gpt-4", temperature=0.4)


def find_relevant_website(action, software):
    serpapi_key = os.getenv("SERPAPI_KEY")
    if not serpapi_key:
        raise EnvironmentError("API key for SerpAPI not found in environment variables")

    query = f"{action} on {software}?"
    search = GoogleSearch({"q": query, "api_key": serpapi_key, "num": 15})
    results = search.get_dict()

    all_links_list = [{'link': result['link'], 'title': result['title'], 'snippet': result.get('snippet', '')}
                      for result in results.get("organic_results", [])]

    llm = initialize_openai()

    system_message_template = SystemMessagePromptTemplate.from_template(
        """
        You are a smart assistant. Analyze these search results dictionary and determine the most relevant website url based on the user's query.
        Respond in the following JSON format:
        ```
        {{"most_relevant_link": "link_here", "reason": "explanation_here"}}
        ```
        Everything between the ``` must be valid JSON.
        """
    )

    human_message_template = HumanMessagePromptTemplate.from_template(
        "The user query is '{query}'. Here are the search results: {links_list}."
    )

    prompt_template = ChatPromptTemplate.from_messages([system_message_template, human_message_template])

    kwargs = {"query": query, "links_list": json.dumps(all_links_list)}
    prompt = prompt_template.format_messages(**kwargs)
    response = llm.invoke(prompt)

    response_content = response.content.strip('`')
    response_data = json.loads(response_content)
    return response_data.get("most_relevant_link")


# Remove redundant or irrelevant sections from text
def remove_redundant_or_irrelevant_sections(text):
    # Example: Remove repeated titles, often found at the start of the text
    text = re.sub(r'^(.*)(\r?\n\1)+', r'\1', text, flags=re.MULTILINE)

    # Example: Remove sections that are non-relevant
    irrelevant_section_start = "Javascript is disabled"
    irrelevant_section_end = "Please refer to your browser's Help pages for instructions."
    text = re.sub(irrelevant_section_start + '.*?' + irrelevant_section_end, '', text, flags=re.DOTALL)

    return text

# Extract page content from a URL
def extract_page_content(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    html_content = response.text
    soup = BeautifulSoup(html_content, 'html.parser')

    for script_or_style in soup(["script", "style"]):
        script_or_style.extract()

    for a_tag in soup.find_all('a', href=True):
        href = urljoin(url, a_tag['href'])
        text = a_tag.get_text() or href
        a_tag.replace_with(f"\nLink: [{text}]({href})\n")

    for bold_tag in soup.find_all(['b', 'strong']):
        bold_text = bold_tag.get_text()
        bold_tag.replace_with(f"**{bold_text}**")

    text = soup.get_text()
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    formatted_text = '\n'.join(chunk for chunk in chunks if chunk)

    return remove_redundant_or_irrelevant_sections(formatted_text)


def GPT4_extraction():
    return ChatOpenAI(model="gpt-4", temperature=0)


def process_content_with_langchain(page_content, user_query):
    llm = GPT4_extraction()

    system_message_template = SystemMessagePromptTemplate.from_template(
        """
        You are a smart assistant. Analyze the given webpage content and extract the tutorial title and exact step-by-step instructions relevant to the user's query, including actions and exact web elements where applicable. 
        Note: **text** is a bolden text, meaning that if the bolden text is in a step, it's very likely to be the exact web element name.
        And if certain step instruction that doesn't involve user to act on web element or the web element is possibly not findable on the user interface, then just have "" for "action" and "web_element".
        Respond in the following JSON format:
        ```{{"tutorial_title": "title_here",
            "steps": [
                {{"step_count": "1", "step": "description_of_step_1", "action": "action_1", "web_element": "findable_web_element_1"}},
                {{"step_count": "2", "step": "description_of_step_2", "action": "action_2", "web_element": "findable_web_element_2"}},
                // Add more steps as needed, or just "" for "action" and "web_element" if no specific action or web element is involved
            ]}}```
        Everything between the ``` must be valid JSON.
        If you don't think this webpage is meant to be an instruction or tutorial, please return an empty string.
        """
        )

    human_message_template = HumanMessagePromptTemplate.from_template(
        f"The user query is '{user_query}'. Analyze the following webpage content and extract the relevant step-by-step instruction: '{page_content}'. If you think that the user query doesn't match with the tutorial title and content of the steps, then please return an empty string."
    )

    prompt_template = ChatPromptTemplate.from_messages([system_message_template, human_message_template])

    kwargs = {"page_content": page_content, "user_query": user_query}
    prompt = prompt_template.format_messages(**kwargs)
    response = llm.invoke(prompt)

    response_content = response.content.strip('`')
    return json.loads(response_content)