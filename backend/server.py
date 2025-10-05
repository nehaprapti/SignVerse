from flask import Flask, request, jsonify
import os
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

ANIMATION_DIR = r"E:\SignVerse\backend\animations"

@app.route('/text-to-sign', methods=['POST'])
def text_to_sign():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON or no body provided'}), 400
    text = data.get('text', '').strip().lower()
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    filename = f"{text}_animation.json"
    filepath = os.path.join(ANIMATION_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': f'No animation found for "{text}"'}), 404

    with open(filepath, 'r', encoding='utf-8') as f:
        animation_data = json.load(f)
    return jsonify({'animation': animation_data})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
