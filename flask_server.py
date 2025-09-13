from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
import time
import importlib.util

app = Flask(__name__)
CORS(app)  # Allow React to call this API

# Store drawing commands in memory for real-time updates
drawing_commands = []

@app.route('/api/draw-line', methods=['POST'])
def draw_line():
    """API endpoint to draw a line in tldraw"""
    data = request.json
    
    # Extract points from request
    point1 = data.get('point1')  # [x, y]
    point2 = data.get('point2')  # [x, y]
    color = data.get('color', '#000000')
    width = data.get('width', 2)
    
    if not point1 or not point2:
        return jsonify({'error': 'Missing point1 or point2'}), 400
    
    # Create tldraw line shape
    line_id = str(uuid.uuid4())
    command = {
        'type': 'create_shape',
        'start': {'x': point1[0], 'y': point1[1]},
        'end': {'x': point2[0], 'y': point2[1]},
        'color': color,
        'timestamp': time.time()
    }
    
    # Add command to queue
    drawing_commands.append(command)
    
    print(f"📏 Drawing line: {point1} → {point2}")
    
    return jsonify({'status': 'success', 'command': command})

@app.route('/api/commands', methods=['GET'])
def get_commands():
    """Get all pending drawing commands"""
    return jsonify(drawing_commands)

@app.route('/api/commands', methods=['DELETE'])
def clear_commands():
    """Clear processed commands"""
    global drawing_commands
    drawing_commands = []
    return jsonify({'status': 'cleared'})

@app.route('/api/clear', methods=['POST'])
def clear_canvas():
    """Clear all drawings"""
    global drawing_commands
    command = {
        'type': 'clear_all',
        'timestamp': time.time()
    }
    drawing_commands.append(command)
    print("🧹 Clearing canvas")
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    print("🚀 Starting Flask tldraw server...")
    print("📍 API available at: http://localhost:5000")
    print("📏 Draw line: POST /api/draw-line")
    print("📋 Get commands: GET /api/commands")
    print("🧹 Clear: POST /api/clear")
    app.run(debug=True, port=5000)
