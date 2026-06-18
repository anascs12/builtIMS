from flask import Flask, request, jsonify
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch
import re

app = Flask(__name__)

MODEL_PATH = r'E:\BuildIMS\challenge_model\challenge_model'

print("Loading model...")
tokenizer = GPT2Tokenizer.from_pretrained(MODEL_PATH)
model     = GPT2LMHeadModel.from_pretrained(MODEL_PATH)
model.eval()
print("Model loaded!")

def parse_challenge(text):
    try:
        title_match = re.search(r'TITLE:\s*(.+)', text)
        desc_match  = re.search(r'DESCRIPTION\s*:?\s*([\s\S]+?)(?:<\|endchallenge\|>|$)', text)
        title       = title_match.group(1).strip() if title_match else None
        description = desc_match.group(1).strip() if desc_match else None
        if description:
            description = re.sub(r'<\|.*?\|>', '', description).strip()
        if not title or not description or len(title) < 5:
            return None
        return { 'title': title, 'description': description[:800] }
    except:
        return None

@app.route('/generate', methods=['POST'])
def generate():
    data     = request.json or {}
    day_type = data.get('dayType', 'code')
    level    = data.get('level', 'intermediate')
    prompt   = '<|challenge|>\nTITLE:'

    inputs = tokenizer.encode(prompt, return_tensors='pt')

    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_new_tokens=200,
            temperature=0.85,
            top_p=0.92,
            top_k=50,
            do_sample=True,
            pad_token_id=tokenizer.pad_token_id,
            repetition_penalty=1.2,
        )

    text   = tokenizer.decode(outputs[0], skip_special_tokens=False)
    parsed = parse_challenge(text)

    if not parsed:
        return jsonify({ 'error': 'Could not parse challenge' }), 500

    return jsonify({ **parsed, 'dayType': day_type, 'level': level })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'ok' })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False)