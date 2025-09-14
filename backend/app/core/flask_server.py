from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
import time
import importlib.util
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from cerebras_roadmap_generator import analyze_diagnostic_answer, update_node_weights

app = Flask(__name__)
CORS(app)  # Allow React to call this API

# Store drawing commands in memory for real-time updates
drawing_commands = []

@app.route('/api/draw-line', methods=['POST'])
def draw_line():
    """API endpoint to draw a line in tldraw"""
    data = request.json
    
    # Extract points from request
    symbols = data.get('symbols')  # [x, y]
    
    # Create tldraw line shape
    command = {
        'type': 'create_shape',
        'symbols': symbols
    }
    
    # Add command to queue
    drawing_commands.append(command)
        
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

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Get the current node data with weights"""
    try:
        json_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                                     'node_outputs/final_consolidated_nodes_basic_calculus.json')
        
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify(data)
    except Exception as e:
        print(f"❌ Error loading nodes: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/diagnostic/analyze', methods=['POST'])
def analyze_diagnostic_response():
    """Analyze diagnostic test response and update node weights"""
    try:
        data = request.json
        question = data.get("question", "")
        answer = data.get("answer", False)
        json_file_path = data.get("json_file_path", "node_outputs/final_consolidated_nodes_basic_calculus.json")
        
        # Convert relative path to absolute path from backend directory
        if not os.path.isabs(json_file_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            json_file_path = os.path.join(backend_dir, json_file_path)
        
        # Load current node data to get names
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        node_names = {node_id: node_info["name"] for node_id, node_info in data[0].items()}
        
        # Analyze the diagnostic answer
        print(f"🔍 Starting diagnostic analysis...")
        print(f"📝 Question: {question}")
        print(f"✅ Answer: {'Yes' if answer else 'No'}")
        print(f"🎯 Available nodes: {list(node_names.keys())}")
        
        weight_adjustments = analyze_diagnostic_answer(question, answer, node_names)
        
        print(f"📊 Weight adjustments received: {weight_adjustments}")
        
        # Update the JSON file with new weights
        success = update_node_weights(json_file_path, weight_adjustments)
        
        if success:
            # Return updated node data
            with open(json_file_path, 'r', encoding='utf-8') as f:
                updated_data = json.load(f)
            
            return jsonify({
                "success": True,
                "weight_adjustments": weight_adjustments,
                "updated_nodes": updated_data[0]
            })
        else:
            return jsonify({"success": False, "error": "Failed to update weights"})
            
    except Exception as e:
        print(f"❌ Error in diagnostic analysis: {e}")
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    print("🚀 Starting Flask tldraw server...")
    print("📍 API available at: http://localhost:5000")
    print("📏 Draw line: POST /api/draw-line")
    print("📋 Get commands: GET /api/commands")
    print("🧹 Clear: POST /api/clear")
    app.run(debug=True, port=5000)
