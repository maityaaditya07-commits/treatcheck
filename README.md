# TreatCheck backend

`lambda/handler.py` is the Python AWS Lambda handler for wrapper OCR. It calls Amazon Textract `DetectDocumentText` and compares recognized text with the selected allergen terms. Expose it through API Gateway as POST `/scan`.

For local backend checks, create a Python virtual environment, install `requirements.txt`, then run `python3 -m unittest discover -s tests`. In AWS, grant the Lambda execution role only `textract:DetectDocumentText`; do not use access keys in the app.
