"""
Wispr Audio Service
Handles voice transcription, VAD, and continuous audio processing
"""
import os
import asyncio
import time
import json
from typing import Dict, Any, List, Optional, AsyncIterator, Callable
import aiohttp
from dataclasses import dataclass

@dataclass
class AudioSegment:
    """Represents a segment of audio with transcription"""
    text: str
    confidence: float
    start_time: float
    end_time: float
    is_final: bool
    speaker: str = "user"
    
class VoiceActivityDetector:
    """Simple Voice Activity Detection"""
    
    def __init__(self, threshold: float = 0.01, min_duration: float = 0.5):
        self.threshold = threshold
        self.min_duration = min_duration
        self.is_speaking = False
        self.speech_start = None
        self.silence_start = None
        self.silence_threshold = 1.0  # seconds of silence before considering speech ended
        
    def process_audio_chunk(self, audio_data: bytes, timestamp: float) -> Dict[str, Any]:
        """Process audio chunk and return VAD decision"""
        # This is a simplified VAD - in production, use proper audio analysis
        # For now, we'll simulate VAD based on chunk size as a proxy for volume
        energy_level = len(audio_data) / 1024.0  # Crude energy estimate
        
        vad_result = {
            "timestamp": timestamp,
            "is_voice": energy_level > self.threshold,
            "energy": energy_level,
            "speech_event": None
        }
        
        # State machine for speech detection
        if vad_result["is_voice"]:
            if not self.is_speaking:
                # Start of speech
                self.is_speaking = True
                self.speech_start = timestamp
                self.silence_start = None
                vad_result["speech_event"] = "speech_start"
            else:
                # Continue speaking
                self.silence_start = None
        else:
            # Silence detected
            if self.is_speaking:
                if self.silence_start is None:
                    self.silence_start = timestamp
                elif (timestamp - self.silence_start) > self.silence_threshold:
                    # End of speech
                    self.is_speaking = False
                    vad_result["speech_event"] = "speech_end"
                    vad_result["speech_duration"] = timestamp - self.speech_start
        
        return vad_result

class WisprClient:
    """Client for Wispr transcription service"""
    
    def __init__(self):
        self.api_key = os.getenv("WISPR_API_KEY")
        self.base_url = "https://api.wispr.ai/v1"  # Hypothetical endpoint
        self.vad = VoiceActivityDetector()
        
        if not self.api_key:
            print("⚠️  WISPR_API_KEY not found - using mock transcription")
            self.api_key = None
    
    async def stream_transcribe(self, 
                              audio_iterator: AsyncIterator[bytes],
                              callback: Optional[Callable] = None) -> AsyncIterator[AudioSegment]:
        """Stream audio transcription with real-time results"""
        
        if not self.api_key:
            # Mock transcription for development
            async for segment in self._mock_transcription(audio_iterator):
                yield segment
            return
        
        try:
            # Real Wispr integration would go here
            async for segment in self._wispr_stream_transcribe(audio_iterator, callback):
                yield segment
                
        except Exception as e:
            print(f"❌ Wispr transcription error: {e}")
            # Fallback to mock
            async for segment in self._mock_transcription(audio_iterator):
                yield segment
    
    async def transcribe_chunk(self, audio_data: bytes, timestamp: float) -> AudioSegment:
        """Transcribe a single audio chunk"""
        
        if not self.api_key:
            return self._mock_transcribe_chunk(audio_data, timestamp)
        
        try:
            # Real transcription
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "audio/wav"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/transcribe",
                    data=audio_data,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return AudioSegment(
                            text=result.get("text", ""),
                            confidence=result.get("confidence", 0.8),
                            start_time=timestamp,
                            end_time=timestamp + 1.0,
                            is_final=True
                        )
                    else:
                        print(f"❌ Wispr API error: {response.status}")
                        return self._mock_transcribe_chunk(audio_data, timestamp)
                        
        except Exception as e:
            print(f"❌ Wispr chunk transcription error: {e}")
            return self._mock_transcribe_chunk(audio_data, timestamp)
    
    async def _wispr_stream_transcribe(self, 
                                     audio_iterator: AsyncIterator[bytes],
                                     callback: Optional[Callable] = None) -> AsyncIterator[AudioSegment]:
        """Real Wispr streaming transcription"""
        # This would implement the actual Wispr SDK streaming
        # For now, we'll use the mock implementation
        async for segment in self._mock_transcription(audio_iterator):
            yield segment
    
    async def _mock_transcription(self, 
                                audio_iterator: AsyncIterator[bytes]) -> AsyncIterator[AudioSegment]:
        """Mock transcription for development and testing"""
        
        # Simulate transcription with realistic timing
        chunk_count = 0
        accumulated_audio = b""
        last_transcript_time = time.time()
        
        # Mock phrases that might be spoken during math tutoring
        mock_phrases = [
            "I'm working on this algebra problem",
            "How do I solve for x here?",
            "I think I need to factor this equation",
            "Can you help me with this step?",
            "I'm not sure about the derivative",
            "Let me try a different approach",
            "This integral looks complicated",
            "I need help with this geometry proof"
        ]
        
        async for audio_chunk in audio_iterator:
            chunk_count += 1
            accumulated_audio += audio_chunk
            current_time = time.time()
            
            # Process VAD
            vad_result = self.vad.process_audio_chunk(audio_chunk, current_time)
            
            # Simulate transcription every few chunks or on speech end
            if (chunk_count % 10 == 0 or 
                vad_result.get("speech_event") == "speech_end" or
                (current_time - last_transcript_time) > 3.0):
                
                if len(accumulated_audio) > 1024:  # Only transcribe if enough audio
                    # Simulate realistic transcription
                    mock_text = mock_phrases[chunk_count % len(mock_phrases)]
                    
                    # Partial transcription (not final)
                    yield AudioSegment(
                        text=mock_text[:len(mock_text)//2] + "...",
                        confidence=0.7,
                        start_time=last_transcript_time,
                        end_time=current_time,
                        is_final=False
                    )
                    
                    await asyncio.sleep(0.1)  # Simulate processing delay
                    
                    # Final transcription
                    yield AudioSegment(
                        text=mock_text,
                        confidence=0.9,
                        start_time=last_transcript_time,
                        end_time=current_time,
                        is_final=True
                    )
                    
                    accumulated_audio = b""
                    last_transcript_time = current_time
            
            # Small delay to simulate real-time processing
            await asyncio.sleep(0.01)
    
    def _mock_transcribe_chunk(self, audio_data: bytes, timestamp: float) -> AudioSegment:
        """Mock transcription for a single chunk"""
        # Simple simulation based on audio data size
        data_size = len(audio_data)
        
        if data_size < 512:
            text = "[inaudible]"
            confidence = 0.3
        elif data_size < 2048:
            text = "working on this problem"
            confidence = 0.7
        else:
            text = "I need help with this math problem"
            confidence = 0.9
        
        return AudioSegment(
            text=text,
            confidence=confidence,
            start_time=timestamp,
            end_time=timestamp + 1.0,
            is_final=True
        )

class AudioStreamManager:
    """Manages audio streaming and transcription coordination"""
    
    def __init__(self, wispr_client: WisprClient):
        self.wispr = wispr_client
        self.active_streams: Dict[str, Dict[str, Any]] = {}
        self.transcript_buffers: Dict[str, List[AudioSegment]] = {}
        
    async def start_stream(self, 
                          session_id: str, 
                          audio_iterator: AsyncIterator[bytes],
                          transcript_callback: Optional[Callable] = None) -> None:
        """Start audio transcription stream for a session"""
        
        print(f"🎤 Starting audio stream for session: {session_id}")
        
        self.active_streams[session_id] = {
            "start_time": time.time(),
            "chunk_count": 0,
            "transcript_count": 0
        }
        self.transcript_buffers[session_id] = []
        
        try:
            async for segment in self.wispr.stream_transcribe(audio_iterator):
                # Store transcript
                self.transcript_buffers[session_id].append(segment)
                
                # Update stream stats
                self.active_streams[session_id]["transcript_count"] += 1
                
                # Call callback if provided
                if transcript_callback:
                    await transcript_callback(session_id, segment)
                
                # Limit buffer size
                if len(self.transcript_buffers[session_id]) > 100:
                    self.transcript_buffers[session_id] = self.transcript_buffers[session_id][-50:]
                    
        except Exception as e:
            print(f"❌ Audio stream error for {session_id}: {e}")
        finally:
            self._cleanup_stream(session_id)
    
    async def process_audio_chunk(self, 
                                session_id: str, 
                                audio_data: bytes,
                                transcript_callback: Optional[Callable] = None) -> AudioSegment:
        """Process a single audio chunk"""
        
        timestamp = time.time()
        segment = await self.wispr.transcribe_chunk(audio_data, timestamp)
        
        # Store in buffer
        if session_id not in self.transcript_buffers:
            self.transcript_buffers[session_id] = []
        
        self.transcript_buffers[session_id].append(segment)
        
        # Call callback
        if transcript_callback:
            await transcript_callback(session_id, segment)
        
        return segment
    
    def get_recent_transcripts(self, session_id: str, seconds: int = 60) -> List[AudioSegment]:
        """Get recent transcripts for a session"""
        if session_id not in self.transcript_buffers:
            return []
        
        cutoff_time = time.time() - seconds
        return [
            segment for segment in self.transcript_buffers[session_id]
            if segment.end_time >= cutoff_time and segment.is_final
        ]
    
    def get_full_transcript(self, session_id: str, final_only: bool = True) -> str:
        """Get full transcript text for a session"""
        if session_id not in self.transcript_buffers:
            return ""
        
        segments = self.transcript_buffers[session_id]
        if final_only:
            segments = [s for s in segments if s.is_final]
        
        return " ".join(segment.text for segment in segments)
    
    def _cleanup_stream(self, session_id: str):
        """Clean up resources for a stream"""
        if session_id in self.active_streams:
            del self.active_streams[session_id]
        print(f"🎤 Audio stream ended for session: {session_id}")

class AudioConfiguration:
    """Audio processing configuration"""
    
    def __init__(self):
        self.sample_rate = 16000  # 16kHz
        self.channels = 1  # Mono
        self.chunk_size = 1024  # bytes
        self.format = "wav"
        
        # VAD settings
        self.vad_threshold = 0.01
        self.silence_duration = 1.0  # seconds
        
        # Transcription settings
        self.continuous_mode = True
        self.push_to_talk = False
        self.language = "en-US"
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for client configuration"""
        return {
            "sampleRate": self.sample_rate,
            "channels": self.channels,
            "chunkSize": self.chunk_size,
            "format": self.format,
            "vadThreshold": self.vad_threshold,
            "silenceDuration": self.silence_duration,
            "continuousMode": self.continuous_mode,
            "pushToTalk": self.push_to_talk,
            "language": self.language
        }

# Global instances
wispr_client = WisprClient()
audio_manager = AudioStreamManager(wispr_client)
audio_config = AudioConfiguration()

# Utility functions
async def handle_audio_stream(session_id: str, 
                            audio_iterator: AsyncIterator[bytes],
                            websocket_callback: Optional[Callable] = None):
    """Handle audio streaming with WebSocket updates"""
    
    async def transcript_callback(session_id: str, segment: AudioSegment):
        """Send transcript updates via WebSocket"""
        if websocket_callback:
            await websocket_callback({
                "type": "transcript",
                "session_id": session_id,
                "text": segment.text,
                "confidence": segment.confidence,
                "is_final": segment.is_final,
                "timestamp": segment.end_time
            })
    
    await audio_manager.start_stream(session_id, audio_iterator, transcript_callback)

async def get_session_transcript(session_id: str, recent_seconds: int = 60) -> Dict[str, Any]:
    """Get transcript summary for a session"""
    recent_segments = audio_manager.get_recent_transcripts(session_id, recent_seconds)
    full_text = audio_manager.get_full_transcript(session_id)
    
    return {
        "session_id": session_id,
        "recent_segments": len(recent_segments),
        "recent_text": " ".join(s.text for s in recent_segments),
        "full_text": full_text,
        "total_segments": len(audio_manager.transcript_buffers.get(session_id, [])),
        "average_confidence": sum(s.confidence for s in recent_segments) / len(recent_segments) if recent_segments else 0.0
    }
