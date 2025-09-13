"""
Claude (Anthropic) Integration for Deep Math Tutoring
"""
import os
import json
import asyncio
from typing import Dict, Any, List, Optional
import aiohttp
from dotenv import load_dotenv
from ..core.annotations import create_simple_hint_plan, create_correction_plan, Point

# Load environment variables
load_dotenv()

class ClaudeService:
    """Service for interacting with Anthropic's Claude API"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.base_url = "https://api.anthropic.com/v1"
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 1000
        
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
    
    async def tutor_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a tutoring plan based on comprehensive context"""
        
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(context)
        
        try:
            response = await self._make_request(system_prompt, user_prompt)
            return self._parse_tutoring_response(response)
            
        except Exception as e:
            print(f"❌ Claude API error: {e}")
            return self._create_fallback_response(context)
    
    async def generate_knowledge_graph(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate knowledge graph updates based on student's work"""
        
        system_prompt = self._build_knowledge_graph_system_prompt()
        user_prompt = self._build_knowledge_graph_user_prompt(context)
        
        try:
            response = await self._make_request(system_prompt, user_prompt)
            return self._parse_knowledge_graph_response(response)
            
        except Exception as e:
            print(f"❌ Claude knowledge graph error: {e}")
            return self._create_fallback_knowledge_graph()
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for Claude tutoring"""
        return """You are an expert math tutor observing a student's whiteboard and listening to their voice. Use the multimodal context (recent screenshots, drawing patterns, and transcribed speech) to provide helpful, timely guidance.

TUTORING PRINCIPLES:
- Be helpful, concise, and context-aware
- Give hints first, solutions second
- Only intervene when there is a critical error, misconception, explicit request for help, or when the student stalls for >30 seconds
- Keep the conversation natural and encouraging
- Prefer minimal, timely interventions
- Use visual annotations only when they add clarity

RESPONSE FORMAT:
Respond with a JSON object containing:
{
    "say": "Your spoken response (keep under 20 words for hints)",
    "mode": "hint|affirm|correction|explanation", 
    "priority": "low|medium|high|urgent",
    "concepts": ["concept1", "concept2"],
    "outcome": "success|error|neutral|progress",
    "annotations": [
        {
            "type": "highlight|circle|arrow|underline|text|math",
            "position": {"x": 100, "y": 200},
            "content": "annotation content",
            "color": "#color"
        }
    ],
    "next_steps": ["step1", "step2"],
    "reasoning": "Brief explanation of your decision"
}

INTERVENTION CRITERIA:
- Critical error or misconception: immediate correction needed
- Student explicitly asks for help: provide scaffolded hint
- Student stalls >30s: gentle nudge or hint
- Correct reasoning: brief affirmation
- Otherwise: stay silent and observe

Keep responses encouraging and concise. Focus on one key point at a time."""

    def _build_knowledge_graph_system_prompt(self) -> str:
        """Build system prompt for knowledge graph generation"""
        return """You are an expert math education analyst. Your job is to analyze a student's mathematical work and update their knowledge graph with concept relationships and mastery levels.

KNOWLEDGE GRAPH STRUCTURE:
- Nodes represent mathematical concepts (e.g., "quadratic_equations", "derivative_rules", "triangle_properties")
- Edges represent prerequisite relationships and concept connections
- Each node has a mastery level (0.0 to 1.0) and importance weight

ANALYSIS GUIDELINES:
1. Identify all mathematical concepts present in the student's work
2. Assess the student's demonstrated mastery of each concept
3. Identify prerequisite relationships between concepts
4. Determine concept importance for the current learning objectives
5. Consider common misconceptions and error patterns

RESPONSE FORMAT:
Respond with JSON containing:
{
    "concepts_identified": [
        {
            "id": "concept_identifier",
            "name": "Human readable concept name", 
            "mastery_evidence": 0.0-1.0,
            "importance": 0.0-1.0,
            "misconceptions": ["misconception1", "misconception2"],
            "demonstrated_skills": ["skill1", "skill2"]
        }
    ],
    "concept_relationships": [
        {
            "prerequisite": "concept_id1",
            "dependent": "concept_id2", 
            "strength": 0.0-1.0,
            "relationship_type": "prerequisite|related|application"
        }
    ],
    "learning_objectives": ["objective1", "objective2"],
    "recommended_focus": ["concept_id1", "concept_id2"],
    "mastery_gaps": ["gap1", "gap2"]
}

Focus on mathematical accuracy and pedagogical relationships."""

    def _build_user_prompt(self, context: Dict[str, Any]) -> str:
        """Build user prompt with context information"""
        prompt_parts = ["CONTEXT:\n"]
        
        # Visual state
        visual_state = context.get("visual_state", {})
        if visual_state.get("latest_canvas"):
            prompt_parts.append(f"- Whiteboard active with {visual_state.get('canvas_history_count', 0)} updates")
            prompt_parts.append(f"- Drawing complexity: {visual_state.get('drawing_complexity', 'unknown')}")
        
        # Conversation context
        conversation = context.get("conversation_flow", {})
        if conversation.get("recent_intents"):
            recent_texts = [intent.get("text", "") for intent in conversation["recent_intents"][-3:]]
            prompt_parts.append(f"- Recent student messages: {recent_texts}")
        
        # Knowledge state
        knowledge = context.get("knowledge_state")
        if knowledge:
            prompt_parts.append(f"- Weak concepts: {knowledge.get('weak_concepts', [])}")
            prompt_parts.append(f"- Strong concepts: {knowledge.get('strong_concepts', [])}")
            prompt_parts.append(f"- Average mastery: {knowledge.get('average_mastery', 0.0):.2f}")
        
        # User profile
        profile = context.get("user_profile", {})
        if profile:
            prompt_parts.append(f"- Session duration: {profile.get('session_duration', 0):.1f} minutes")
            prompt_parts.append(f"- Engagement level: {profile.get('engagement_level', 'unknown')}")
            prompt_parts.append(f"- Help seeking: {profile.get('help_seeking_behavior', 'unknown')}")
        
        # Temporal context
        temporal = context.get("temporal_context", {})
        if temporal:
            prompt_parts.append(f"- Time since last activity: {temporal.get('time_since_last_activity', 0):.1f}s")
            prompt_parts.append(f"- Session phase: {temporal.get('session_phase', 'unknown')}")
            prompt_parts.append(f"- Is stalled: {temporal.get('is_stalled', False)}")
        
        # Current user text/intent
        if context.get("user_text"):
            prompt_parts.append(f"- Current user input: \"{context['user_text']}\"")
        
        prompt_parts.append("\nWhat is your tutoring response? Respond only with valid JSON.")
        
        return "\n".join(prompt_parts)
    
    def _build_knowledge_graph_user_prompt(self, context: Dict[str, Any]) -> str:
        """Build user prompt for knowledge graph analysis"""
        prompt_parts = ["STUDENT WORK ANALYSIS:\n"]
        
        # Visual analysis
        visual_state = context.get("visual_state", {})
        drawing_analysis = visual_state.get("drawing_analysis", {})
        
        if drawing_analysis.get("equations"):
            prompt_parts.append(f"- Equations detected: {drawing_analysis['equations'][:5]}")
        if drawing_analysis.get("diagrams"):
            prompt_parts.append(f"- Diagrams present: {drawing_analysis['diagrams'][:3]}")
        if drawing_analysis.get("text"):
            prompt_parts.append(f"- Text annotations: {drawing_analysis['text'][:3]}")
        
        # Student interactions
        conversation = context.get("conversation_flow", {})
        if conversation.get("recent_intents"):
            recent_texts = [intent.get("text", "") for intent in conversation["recent_intents"][-5:]]
            prompt_parts.append(f"- Recent student inputs: {recent_texts}")
        
        # Current knowledge state
        knowledge = context.get("knowledge_state", {})
        if knowledge:
            prompt_parts.append(f"- Currently weak concepts: {knowledge.get('weak_concepts', [])}")
            prompt_parts.append(f"- Currently strong concepts: {knowledge.get('strong_concepts', [])}")
        
        # Problem context
        if context.get("user_text"):
            prompt_parts.append(f"- Current problem/question: \"{context['user_text']}\"")
        
        # Session context
        profile = context.get("user_profile", {})
        if profile:
            prompt_parts.append(f"- Session duration: {profile.get('session_duration', 0):.1f} minutes")
            prompt_parts.append(f"- Problem solving approach: {profile.get('problem_solving_style', 'unknown')}")
        
        prompt_parts.append("\nAnalyze the mathematical concepts and relationships. Respond only with valid JSON.")
        
        return "\n".join(prompt_parts)
    
    async def _make_request(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Make request to Claude API"""
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": [
                {
                    "role": "user", 
                    "content": f"{system_prompt}\n\n{user_prompt}"
                }
            ],
            "temperature": 0.7
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/messages",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    raise Exception(f"Claude API error {response.status}: {error_text}")
    
    def _parse_tutoring_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude's response into tutoring plan"""
        try:
            # Extract content from Claude's response format
            content = response.get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")
                
                # Try to parse as JSON
                try:
                    parsed = json.loads(text_content)
                    return self._validate_tutoring_plan(parsed)
                except json.JSONDecodeError:
                    # Fallback: create simple plan from text
                    return {
                        "say": text_content[:100],  # Truncate if too long
                        "mode": "hint",
                        "priority": "low",
                        "concepts": [],
                        "outcome": "neutral"
                    }
            
            return self._create_fallback_response({})
            
        except Exception as e:
            print(f"❌ Error parsing Claude response: {e}")
            return self._create_fallback_response({})
    
    def _validate_tutoring_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean up tutoring plan"""
        # Ensure required fields exist
        validated_plan = {
            "say": plan.get("say", "Let me help you with this."),
            "mode": plan.get("mode", "hint"),
            "priority": plan.get("priority", "low"),
            "concepts": plan.get("concepts", []),
            "outcome": plan.get("outcome", "neutral"),
            "duration": min(8000, len(plan.get("say", "")) * 150)  # Reading time estimation
        }
        
        # Validate and include annotations
        if "annotations" in plan and isinstance(plan["annotations"], list):
            validated_annotations = []
            for ann in plan["annotations"]:
                if isinstance(ann, dict) and "type" in ann:
                    validated_annotations.append(ann)
            if validated_annotations:
                validated_plan["annotations"] = validated_annotations
        
        # Include next steps if provided
        if "next_steps" in plan and isinstance(plan["next_steps"], list):
            validated_plan["next_steps"] = plan["next_steps"]
        
        return validated_plan
    
    def _parse_knowledge_graph_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude's knowledge graph response"""
        try:
            # Extract content from Claude's response format
            content = response.get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")
                
                # Try to parse as JSON
                try:
                    parsed = json.loads(text_content)
                    return self._validate_knowledge_graph(parsed)
                except json.JSONDecodeError:
                    # Fallback: extract basic concepts from text
                    return self._extract_concepts_from_text(text_content)
            
            return self._create_fallback_knowledge_graph()
            
        except Exception as e:
            print(f"❌ Error parsing knowledge graph response: {e}")
            return self._create_fallback_knowledge_graph()
    
    def _validate_knowledge_graph(self, kg_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean up knowledge graph data"""
        validated = {
            "concepts_identified": [],
            "concept_relationships": [],
            "learning_objectives": kg_data.get("learning_objectives", [])[:5],
            "recommended_focus": kg_data.get("recommended_focus", [])[:3],
            "mastery_gaps": kg_data.get("mastery_gaps", [])[:5]
        }
        
        # Validate concepts
        for concept in kg_data.get("concepts_identified", []):
            if isinstance(concept, dict) and "id" in concept and "name" in concept:
                validated_concept = {
                    "id": concept["id"],
                    "name": concept["name"],
                    "mastery_evidence": max(0.0, min(1.0, concept.get("mastery_evidence", 0.5))),
                    "importance": max(0.0, min(1.0, concept.get("importance", 0.5))),
                    "misconceptions": concept.get("misconceptions", [])[:3],
                    "demonstrated_skills": concept.get("demonstrated_skills", [])[:5]
                }
                validated["concepts_identified"].append(validated_concept)
        
        # Validate relationships
        for rel in kg_data.get("concept_relationships", []):
            if isinstance(rel, dict) and "prerequisite" in rel and "dependent" in rel:
                validated_rel = {
                    "prerequisite": rel["prerequisite"],
                    "dependent": rel["dependent"],
                    "strength": max(0.0, min(1.0, rel.get("strength", 0.5))),
                    "relationship_type": rel.get("relationship_type", "related")
                }
                validated["concept_relationships"].append(validated_rel)
        
        return validated
    
    def _create_fallback_knowledge_graph(self) -> Dict[str, Any]:
        """Create fallback knowledge graph when parsing fails"""
        return {
            "concepts_identified": [],
            "concept_relationships": [],
            "learning_objectives": ["continue_current_problem"],
            "recommended_focus": [],
            "mastery_gaps": []
        }
    
    def _extract_concepts_from_text(self, text: str) -> Dict[str, Any]:
        """Extract basic concepts from non-JSON text response"""
        text_lower = text.lower()
        
        # Common math concepts to look for
        math_concepts = {
            "algebra": ["equation", "variable", "solve", "linear", "quadratic"],
            "calculus": ["derivative", "integral", "limit", "function", "rate"],
            "geometry": ["triangle", "angle", "area", "perimeter", "circle"],
            "statistics": ["mean", "median", "probability", "distribution", "data"]
        }
        
        identified_concepts = []
        for domain, keywords in math_concepts.items():
            if any(keyword in text_lower for keyword in keywords):
                identified_concepts.append({
                    "id": domain,
                    "name": domain.capitalize(),
                    "mastery_evidence": 0.5,
                    "importance": 0.6,
                    "misconceptions": [],
                    "demonstrated_skills": []
                })
        
        return {
            "concepts_identified": identified_concepts,
            "concept_relationships": [],
            "learning_objectives": ["continue_current_problem"],
            "recommended_focus": [concept["id"] for concept in identified_concepts[:2]],
            "mastery_gaps": []
        }
    
    def _create_fallback_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create fallback response when Claude API fails"""
        # Simple heuristics based on context
        temporal = context.get("temporal_context", {})
        user_text = context.get("user_text", "")
        
        if temporal.get("is_stalled", False):
            return create_simple_hint_plan("Would you like me to give you a hint?")
        elif "help" in user_text.lower():
            return create_simple_hint_plan("I'm here to help! What specifically are you working on?")
        elif "?" in user_text:
            return create_simple_hint_plan("That's a great question. Let's think through it step by step.")
        else:
            return create_simple_hint_plan("Keep going, you're on the right track!")

# Additional specialized tutoring methods
class MathTutoringSpecialist:
    """Specialized methods for different math domains"""
    
    def __init__(self, claude_service: ClaudeService):
        self.claude = claude_service
    
    async def algebra_help(self, context: Dict[str, Any], problem_type: str) -> Dict[str, Any]:
        """Specialized algebra tutoring"""
        context["domain"] = "algebra"
        context["problem_type"] = problem_type
        context["requires_reasoning"] = True
        
        return await self.claude.tutor_plan(context)
    
    async def calculus_help(self, context: Dict[str, Any], concept: str) -> Dict[str, Any]:
        """Specialized calculus tutoring"""
        context["domain"] = "calculus"
        context["concept"] = concept
        context["requires_reasoning"] = True
        context["visual_importance"] = "high"  # Calculus benefits from visual aids
        
        return await self.claude.tutor_plan(context)
    
    async def geometry_help(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Specialized geometry tutoring with emphasis on visual annotations"""
        context["domain"] = "geometry"
        context["visual_importance"] = "critical"
        context["annotation_preferred"] = True
        
        return await self.claude.tutor_plan(context)
    
    async def error_correction(self, context: Dict[str, Any], error_type: str) -> Dict[str, Any]:
        """Specialized error correction"""
        context["intervention_type"] = "error_correction"
        context["error_type"] = error_type
        context["priority"] = "high"
        
        plan = await self.claude.tutor_plan(context)
        plan["mode"] = "correction"
        return plan

# Global service instances (lazy initialization)
claude_service = None
math_specialist = None

def get_claude_service() -> ClaudeService:
    """Get or create the Claude service instance"""
    global claude_service, math_specialist
    if claude_service is None:
        claude_service = ClaudeService()
        math_specialist = MathTutoringSpecialist(claude_service)
    return claude_service

def get_math_specialist() -> MathTutoringSpecialist:
    """Get or create the Math specialist instance"""
    global math_specialist
    if math_specialist is None:
        get_claude_service()  # This will initialize both
    return math_specialist

async def claude_tutor_plan(context: Dict[str, Any]) -> Dict[str, Any]:
    """Main function for generating Claude tutoring plans"""
    # Determine if we need specialized tutoring
    domain = context.get("currentProblem", "").lower()
    
    specialist = get_math_specialist()
    service = get_claude_service()
    
    if "algebra" in domain:
        return await specialist.algebra_help(context, domain)
    elif "calculus" in domain:
        return await specialist.calculus_help(context, domain)
    elif "geometry" in domain:
        return await specialist.geometry_help(context)
    elif context.get("intervention_type") == "error_correction":
        return await specialist.error_correction(context, context.get("error_type", "general"))
    else:
        return await service.tutor_plan(context)

async def quick_math_hint(problem_description: str) -> str:
    """Quick hint generation for simple cases"""
    context = {
        "user_text": problem_description,
        "requires_reasoning": True,
        "visual_state": {"drawing_complexity": "low"},
        "temporal_context": {"is_stalled": True}
    }
    
    service = get_claude_service()
    plan = await service.tutor_plan(context)
    return plan.get("say", "Let me help you think through this step by step.")

async def claude_knowledge_graph(context: Dict[str, Any]) -> Dict[str, Any]:
    """Generate knowledge graph updates using Claude"""
    service = get_claude_service()
    return await service.generate_knowledge_graph(context)
