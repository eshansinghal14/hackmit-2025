"""
Conversation Management
Handles turn-taking, interruptions, and conversation flow
"""
import time
import asyncio
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass

class ConversationState(Enum):
    """States of the conversation"""
    USER_SPEAKING = "user_speaking"
    AI_SPEAKING = "ai_speaking" 
    LISTENING = "listening"
    INTERRUPTED = "interrupted"
    THINKING = "thinking"
    IDLE = "idle"

class InterruptionPriority(Enum):
    """Priority levels for AI interruptions"""
    LOW = "low"          # Gentle hint after natural pause
    MEDIUM = "medium"    # Polite interruption for guidance
    HIGH = "high"        # Important correction needed
    URGENT = "urgent"    # Critical error that must be addressed

@dataclass
class ConversationTurn:
    """Represents a single conversation turn"""
    speaker: str  # "user" or "ai"
    content: str
    timestamp: float
    duration: float = 0.0
    interrupted: bool = False
    turn_type: str = "normal"  # normal, question, hint, correction, etc.

class ConversationManager:
    """Manages conversation flow and interruption logic"""
    
    def __init__(self, session_state):
        self.session_state = session_state
        self.current_state = ConversationState.IDLE
        self.current_speaker = None
        self.last_speaker_change = time.time()
        self.conversation_history: List[ConversationTurn] = []
        self.pending_interventions: List[Dict[str, Any]] = []
        self.ai_response_queue: List[Dict[str, Any]] = []
        
        # Configuration
        self.max_ai_speaking_time = 15.0  # seconds
        self.user_stall_threshold = 30.0  # seconds before offering help
        self.interruption_cooldown = 5.0  # seconds between AI interruptions
        self.last_ai_interruption = 0.0
        
    def user_interrupt(self):
        """Handle user interruption of AI"""
        if self.current_state == ConversationState.AI_SPEAKING:
            self.current_state = ConversationState.INTERRUPTED
            self._end_current_turn(interrupted=True)
        
        self.current_state = ConversationState.USER_SPEAKING
        self.current_speaker = "user"
        self.last_speaker_change = time.time()
        self.session_state.speaking = False
        
    def ai_interrupt(self, priority: InterruptionPriority = InterruptionPriority.MEDIUM):
        """Handle AI interruption of user"""
        # Check if AI can interrupt based on priority and cooldown
        if not self._can_ai_interrupt(priority):
            return False
        
        if self.current_state in [ConversationState.USER_SPEAKING, ConversationState.LISTENING]:
            self.current_state = ConversationState.INTERRUPTED
            self._end_current_turn(interrupted=True)
        
        self.current_state = ConversationState.AI_SPEAKING
        self.current_speaker = "ai"
        self.last_speaker_change = time.time()
        self.last_ai_interruption = time.time()
        self.session_state.speaking = True
        return True
        
    def start_user_turn(self):
        """Start a user speaking turn"""
        if self.current_state == ConversationState.AI_SPEAKING:
            self.user_interrupt()
            return
        
        self._end_current_turn()
        self.current_state = ConversationState.USER_SPEAKING
        self.current_speaker = "user"
        self.last_speaker_change = time.time()
        
    def start_ai_turn(self, content: str = "", turn_type: str = "normal"):
        """Start an AI speaking turn"""
        self._end_current_turn()
        self.current_state = ConversationState.AI_SPEAKING
        self.current_speaker = "ai"
        self.last_speaker_change = time.time()
        self.session_state.speaking = True
        
        # Add to conversation history
        turn = ConversationTurn(
            speaker="ai",
            content=content,
            timestamp=time.time(),
            turn_type=turn_type
        )
        self.conversation_history.append(turn)
        
    def end_ai_turn(self):
        """End AI speaking turn and return to listening"""
        self._end_current_turn()
        self.current_state = ConversationState.LISTENING
        self.current_speaker = None
        self.session_state.speaking = False
        
    def set_listening(self):
        """Set to listening state"""
        self._end_current_turn()
        self.current_state = ConversationState.LISTENING
        self.current_speaker = None
        self.session_state.speaking = False
        
    def set_thinking(self):
        """Set to AI thinking state"""
        self.current_state = ConversationState.THINKING
        self.current_speaker = "ai"
        
    def add_user_message(self, content: str, message_type: str = "normal"):
        """Add user message to conversation history"""
        turn = ConversationTurn(
            speaker="user",
            content=content,
            timestamp=time.time(),
            turn_type=message_type
        )
        self.conversation_history.append(turn)
        self.session_state.update_activity()
        
    def should_offer_help(self) -> bool:
        """Check if AI should offer help due to user inactivity"""
        time_since_activity = time.time() - self.session_state.last_activity_ts
        time_since_last_turn = time.time() - self.last_speaker_change
        
        # Offer help if user has been inactive for threshold time
        return (time_since_activity > self.user_stall_threshold and 
                time_since_last_turn > self.user_stall_threshold and
                self.current_state in [ConversationState.LISTENING, ConversationState.IDLE] and
                self._can_ai_interrupt(InterruptionPriority.LOW))
    
    def should_ai_yield(self) -> bool:
        """Check if AI should yield speaking turn"""
        if self.current_state != ConversationState.AI_SPEAKING:
            return False
            
        speaking_duration = time.time() - self.last_speaker_change
        return speaking_duration > self.max_ai_speaking_time
    
    def queue_ai_response(self, content: str, priority: InterruptionPriority = InterruptionPriority.LOW, response_type: str = "hint"):
        """Queue an AI response for delivery"""
        response = {
            "content": content,
            "priority": priority,
            "type": response_type,
            "timestamp": time.time()
        }
        self.ai_response_queue.append(response)
        
    def get_next_ai_response(self) -> Optional[Dict[str, Any]]:
        """Get next queued AI response if appropriate"""
        if not self.ai_response_queue:
            return None
            
        # Sort by priority and timestamp
        self.ai_response_queue.sort(key=lambda x: (x["priority"].value, x["timestamp"]))
        
        # Check if we can deliver the highest priority response
        next_response = self.ai_response_queue[0]
        if self._can_ai_interrupt(next_response["priority"]):
            return self.ai_response_queue.pop(0)
            
        return None
    
    def get_conversation_context(self, max_turns: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation context for AI models"""
        recent_turns = self.conversation_history[-max_turns:]
        
        context = []
        for turn in recent_turns:
            context.append({
                "speaker": turn.speaker,
                "content": turn.content,
                "timestamp": turn.timestamp,
                "type": turn.turn_type,
                "interrupted": turn.interrupted
            })
            
        return context
    
    def analyze_conversation_patterns(self) -> Dict[str, Any]:
        """Analyze patterns in the conversation"""
        if len(self.conversation_history) < 2:
            return {"insufficient_data": True}
        
        # Count turn types
        user_turns = [t for t in self.conversation_history if t.speaker == "user"]
        ai_turns = [t for t in self.conversation_history if t.speaker == "ai"]
        
        # Calculate average turn lengths
        user_durations = [t.duration for t in user_turns if t.duration > 0]
        ai_durations = [t.duration for t in ai_turns if t.duration > 0]
        
        # Count interruptions
        interruptions = sum(1 for t in self.conversation_history if t.interrupted)
        
        # Analyze question patterns
        questions = sum(1 for t in user_turns if "?" in t.content)
        help_requests = sum(1 for t in user_turns if any(word in t.content.lower() 
                           for word in ["help", "stuck", "confused", "don't understand"]))
        
        return {
            "total_turns": len(self.conversation_history),
            "user_turns": len(user_turns),
            "ai_turns": len(ai_turns),
            "interruptions": interruptions,
            "questions": questions,
            "help_requests": help_requests,
            "avg_user_turn_length": sum(user_durations) / len(user_durations) if user_durations else 0,
            "avg_ai_turn_length": sum(ai_durations) / len(ai_durations) if ai_durations else 0,
            "conversation_balance": len(user_turns) / max(len(ai_turns), 1),
            "recent_activity": time.time() - self.conversation_history[-1].timestamp if self.conversation_history else float('inf')
        }
    
    def get_intervention_suggestions(self) -> List[Dict[str, Any]]:
        """Get suggestions for AI intervention based on conversation state"""
        suggestions = []
        
        # Check for user stalling
        if self.should_offer_help():
            suggestions.append({
                "type": "offer_help",
                "priority": InterruptionPriority.LOW,
                "content": "I notice you might be stuck. Would you like a hint or some guidance?"
            })
        
        # Check for AI speaking too long
        if self.should_ai_yield():
            suggestions.append({
                "type": "yield_turn",
                "priority": InterruptionPriority.MEDIUM,
                "content": None  # Just yield, don't speak
            })
        
        # Check conversation patterns
        patterns = self.analyze_conversation_patterns()
        
        # If too many questions without progress
        if patterns.get("questions", 0) > 3 and patterns.get("help_requests", 0) == 0:
            suggestions.append({
                "type": "scaffold_help",
                "priority": InterruptionPriority.MEDIUM,
                "content": "I see you have several questions. Let me help break this down step by step."
            })
        
        return suggestions
    
    def _can_ai_interrupt(self, priority: InterruptionPriority) -> bool:
        """Check if AI can interrupt based on priority and state"""
        # Check basic conditions
        if not self.session_state.ai_can_interrupt:
            return False
            
        # Check cooldown (except for urgent interruptions)
        if priority != InterruptionPriority.URGENT:
            time_since_last = time.time() - self.last_ai_interruption
            if time_since_last < self.interruption_cooldown:
                return False
        
        # Allow interruptions based on priority
        if priority == InterruptionPriority.URGENT:
            return True
        elif priority == InterruptionPriority.HIGH:
            return self.current_state in [ConversationState.USER_SPEAKING, ConversationState.LISTENING]
        elif priority == InterruptionPriority.MEDIUM:
            return self.current_state == ConversationState.LISTENING
        else:  # LOW priority
            return self.current_state in [ConversationState.LISTENING, ConversationState.IDLE]
    
    def _end_current_turn(self, interrupted: bool = False):
        """End the current conversation turn"""
        if not self.conversation_history:
            return
            
        current_turn = self.conversation_history[-1]
        if current_turn.speaker == self.current_speaker:
            current_turn.duration = time.time() - current_turn.timestamp
            current_turn.interrupted = interrupted
    
    def get_state_summary(self) -> Dict[str, Any]:
        """Get summary of conversation state"""
        return {
            "current_state": self.current_state.value,
            "current_speaker": self.current_speaker,
            "time_in_state": time.time() - self.last_speaker_change,
            "can_interrupt": self.session_state.ai_can_interrupt,
            "queued_responses": len(self.ai_response_queue),
            "conversation_turns": len(self.conversation_history),
            "should_offer_help": self.should_offer_help(),
            "should_ai_yield": self.should_ai_yield()
        }
