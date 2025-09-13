#!/usr/bin/env python3

from flask import Blueprint, request, jsonify
import time
from conversation_agent import ConversationAgent

cerebras_bp = Blueprint('cerebras', __name__, url_prefix='/api')

try:
    cerebras_agent = ConversationAgent()
    print("✅ Cerebras agent initialized")
except Exception as e:
    print(f"❌ Failed to initialize Cerebras agent: {e}")
    cerebras_agent = None

@cerebras_bp.route('/chat', methods=['POST'])
def chat_with_cerebras():
    """Chat with Cerebras AI using conversation agent"""
    if not cerebras_agent:
        return jsonify({'error': 'Cerebras agent not initialized'}), 500
    
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Get response from Cerebras
        response = cerebras_agent.chat(message)
        
        print(f"🧠 User: {message}")
        print(f"🤖 Cerebras: {response}")
        
        return jsonify({
            'status': 'success',
            'message': message,
            'response': response,
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        return jsonify({'error': str(e)}), 500

@cerebras_bp.route('/chat/remember', methods=['POST'])
def remember_information():
    """Ask Cerebras to remember specific information"""
    if not cerebras_agent:
        return jsonify({'error': 'Cerebras agent not initialized'}), 500
    
    data = request.json
    information = data.get('information')
    
    if not information:
        return jsonify({'error': 'Information is required'}), 400
    
    try:
        response = cerebras_agent.remember(information)
        
        print(f"📝 Remember: {information}")
        print(f"🤖 Response: {response}")
        
        return jsonify({
            'status': 'success',
            'information': information,
            'response': response,
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"❌ Remember error: {e}")
        return jsonify({'error': str(e)}), 500

@cerebras_bp.route('/chat/summary', methods=['GET'])
def get_conversation_summary():
    """Get a summary of the current conversation"""
    if not cerebras_agent:
        return jsonify({'error': 'Cerebras agent not initialized'}), 500
    
    try:
        summary = cerebras_agent.get_conversation_summary()
        
        print(f"📋 Summary requested")
        
        return jsonify({
            'status': 'success',
            'summary': summary,
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"❌ Summary error: {e}")
        return jsonify({'error': str(e)}), 500

@cerebras_bp.route('/chat/clear', methods=['POST'])
def clear_conversation():
    """Clear conversation history"""
    if not cerebras_agent:
        return jsonify({'error': 'Cerebras agent not initialized'}), 500
    
    try:
        cerebras_agent.clear_conversation()
        
        print("🗑️ Conversation cleared")
        
        return jsonify({
            'status': 'success',
            'message': 'Conversation history cleared',
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"❌ Clear error: {e}")
        return jsonify({'error': str(e)}), 500

@cerebras_bp.route('/chat/context', methods=['POST'])
def add_context():
    """Add context to the conversation"""
    if not cerebras_agent:
        return jsonify({'error': 'Cerebras agent not initialized'}), 500
    
    data = request.json
    context = data.get('context')
    
    if not context:
        return jsonify({'error': 'Context is required'}), 400
    
    try:
        cerebras_agent.add_context(context)
        
        print(f"📝 Context added: {context}")
        
        return jsonify({
            'status': 'success',
            'context': context,
            'message': 'Context added successfully',
            'timestamp': time.time()
        })
        
    except Exception as e:
        print(f"❌ Context error: {e}")
        return jsonify({'error': str(e)}), 500
