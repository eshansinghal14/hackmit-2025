#!/usr/bin/env python3
"""
AI Whiteboard Tutor - FastAPI Backend
"""
import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Run the FastAPI application"""
    # Verify required environment variables
    required_vars = [
        'ANTHROPIC_API_KEY',
        'CEREBRAS_API_KEY', 
        'WISPR_API_KEY',
        'FETCHAI_AGENT_KEY'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("The application will run with mock services for missing integrations.")
        print("For full functionality, please set the API keys in backend/.env file")
    
    print("🚀 Starting AI Whiteboard Tutor Backend...")
    print("📊 Environment variables loaded")
    print("🌐 Server will be available at: http://localhost:8000")
    print("🔌 WebSocket endpoint: ws://localhost:8000/ws/{session_id}")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
