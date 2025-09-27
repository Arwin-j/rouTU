import os
import mimetypes
from google import genai
from google.genai import types


def parse_schedule_with_gemini(file_path=None, input_text=None, input_type="text"):
    # Initialize Gemini client
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    model = "gemini-2.5-flash-image-preview"

    # Prepare Gemini parts
    parts = []

    if input_type == "text" and input_text:
        parts.append(types.Part.from_text(
            f"""The following text contains a class schedule. Extract each class's location and time.
Return a list of dictionaries with keys 'location' and 'time'. Only output the JSON, nothing else.

INPUT:
{input_text}
"""))
    elif input_type in ["image", "audio"] and file_path:
        mime_type, _ = mimetypes.guess_type(file_path)
        with open(file_path, "rb") as f:
            file_data = f.read()

        parts.append(types.Part.from_data(
            mime_type=mime_type,
            data=file_data
        ))

        parts.append(types.Part.from_text(
            "This is a class schedule provided via {0}. Extract each class's location and time. "
            "Return a list of dictionaries with keys 'location' and 'time'. Only output the JSON.".format(input_type)
        ))
    else:
        raise ValueError("Invalid input or file path")

    # Send request to Gemini
    contents = [types.Content(role="user", parts=parts)]

    generate_config = types.GenerateContentConfig(response_modalities=["TEXT"])

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=generate_config,
    )

    # Extract and parse response text
    response_text = response.candidates[0].content.parts[0].text
    print("Gemini Response:\n", response_text)

    # Try to safely parse JSON result
    import json
    try:
        parsed = json.loads(response_text)
        locations = [cls["location"] for cls in parsed]
        times = [cls["time"] for cls in parsed]
        return locations, times
    except Exception as e:
        print("Failed to parse Gemini output:", e)
        return [], []

