"""
Session State Management
"""
import time
from typing import Dict, Any, Deque, List
from collections import deque
from dataclasses import dataclass, field

@dataclass
class SessionState:
    """Maintains state for a single tutoring session"""
    
    # Buffers for multimodal data
    canvas_buf: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=10))
    transcripts: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=200))
    user_intents: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=50))
    pen_events: Deque[Dict[str, Any]] = field(default_factory=lambda: deque(maxlen=1000))
    audio_chunks: List[Dict[str, Any]] = field(default_factory=list)
    
    # Session metadata
    session_id: str = ""
    created_at: float = field(default_factory=time.time)
    last_activity_ts: float = field(default_factory=time.time)
    
    # Conversation state
    speaking: bool = False
    ai_can_interrupt: bool = True
    persistent: bool = False  # Whether to keep session after disconnect
    
    # Knowledge tracking
    mastery: Dict[str, float] = field(default_factory=dict)  # concept -> score [0..1]
    current_problem_type: str = "unknown"
    detected_concepts: List[str] = field(default_factory=list)
    
    # Interaction patterns
    interruption_count: int = 0
    help_requests: int = 0
    error_corrections: int = 0
    successful_hints: int = 0
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity_ts = time.time()
    
    def add_canvas_update(self, canvas_data: Dict[str, Any]):
        """Add canvas update with timestamp"""
        self.canvas_buf.append({
            **canvas_data,
            "timestamp": time.time()
        })
        self.update_activity()
    
    def add_transcript(self, text: str, is_final: bool = False):
        """Add transcript segment"""
        self.transcripts.append({
            "text": text,
            "is_final": is_final,
            "timestamp": time.time()
        })
        self.update_activity()
    
    def add_user_intent(self, text: str, intent_type: str = "general"):
        """Add user intent/message"""
        self.user_intents.append({
            "text": text,
            "type": intent_type,
            "timestamp": time.time()
        })
        self.update_activity()
    
    def get_recent_context(self, seconds: int = 60) -> Dict[str, Any]:
        """Get recent session context for AI models"""
        cutoff = time.time() - seconds
        
        recent_canvas = [
            update for update in self.canvas_buf 
            if update.get("timestamp", 0) >= cutoff
        ]
        
        recent_transcripts = [
            transcript for transcript in self.transcripts 
            if transcript.get("timestamp", 0) >= cutoff
        ]
        
        recent_intents = [
            intent for intent in self.user_intents 
            if intent.get("timestamp", 0) >= cutoff
        ]
        
        recent_pen_events = [
            event for event in self.pen_events 
            if event.get("timestamp", 0) >= cutoff
        ]
        
        return {
            "canvas_updates": recent_canvas,
            "transcripts": recent_transcripts,
            "user_intents": recent_intents,
            "pen_events": recent_pen_events,
            "session_duration": time.time() - self.created_at,
            "last_activity": self.last_activity_ts
        }
    
    def update_mastery(self, concept: str, delta: float):
        """Update concept mastery score"""
        current = self.mastery.get(concept, 0.5)
        self.mastery[concept] = max(0.0, min(1.0, current + delta))
    
    def get_weak_concepts(self, threshold: float = 0.4) -> List[str]:
        """Get concepts with low mastery scores"""
        return [
            concept for concept, score in self.mastery.items()
            if score < threshold
        ]
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics for debugging/monitoring"""
        return {
            "session_id": self.session_id,
            "duration_minutes": (time.time() - self.created_at) / 60,
            "canvas_updates": len(self.canvas_buf),
            "transcripts": len(self.transcripts),
            "user_intents": len(self.user_intents),
            "pen_events": len(self.pen_events),
            "audio_chunks": len(self.audio_chunks),
            "mastery_concepts": len(self.mastery),
            "weak_concepts": len(self.get_weak_concepts()),
            "interruptions": self.interruption_count,
            "help_requests": self.help_requests,
            "error_corrections": self.error_corrections,
            "successful_hints": self.successful_hints,
            "average_mastery": sum(self.mastery.values()) / len(self.mastery) if self.mastery else 0.0
        }
