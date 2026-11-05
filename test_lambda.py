import sys
import os
import unittest
from unittest.mock import MagicMock

# Mock boto3 before importing handler
mock_boto3 = MagicMock()
sys.modules['boto3'] = mock_boto3

# Add lambda dir to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda'))
import handler
import json

class TestLambdaHandler(unittest.TestCase):
    def setUp(self):
        self.mock_textract = MagicMock()
        handler.textract = self.mock_textract

    def test_missing_image(self):
        event = {'body': json.dumps({'image': '', 'allergens': ['Peanuts']})}
        res = handler.lambda_handler(event, None)
        self.assertEqual(res['statusCode'], 400)

    def test_match_found(self):
        # Mock Textract returning Peanut ingredients
        self.mock_textract.detect_document_text.return_value = {
            'Blocks': [
                {'BlockType': 'LINE', 'Text': 'Ingredients: Milk Chocolate, Peanuts, Sugar, Salt'}
            ]
        }
        event = {
            'body': json.dumps({
                'image': 'data:image/png;base64,aGVsbG8=',
                'allergens': ['Peanuts', 'Soy']
            })
        }
        res = handler.lambda_handler(event, None)
        self.assertEqual(res['statusCode'], 200)
        data = json.loads(res['body'])
        self.assertEqual(data['status'], 'MATCH_FOUND')
        self.assertIn('Peanuts', data['matches'])

    def test_no_match_found(self):
        self.mock_textract.detect_document_text.return_value = {
            'Blocks': [
                {'BlockType': 'LINE', 'Text': 'Ingredients: Sugar, Corn Syrup, Tapioca Dextrin, Artificial Flavors'}
            ]
        }
        event = {
            'body': json.dumps({
                'image': 'data:image/png;base64,aGVsbG8=',
                'allergens': ['Peanuts', 'Milk']
            })
        }
        res = handler.lambda_handler(event, None)
        self.assertEqual(res['statusCode'], 200)
        data = json.loads(res['body'])
        self.assertEqual(data['status'], 'NO_MATCH_FOUND_IN_READABLE_TEXT')
        self.assertEqual(data['matches'], [])

    def test_unreadable_text(self):
        self.mock_textract.detect_document_text.return_value = {
            'Blocks': []
        }
        event = {
            'body': json.dumps({
                'image': 'data:image/png;base64,aGVsbG8=',
                'allergens': ['Peanuts']
            })
        }
        res = handler.lambda_handler(event, None)
        self.assertEqual(res['statusCode'], 200)
        data = json.loads(res['body'])
        self.assertEqual(data['status'], 'CHECK_MANUALLY')

if __name__ == '__main__':
    unittest.main()
