"""
Web Speech API Audio Service
Handles voice input from frontend Web Speech API (no server-side audio processing)
"""
import asyncio
import time
from typing import Dict, Any
from fastapi import WebSocket
from app.core.session import SessionState

class WebSpeechHandler:
    """Handler for Web Speech API transcriptions from frontend"""
    
    def __init__(self):
        print("🎤 WebSpeechHandler initialized for Web Speech API")

    def process_transcript(self, text: str, timestamp: float) -> Dict[str, Any]:
        """Process a final transcript from the frontend Web Speech API"""
        return {
            "text": text.strip(),
            "is_final": True,
            "ts": timestamp,
            "source": "web_speech_api",
            "confidence": 1.0  # Web Speech API handles confidence internally
        }

    def validate_transcript(self, text: str) -> bool:
        """Validate if transcript is meaningful for AI processing"""
        if not text or len(text.strip()) < 2:
            return False
            
        # Filter out common speech recognition artifacts
        artifacts = ["um", "uh", "ah", "hmm", "well", "so", "like"]
        words = text.lower().split()
        meaningful_words = [w for w in words if w not in artifacts]
        
        return len(meaningful_words) > 0

async def handle_voice_input(websocket: WebSocket, state: SessionState, voice_data: Dict[str, Any]):
    """Handle voice input from Web Speech API (already transcribed)"""
    try:
        text = voice_data.get("text", "").strip()
        timestamp = voice_data.get("timestamp", time.time())
        
        if not text:
            print("🎤 Empty transcript received, ignoring")
            return
            
        print(f"🎤 Processing voice input: '{text}'")
        
        # Create handler and validate
        handler = WebSpeechHandler()
        
        if not handler.validate_transcript(text):
            print(f"🎤 Transcript not meaningful enough: '{text}'")
            return
        
        # Process the transcript
        processed = handler.process_transcript(text, timestamp)
        
        # Store the transcript
        state.transcripts.append({
            "text": processed["text"],
            "final": processed["is_final"],
            "ts": processed["ts"],
            "source": processed["source"]
        })
        
        # Send confirmation subtitle (brief echo)
        await websocket.send_json({
            "type": "subtitle",
            "text": f"🎤 \"{processed['text']}\"",
            "mode": "speak",
            "ttlMs": 2000
        })
        
        print(f"🎤 Voice input processed successfully: {processed['text']}")
        
        # Return the processed transcript for further handling
        return processed
        
    except Exception as e:
        print(f"❌ Error in handle_voice_input: {e}")
        await websocket.send_json({
            "type": "subtitle",
            "text": "Sorry, I couldn't process that. Please try again.",
            "mode": "correction",
            "ttlMs": 3000
        })
        return None

# Legacy compatibility - keeping old interface names for existing code
class WisprClient:
    """Legacy compatibility wrapper"""
    
    def __init__(self, api_key: str):
        self.handler = WebSpeechHandler()
        print(f"🎤 WebSpeechHandler initialized (legacy WisprClient compatibility)")

async def handle_audio_stream(websocket: WebSocket, state: SessionState, wispr: 'WisprClient', audio_queue: asyncio.Queue):
    """Legacy compatibility function - now handles Web Speech API"""
    # This function is no longer used with Web Speech API
    # Audio processing happens on the frontend
    print("🎤 handle_audio_stream called but Web Speech API handles audio on frontend")
    pass