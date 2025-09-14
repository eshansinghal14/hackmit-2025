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

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from research import search_and_get_content
from llm_formatter import create_multi_agent_contexts
from cerebras_roadmap_generator import run_multi_agent_cerebras, run_final_consolidation_agent

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
                                     'node_outputs/final_consolidated_roadmap.json')
        
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
        json_file_path = data.get("json_file_path", "node_outputs/final_consolidated_roadmap.json")
        
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
@app.route('/api/generate-roadmap', methods=['POST'])
def generate_roadmap():
    """Generate a complete learning roadmap using Cerebras multi-agent system"""
    try:
        data = request.json
        topic = data.get('topic', '').strip()
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        print(f"🚀 Starting roadmap generation for: {topic}")
        
        # Change to backend directory where agent files are located
        original_cwd = os.getcwd()
        backend_dir = os.path.join(os.path.dirname(__file__), '..', '..')
        os.chdir(backend_dir)
        
        try:
            # Step 1: Research with Exa API
            print("🔍 Step 1: Researching topic with Exa...")
            research_results = search_and_get_content(topic, num_results=8)
            
            if not research_results or research_results.get('error'):
                return jsonify({'error': 'Research failed', 'details': research_results.get('error', 'Unknown error')}), 500
            
            # Step 2: Create multi-agent contexts
            print("📄 Step 2: Creating agent contexts...")
            context_result = create_multi_agent_contexts(research_results, topic)
            
            if not context_result:
                return jsonify({'error': 'Failed to create agent contexts'}), 500
            
            # Step 3: Run multi-agent Cerebras processing
            print("🧠 Step 3: Running multi-agent analysis...")
            roadmap_result = run_multi_agent_cerebras()
            
            if not roadmap_result:
                return jsonify({'error': 'Multi-agent processing failed'}), 500
            
            # Step 4: Final consolidation
            print("🎯 Step 4: Final consolidation...")
            final_result = run_final_consolidation_agent(roadmap_result[2], topic.replace(' ', '_'))
            
            if not final_result:
                return jsonify({'error': 'Final consolidation failed'}), 500
            
            final_output, final_file = final_result
            
            # Parse the JSON output
            try:
                clean_output = final_output.strip()
                if clean_output.startswith('```json'):
                    clean_output = clean_output.replace('```json', '').replace('```', '').strip()
                
                roadmap_json = json.loads(clean_output)
                
                print(f"✅ Roadmap generation completed for: {topic}")
                
                return jsonify({
                    'status': 'success',
                    'topic': topic,
                    'roadmap': roadmap_json,
                    'file_path': final_file
                })
                
            except json.JSONDecodeError as e:
                return jsonify({'error': 'Invalid JSON output', 'details': str(e)}), 500
                
        finally:
            # Always restore original directory
            os.chdir(original_cwd)
            
    except Exception as e:
        print(f"❌ Error generating roadmap: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Flask tldraw server...")
    print("📍 API available at: http://localhost:5001")
    print("📏 Draw line: POST /api/draw-line")
    print("📋 Get commands: GET /api/commands")
    print("🧹 Clear: POST /api/clear")
    print("🎯 Generate roadmap: POST /api/generate-roadmap")
    app.run(debug=True, port=5001)
