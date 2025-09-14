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

@app.route('/api/draw-circle', methods=['POST'])
def draw_circle():
    """API endpoint to draw a circle in tldraw"""
    data = request.json
    
    # Extract circle data from request
    center = data.get('center', {'x': 100, 'y': 100})
    radius = data.get('radius', 50)
    
    # Create tldraw circle shape command
    command = {
        'type': 'create_circle',
        'center': center,
        'radius': radius
    }
    
    # Add command to queue
    drawing_commands.append(command)
    print(f"⭕ Drawing circle at ({center['x']}, {center['y']}) with radius {radius}")
        
    return jsonify({'status': 'success', 'command': command})


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
        
        print(f"📁 Using JSON file path: {json_file_path}")
        print(f"📁 File exists: {os.path.exists(json_file_path)}")
        
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

@app.route('/api/process-annotations', methods=['POST'])
def process_annotations():
    """Process Claude annotations and execute them with topic context"""
    try:
        data = request.json
        topic = data.get('topic', 'Basic Calculus')
        
        print(f"🎯 Processing annotations for topic: {topic}")
        
        # Import the function here to avoid circular imports
        sys.path.append(os.path.dirname(__file__))
        from annotations import process_claude_annotations
        
        # Add topic context to the data
        data['topic_context'] = topic
        
        success = process_claude_annotations(data)
        
        return jsonify({
            'status': 'success' if success else 'partial_failure',
            'success': success,
            'topic': topic
        })
        
    except Exception as e:
        print(f"❌ Error processing annotations: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/process-tutoring-session', methods=['POST'])
def process_tutoring_session():
    """Process tutoring session with LLM - screenshot + speech -> adaptive response + annotations"""
    try:
        data = request.json
        
        # Extract session data
        speech_text = data.get('speech', '')
        screenshot_data = data.get('screenshot', '')
        topic = data.get('topic', 'General Learning')
        conversation_history = data.get('conversationHistory', [])
        current_question = data.get('currentQuestion', '')
        
        print(f"  Processing tutoring session for: {topic}")
        print(f"  User said: {speech_text}")
        
        # Use Claude API for dynamic responses instead of hardcoded ones
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            
            # Build conversation context
            system_prompt = f"""You are an interactive AI tutor teaching {topic}. 

CRITICAL: Respond with natural, conversational language that varies based on what the student says. Don't repeat the same responses.

VISUAL RULES:
- Use mostly circles and basic shapes for annotations 
- Minimize text annotations - prefer visual/geometric representations
- Only use LaTeX for key mathematical expressions
- Each circle represents a concept, data point, or step

When student says: "{speech_text}"
- Give a unique, contextual response 
- Ask follow-up questions to continue the conversation
- Create 2-4 visual annotations maximum (prefer circles over text)
- Make it feel like a real tutoring conversation"""

            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                system=system_prompt,
                messages=[{
                    "role": "user", 
                    "content": f"Student just said: '{speech_text}'. Respond as their tutor and provide 2-3 simple visual annotations (prefer circles). Return JSON with: speech_response, next_question, annotations (type/content/x/y/radius), teaching_notes"
                }]
            )
            
            # Parse Claude's response 
            try:
                import json
                response_content = message.content[0].text
                # Extract JSON from response
                json_start = response_content.find('{')
                json_end = response_content.rfind('}')+1
                if json_start != -1 and json_end != -1:
                    response_data = json.loads(response_content[json_start:json_end])
                else:
                    raise ValueError("No JSON found")
            except:
                # Fallback if JSON parsing fails
                response_data = {
                    "speech_response": f"That's interesting! Tell me more about your thoughts on {topic}. What specific part would you like to explore?",
                    "next_question": "What would you like to focus on next?",
                    "annotations": [
                        {"type": "circle", "x": 300, "y": 200, "radius": 30}
                    ],
                    "teaching_notes": f"Continuing conversation about {topic}"
                }
                
        except Exception as e:
            print(f"  Claude API failed: {e}")
            # Simple fallback without repetitive responses
            response_data = {
                "speech_response": f"I heard you say '{speech_text}'. What aspect of {topic} interests you most?",
                "next_question": "Can you elaborate on that?",
                "annotations": [
                    {"type": "circle", "x": 250, "y": 150, "radius": 25}
                ],
                "teaching_notes": "API fallback - continuing conversation"
            }
        
        # Clear previous annotations before drawing new ones
        try:
            clear_response = requests.post("http://localhost:5001/api/clear")
            if clear_response.status_code == 200:
                print("  Cleared previous annotations")
        except Exception as e:
            print(f"⚠️ Could not clear annotations: {e}")
        
        # Process annotations if present (but don't let failures block the response)
        annotations = response_data.get('annotations', [])
        annotation_success = False
        if annotations:
            try:
                # Import the function here to avoid circular imports
                sys.path.append(os.path.dirname(__file__))
                from annotations import process_claude_annotations
                
                annotation_success = process_claude_annotations({'annotations': annotations})
                print(f"📝 Processed {len(annotations)} annotations, success: {annotation_success}")
            except Exception as e:
                print(f"⚠️ Annotation processing failed: {e}")
                annotation_success = False
        
        return jsonify({
            'status': 'success',
            'response': response_data,
            'annotations_processed': annotation_success
        })
        
    except Exception as e:
        print(f"❌ Error in tutoring session: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

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
            research_results = search_and_get_content(topic, num_results=50)
            
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
