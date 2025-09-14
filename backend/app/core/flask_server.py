from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
import time
import importlib.util
import sys

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
