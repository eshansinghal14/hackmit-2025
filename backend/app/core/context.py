"""
MCP (Model Context Protocol) Integration
Builds unified context for AI model routing and reasoning
"""
import time
from typing import Dict, Any, Optional, List
from ..core.session import SessionState
from ..core.knowledge_graph import KnowledgeGraph

class MCPContextBuilder:
    """Builds comprehensive context for AI models"""
    
    def __init__(self):
        self.providers = [
            self._whiteboard_context,
            self._conversation_context,
            self._knowledge_graph_context,
            self._user_profile_context,
            self._temporal_context
        ]
    
    async def build_context(self, 
                          state: SessionState, 
                          kg_state: Optional[KnowledgeGraph] = None,
                          user_text: Optional[str] = None,
                          requires_reasoning: bool = True,
                          requires_speed: bool = False) -> Dict[str, Any]:
        """Build comprehensive context from all providers"""
        
        context = {
            "requires_reasoning": requires_reasoning,
            "requires_speed": requires_speed,
            "user_text": user_text,
            "timestamp": time.time()
        }
        
        # Aggregate from all context providers
        for provider in self.providers:
            try:
                provider_context = await provider(state, kg_state)
                context.update(provider_context)
            except Exception as e:
                print(f"❌ Context provider error: {e}")
                continue
        
        return context
    
    async def _whiteboard_context(self, state: SessionState, kg_state: Optional[KnowledgeGraph]) -> Dict[str, Any]:
        """Extract visual/whiteboard context"""
        latest_canvas = state.canvas_buf[-1] if state.canvas_buf else None
        recent_pen_events = list(state.pen_events)[-50:]  # Last 50 pen events
        
        # Analyze drawing patterns
        drawing_analysis = self._analyze_drawing_patterns(recent_pen_events)
        
        return {
            "visual_state": {
                "latest_canvas": latest_canvas,
                "canvas_history_count": len(state.canvas_buf),
                "recent_pen_events": len(recent_pen_events),
                "drawing_analysis": drawing_analysis
            },
            "whiteboard_active": bool(latest_canvas),
            "drawing_complexity": drawing_analysis.get("complexity", "low")
        }
    
    async def _conversation_context(self, state: SessionState, kg_state: Optional[KnowledgeGraph]) -> Dict[str, Any]:
        """Extract conversation flow and speech context"""
        recent_transcripts = [t for t in state.transcripts if t.get("is_final", False)][-10:]
        recent_intents = list(state.user_intents)[-5:]
        
        conversation_flow = self._analyze_conversation_flow(recent_transcripts, recent_intents)
        
        return {
            "conversation_flow": {
                "recent_transcripts": recent_transcripts,
                "recent_intents": recent_intents,
                "flow_analysis": conversation_flow
            },
            "speaking_active": state.speaking,
            "can_interrupt": state.ai_can_interrupt,
            "conversation_depth": len(recent_intents)
        }
    
    async def _knowledge_graph_context(self, state: SessionState, kg_state: Optional[KnowledgeGraph]) -> Dict[str, Any]:
        """Extract knowledge graph and mastery context"""
        if not kg_state:
            return {"knowledge_state": None}
        
        weak_concepts = kg_state.weak_concepts()
        strong_concepts = [
            node.id for node in kg_state.nodes.values() 
            if node.mastery > 0.7
        ]
        
        knowledge_gaps = self._identify_knowledge_gaps(kg_state)
        
        return {
            "knowledge_state": {
                "total_concepts": len(kg_state.nodes),
                "weak_concepts": weak_concepts,
                "strong_concepts": strong_concepts,
                "knowledge_gaps": knowledge_gaps,
                "average_mastery": sum(node.mastery for node in kg_state.nodes.values()) / len(kg_state.nodes) if kg_state.nodes else 0.0
            },
            "user_knowledge": {concept: state.mastery.get(concept, 0.5) for concept in state.detected_concepts}
        }
    
    async def _user_profile_context(self, state: SessionState, kg_state: Optional[KnowledgeGraph]) -> Dict[str, Any]:
        """Extract user behavior and interaction patterns"""
        session_stats = state.get_session_stats()
        interaction_patterns = self._analyze_interaction_patterns(state)
        
        return {
            "user_profile": {
                "session_duration": session_stats["duration_minutes"],
                "interaction_frequency": interaction_patterns["frequency"],
                "help_seeking_behavior": interaction_patterns["help_seeking"],
                "error_patterns": interaction_patterns["error_patterns"],
                "engagement_level": interaction_patterns["engagement"]
            },
            "session_stats": session_stats
        }
    
    async def _temporal_context(self, state: SessionState, kg_state: Optional[KnowledgeGraph]) -> Dict[str, Any]:
        """Extract timing and temporal patterns"""
        time_since_last_activity = time.time() - state.last_activity_ts
        session_phase = self._determine_session_phase(state)
        
        return {
            "temporal_context": {
                "time_since_last_activity": time_since_last_activity,
                "session_phase": session_phase,
                "is_stalled": time_since_last_activity > 30,
                "activity_rhythm": self._analyze_activity_rhythm(state)
            }
        }
    
    def _analyze_drawing_patterns(self, pen_events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in drawing/pen events"""
        if not pen_events:
            return {"complexity": "none", "activity": "none"}
        
        # Count different event types
        downs = sum(1 for event in pen_events if event.get("type") == "down")
        moves = sum(1 for event in pen_events if event.get("type") == "move")
        ups = sum(1 for event in pen_events if event.get("type") == "up")
        
        # Estimate complexity
        total_events = len(pen_events)
        if total_events < 10:
            complexity = "low"
        elif total_events < 50:
            complexity = "medium"
        else:
            complexity = "high"
        
        return {
            "complexity": complexity,
            "total_events": total_events,
            "strokes": downs,  # Number of separate pen-down events
            "activity": "active" if total_events > 5 else "minimal"
        }
    
    def _analyze_conversation_flow(self, transcripts: List[Dict], intents: List[Dict]) -> Dict[str, Any]:
        """Analyze conversation patterns and flow"""
        total_utterances = len(transcripts) + len(intents)
        
        # Detect question patterns
        questions = sum(1 for item in intents if "?" in item.get("text", ""))
        help_requests = sum(1 for item in intents if any(word in item.get("text", "").lower() 
                           for word in ["help", "stuck", "don't understand", "confused"]))
        
        return {
            "total_utterances": total_utterances,
            "questions_asked": questions,
            "help_requests": help_requests,
            "flow_type": "question_heavy" if questions > total_utterances * 0.5 else "exploratory"
        }
    
    def _identify_knowledge_gaps(self, kg_state: KnowledgeGraph) -> List[Dict[str, Any]]:
        """Identify critical knowledge gaps"""
        gaps = []
        
        for node in kg_state.nodes.values():
            if node.mastery < 0.4 and node.importance > 0.6:
                gaps.append({
                    "concept": node.id,
                    "mastery": node.mastery,
                    "importance": node.importance,
                    "gap_severity": "high" if node.mastery < 0.2 else "medium"
                })
        
        return sorted(gaps, key=lambda x: x["importance"], reverse=True)
    
    def _analyze_interaction_patterns(self, state: SessionState) -> Dict[str, Any]:
        """Analyze user interaction patterns"""
        stats = state.get_session_stats()
        
        # Calculate interaction frequency
        duration = max(stats["duration_minutes"], 0.1)  # Avoid division by zero
        frequency = (stats["canvas_updates"] + stats["user_intents"]) / duration
        
        # Categorize help-seeking behavior
        help_ratio = stats["help_requests"] / max(stats["user_intents"], 1)
        help_seeking = "high" if help_ratio > 0.3 else ("medium" if help_ratio > 0.1 else "low")
        
        # Estimate engagement
        engagement_score = min(frequency * 2 + stats["canvas_updates"] * 0.1, 10)
        engagement = "high" if engagement_score > 5 else ("medium" if engagement_score > 2 else "low")
        
        return {
            "frequency": frequency,
            "help_seeking": help_seeking,
            "error_patterns": {
                "corrections": stats["error_corrections"],
                "correction_rate": stats["error_corrections"] / max(stats["user_intents"], 1)
            },
            "engagement": engagement
        }
    
    def _determine_session_phase(self, state: SessionState) -> str:
        """Determine what phase of learning the session is in"""
        duration = time.time() - state.created_at
        
        if duration < 120:  # First 2 minutes
            return "warmup"
        elif duration < 600:  # First 10 minutes
            return "active_learning"
        elif duration < 1800:  # First 30 minutes
            return "deep_work"
        else:
            return "extended_session"
    
    def _analyze_activity_rhythm(self, state: SessionState) -> Dict[str, Any]:
        """Analyze the rhythm of user activity"""
        recent_activities = []
        
        # Collect timestamps from all activity types
        for canvas_update in state.canvas_buf:
            if "timestamp" in canvas_update:
                recent_activities.append(canvas_update["timestamp"])
        
        for intent in state.user_intents:
            if "timestamp" in intent:
                recent_activities.append(intent["timestamp"])
        
        if len(recent_activities) < 2:
            return {"rhythm": "insufficient_data"}
        
        recent_activities.sort()
        intervals = [recent_activities[i+1] - recent_activities[i] 
                    for i in range(len(recent_activities)-1)]
        
        avg_interval = sum(intervals) / len(intervals)
        
        return {
            "rhythm": "steady" if avg_interval < 30 else "sporadic",
            "average_interval": avg_interval,
            "activity_count": len(recent_activities)
        }

# Global context builder instance
context_builder = MCPContextBuilder()

async def build_mcp_context(state: SessionState, 
                          kg_state: Optional[KnowledgeGraph] = None,
                          user_text: Optional[str] = None,
                          requires_reasoning: bool = True,
                          requires_speed: bool = False) -> Dict[str, Any]:
    """Convenience function to build MCP context"""
    return await context_builder.build_context(
        state=state,
        kg_state=kg_state,
        user_text=user_text,
        requires_reasoning=requires_reasoning,
        requires_speed=requires_speed
    )

def classify_problem_state(state: SessionState) -> str:
    """Quick problem classification for context"""
    # Simple heuristic based on recent activity
    recent_intents = list(state.user_intents)[-3:]
    
    # Look for math keywords
    math_keywords = {
        "algebra": ["x", "equation", "solve", "variable", "factor"],
        "calculus": ["derivative", "integral", "limit", "rate", "slope"],
        "geometry": ["angle", "triangle", "circle", "area", "perimeter"],
        "statistics": ["mean", "median", "probability", "data", "distribution"]
    }
    
    for intent in recent_intents:
        text = intent.get("text", "").lower()
        for subject, keywords in math_keywords.items():
            if any(keyword in text for keyword in keywords):
                return subject
    
    return state.current_problem_type or "unknown"
