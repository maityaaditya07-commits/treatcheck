import json
import base64
import boto3

# Explicit allergen dictionary and common variations
ALLERGEN_MAP = {
    "Peanuts": ["peanut", "arachis", "groundnut"],
    "Tree Nuts": ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "tree nut"],
    "Milk": ["milk", "whey", "casein", "lactose", "curd"],
    "Eggs": ["egg", "albumin", "lecithin"],
    "Soy": ["soy", "soya", "lecithin"],
    "Wheat": ["wheat", "gluten", "spelt", "kamut"],
    "Fish": ["fish", "cod", "salmon", "tuna", "haddock"],
    "Shellfish": ["shrimp", "prawn", "crab", "lobster", "mussel", "clam", "scallop", "shellfish"],
    "Sesame": ["sesame", "tahini", "benne"]
}

textract = boto3.client('textract')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        image_b64 = body.get('image', '').split(',')[1] if ',' in body.get('image', '') else body.get('image', '')
        selected_allergens = body.get('allergens', [])

        if not image_b64:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No image provided'})
            }

        # Call Textract
        response = textract.detect_document_text(
            Document={'Bytes': base64.b64decode(image_b64)}
        )

        # Combine all detected lines into one text string
        lines = [block['Text'] for block in response['Blocks'] if block['BlockType'] == 'LINE']
        full_text = " ".join(lines)

        if not full_text.strip():
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'CHECK_MANUALLY',
                    'text': '[No readable text detected]',
                    'matches': []
                })
            }

        # Check for matches
        matches = []
        text_lower = full_text.lower()

        for allergen in selected_allergens:
            variations = ALLERGEN_MAP.get(allergen, [allergen.lower()])
            if any(var in text_lower for var in variations):
                matches.append(allergen)

        # Determine status
        if matches:
            status = 'MATCH_FOUND'
        elif not full_text.strip():
            status = 'CHECK_MANUALLY'
        else:
            # If text was found but no allergens matched, it's "no match found in readable text"
            # However, if the text is too short (e.g. just one word), it might be an incomplete label
            if len(full_text.split()) < 3:
                status = 'CHECK_MANUALLY'
            else:
                status = 'NO_MATCH_FOUND_IN_READABLE_TEXT'

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'status': status,
                'text': full_text,
                'matches': matches
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error during scan'})
        }
