"""
Cerebras Integration for Low-Latency AI Tutoring
Uses Llama 3.x model for real-time tutoring with screenshot analysis
"""
import os
import json
import asyncio
from typing import Dict, Any, List, Optional
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CerebrasService:
    """Service for low-latency AI tutoring using Cerebras Llama models"""
    
    def __init__(self):
        self.api_key = os.getenv("CEREBRAS_API_KEY")
        self.base_url = "https://api.cerebras.ai/v1"
        self.model = "llama3.1-8b"  # Fast, efficient model for tutoring
        self.max_tokens = 500  # Allow longer responses for tutoring
        
        if not self.api_key:
            raise ValueError("CEREBRAS_API_KEY environment variable is required")
    
    async def tutor_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate real-time tutoring response with screenshot analysis"""
        
        prompt = self._build_tutoring_prompt(context)
        
        try:
            response = await self._make_request(prompt, max_tokens=500)
            return self._parse_tutoring_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras tutoring error: {e}")
            return self._create_fallback_tutoring()

    async def analyze_screenshot(self, image_data: str, voice_context: str = "") -> Dict[str, Any]:
        """Analyze whiteboard screenshot for real-time tutoring feedback"""
        
        prompt = self._build_screenshot_analysis_prompt(image_data, voice_context)
        
        try:
            response = await self._make_request(prompt, max_tokens=300)
            return self._parse_screenshot_analysis(response)
            
        except Exception as e:
            print(f"❌ Cerebras screenshot analysis error: {e}")
            return self._create_fallback_screenshot_analysis()
    
    async def route_decision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Make fast routing decisions based on context"""
        
        prompt = self._build_routing_prompt(context)
        
        try:
            response = await self._make_request(prompt)
            return self._parse_routing_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras API error: {e}")
            return self._create_fallback_routing()
    
    def _build_screenshot_analysis_prompt(self, image_data: str, voice_context: str = "") -> str:
        """Build prompt for analyzing whiteboard screenshots"""
        
        prompt = f"""You are an AI math tutor analyzing a student's whiteboard. Provide real-time feedback.

ANALYSIS CONTEXT:
- Student voice input: "{voice_context}"
- Whiteboard image: [Base64 image data provided]

ANALYSIS TASKS:
1. Identify mathematical content (equations, diagrams, calculations)
2. Check for errors or misconceptions
3. Assess completeness and clarity
4. Provide constructive feedback

RESPONSE FORMAT (JSON):
{{
    "content_type": "algebra|geometry|calculus|statistics|other",
    "identified_elements": ["equation", "diagram", "calculation"],
    "errors_found": ["description of any errors"],
    "feedback": "Brief, encouraging feedback",
    "suggestions": ["specific improvement suggestions"],
    "confidence": 0.85
}}

Focus on being helpful and encouraging. If the work looks correct, acknowledge it. If there are errors, guide gently toward the solution.

Analyze the whiteboard content and respond with JSON only."""

        return prompt
    
    def _parse_screenshot_analysis(self, response: str) -> Dict[str, Any]:
        """Parse screenshot analysis response from Cerebras"""
        try:
            # Try to parse as JSON
            if response.strip().startswith('{'):
                analysis = json.loads(response.strip())
                
                return {
                    "type": "screenshot_analysis",
                    "content_type": analysis.get("content_type", "unknown"),
                    "elements": analysis.get("identified_elements", []),
                    "errors": analysis.get("errors_found", []),
                    "feedback": analysis.get("feedback", "Keep working!"),
                    "suggestions": analysis.get("suggestions", []),
                    "confidence": analysis.get("confidence", 0.5),
                    "timestamp": asyncio.get_event_loop().time()
                }
            else:
                # Fallback: treat as plain text feedback
                return {
                    "type": "screenshot_analysis",
                    "content_type": "unknown",
                    "elements": [],
                    "errors": [],
                    "feedback": response.strip()[:200],
                    "suggestions": [],
                    "confidence": 0.3,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
        except json.JSONDecodeError:
            print(f"⚠️ Failed to parse screenshot analysis JSON: {response[:100]}")
            return self._create_fallback_screenshot_analysis()
    
    def _create_fallback_screenshot_analysis(self) -> Dict[str, Any]:
        """Create fallback response for screenshot analysis"""
        return {
            "type": "screenshot_analysis",
            "content_type": "unknown",
            "elements": [],
            "errors": [],
            "feedback": "I can see you're working on something! Keep going.",
            "suggestions": ["Try breaking the problem into smaller steps"],
            "confidence": 0.1,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    async def classify_problem(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Quickly classify the type of math problem"""
        
        prompt = self._build_classification_prompt(context)
        
        try:
            response = await self._make_request(prompt)
            return self._parse_classification_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras classification error: {e}")
            return {"problem_type": "unknown", "confidence": 0.5}
    
    async def detect_urgency(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Detect if urgent AI intervention is needed"""
        
        prompt = self._build_urgency_prompt(context)
        
        try:
            response = await self._make_request(prompt)
            return self._parse_urgency_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras urgency detection error: {e}")
            return {"interrupt": "none", "urgency_level": "low"}
    
    async def quick_factual_check(self, query: str) -> Dict[str, Any]:
        """Quick factual check for math definitions and identities"""
        
        prompt = f"""Answer this math question quickly and accurately:
        
Question: {query}

Respond with JSON:
{{
    "answer": "brief accurate answer",
    "confidence": 0.0-1.0,
    "type": "definition|identity|fact|computation"
}}"""
        
        try:
            response = await self._make_request(prompt)
            return self._parse_factual_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras factual check error: {e}")
            return {"answer": "I'm not sure about that.", "confidence": 0.1, "type": "unknown"}
    
    def _build_routing_prompt(self, context: Dict[str, Any]) -> str:
        """Build prompt for routing decisions"""
        
        # Extract key context elements
        visual_active = context.get("whiteboard_active", False)
        speaking_active = context.get("speaking_active", False)
        time_since_activity = context.get("temporal_context", {}).get("time_since_last_activity", 0)
        is_stalled = context.get("temporal_context", {}).get("is_stalled", False)
        user_text = context.get("user_text", "")
        weak_concepts = context.get("knowledge_state", {}).get("weak_concepts", [])
        
        prompt = f"""ROUTING DECISION NEEDED:

Context:
- Whiteboard active: {visual_active}
- Student speaking: {speaking_active}
- Time since last activity: {time_since_activity}s
- Student appears stalled: {is_stalled}
- Recent input: "{user_text}"
- Weak concepts: {weak_concepts[:3]}

Decide quickly:

{{
    "interrupt": "none|gentle|medium|high|urgent",
    "reasoning": "brief reason for decision",
    "problem_type": "algebra|calculus|geometry|statistics|unknown",
    "concepts": ["concept1", "concept2"],
    "route_to": "claude|cerebras|specialist",
    "confidence": 0.0-1.0
}}

Respond only with valid JSON."""
        
        return prompt
    
    def _build_tutoring_prompt(self, context: Dict[str, Any]) -> str:
        """Build prompt for AI tutoring with screenshot analysis"""
        
        # Extract context elements
        user_text = context.get("user_text", "")
        canvas_data = context.get("visual_state", {}).get("canvas_screenshot", "")
        recent_activity = context.get("temporal_context", {}).get("time_since_last_activity", 0)
        weak_concepts = context.get("knowledge_state", {}).get("weak_concepts", [])
        drawing_analysis = context.get("visual_state", {}).get("drawing_analysis", {})
        
        # Extract drawing elements
        equations = drawing_analysis.get("equations", [])
        diagrams = drawing_analysis.get("diagrams", [])
        text_annotations = drawing_analysis.get("text", [])
        
        prompt = f"""You are an AI math tutor providing real-time feedback. Analyze the student's work and provide helpful guidance.

STUDENT CONTEXT:
- Recent input: "{user_text}"
- Time since last activity: {recent_activity}s
- Struggling with: {weak_concepts[:3]}

WHITEBOARD ANALYSIS:
- Equations detected: {equations[:3]}
- Diagrams present: {diagrams[:3]}  
- Text annotations: {text_annotations[:3]}

TUTORING GUIDELINES:
1. Be encouraging and supportive
2. Provide specific, actionable feedback
3. If you spot errors, gently correct them
4. Ask guiding questions to promote understanding
5. Keep responses concise but helpful
6. Focus on the math concepts being worked on

Respond with JSON:
{{
    "message": "your encouraging tutoring message",
    "feedback_type": "encouragement|hint|correction|question|explanation",
    "concepts": ["concept1", "concept2"],
    "urgency": "low|medium|high",
    "visual_annotations": [
        {{"type": "circle", "target": "equation_1", "message": "Check this step"}},
        {{"type": "arrow", "target": "diagram_1", "message": "Good work here!"}}
    ],
    "should_interrupt": true|false
}}

Focus on being helpful and maintaining student engagement."""
        
        return prompt
    
    def _build_classification_prompt(self, context: Dict[str, Any]) -> str:
        """Build prompt for problem classification"""
        
        user_text = context.get("user_text", "")
        recent_intents = context.get("conversation_flow", {}).get("recent_intents", [])
        recent_texts = [intent.get("text", "") for intent in recent_intents[-3:]]
        
        prompt = f"""CLASSIFY MATH PROBLEM:

Recent student input: "{user_text}"
Previous messages: {recent_texts}

Classify quickly:

{{
    "problem_type": "algebra|calculus|geometry|trigonometry|statistics|precalculus|unknown",
    "subtopic": "specific subtopic",
    "difficulty": "basic|intermediate|advanced",
    "concepts": ["concept1", "concept2"],
    "confidence": 0.0-1.0
}}

Respond only with valid JSON."""
        
        return prompt
    
    def _build_urgency_prompt(self, context: Dict[str, Any]) -> str:
        """Build prompt for urgency detection"""
        
        time_stalled = context.get("temporal_context", {}).get("time_since_last_activity", 0)
        user_text = context.get("user_text", "")
        error_patterns = context.get("user_profile", {}).get("error_patterns", {})
        
        # Look for urgent keywords
        urgent_keywords = ["wrong", "mistake", "error", "help", "stuck", "confused", "don't understand"]
        has_urgent_keywords = any(keyword in user_text.lower() for keyword in urgent_keywords)
        
        prompt = f"""URGENCY DETECTION:

Student input: "{user_text}"
Time stalled: {time_stalled}s
Has urgent keywords: {has_urgent_keywords}
Recent error rate: {error_patterns.get("correction_rate", 0)}

Detect urgency:

{{
    "interrupt": "none|gentle|urgent",
    "urgency_level": "low|medium|high|critical",
    "reason": "brief reason",
    "should_intervene": true|false
}}

Rules:
- "urgent" only for critical errors or explicit help requests
- "gentle" for stalling >30s
- "none" for normal progress

Respond only with valid JSON."""
        
        return prompt
    
    async def _make_request(self, prompt: str, max_tokens: int = None) -> Dict[str, Any]:
        """Make fast request to Cerebras API"""
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": 0.3,  # Lower temperature for consistent responses
            "top_p": 0.9
        }
        
        # Use shorter timeout for fast routing
        timeout = aiohttp.ClientTimeout(total=5.0)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    raise Exception(f"Cerebras API error {response.status}: {error_text}")
    
    def _parse_routing_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse routing decision response"""
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            # Try to parse as JSON
            try:
                parsed = json.loads(content)
                return self._validate_routing_decision(parsed)
            except json.JSONDecodeError:
                # Fallback parsing
                return self._extract_routing_from_text(content)
                
        except Exception as e:
            print(f"❌ Error parsing Cerebras routing response: {e}")
            return self._create_fallback_routing()
    
    def _parse_tutoring_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse AI tutoring response"""
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            try:
                parsed = json.loads(content)
                return self._validate_tutoring_response(parsed)
            except json.JSONDecodeError:
                # Fallback to plain text response
                return self._extract_tutoring_from_text(content)
                
        except Exception as e:
            print(f"❌ Error parsing tutoring response: {e}")
            return self._create_fallback_tutoring()
    
    def _parse_classification_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse classification response"""
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            try:
                parsed = json.loads(content)
                return {
                    "problem_type": parsed.get("problem_type", "unknown"),
                    "subtopic": parsed.get("subtopic", ""),
                    "difficulty": parsed.get("difficulty", "intermediate"),
                    "concepts": parsed.get("concepts", []),
                    "confidence": parsed.get("confidence", 0.5)
                }
            except json.JSONDecodeError:
                return self._extract_classification_from_text(content)
                
        except Exception as e:
            print(f"❌ Error parsing classification response: {e}")
            return {"problem_type": "unknown", "confidence": 0.3}
    
    def _parse_urgency_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse urgency detection response"""
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            try:
                parsed = json.loads(content)
                return {
                    "interrupt": parsed.get("interrupt", "none"),
                    "urgency_level": parsed.get("urgency_level", "low"),
                    "reason": parsed.get("reason", ""),
                    "should_intervene": parsed.get("should_intervene", False)
                }
            except json.JSONDecodeError:
                return self._extract_urgency_from_text(content)
                
        except Exception as e:
            print(f"❌ Error parsing urgency response: {e}")
            return {"interrupt": "none", "urgency_level": "low"}
    
    def _parse_factual_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse quick factual check response"""
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            try:
                parsed = json.loads(content)
                return parsed
            except json.JSONDecodeError:
                return {
                    "answer": content[:100],  # Truncate long responses
                    "confidence": 0.7,
                    "type": "fact"
                }
                
        except Exception as e:
            print(f"❌ Error parsing factual response: {e}")
            return {"answer": "Error retrieving information", "confidence": 0.1, "type": "error"}
    
    def _validate_routing_decision(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize routing decision"""
        valid_interrupts = ["none", "gentle", "medium", "high", "urgent"]
        valid_routes = ["claude", "cerebras", "specialist"]
        valid_problems = ["algebra", "calculus", "geometry", "trigonometry", "statistics", "precalculus", "unknown"]
        
        return {
            "interrupt": decision.get("interrupt", "none") if decision.get("interrupt") in valid_interrupts else "none",
            "reasoning": decision.get("reasoning", "")[:100],  # Limit length
            "problem_type": decision.get("problem_type", "unknown") if decision.get("problem_type") in valid_problems else "unknown",
            "concepts": decision.get("concepts", [])[:5],  # Limit to 5 concepts
            "route_to": decision.get("route_to", "claude") if decision.get("route_to") in valid_routes else "claude",
            "confidence": max(0.0, min(1.0, decision.get("confidence", 0.5)))  # Clamp 0-1
        }
    
    def _validate_tutoring_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize tutoring response"""
        valid_feedback_types = ["encouragement", "hint", "correction", "question", "explanation"]
        valid_urgencies = ["low", "medium", "high"]
        
        return {
            "message": response.get("message", "Keep up the good work!")[:500],  # Limit length
            "feedback_type": response.get("feedback_type", "encouragement") if response.get("feedback_type") in valid_feedback_types else "encouragement",
            "concepts": response.get("concepts", [])[:5],  # Limit to 5 concepts
            "urgency": response.get("urgency", "low") if response.get("urgency") in valid_urgencies else "low",
            "visual_annotations": response.get("visual_annotations", [])[:3],  # Limit annotations
            "should_interrupt": bool(response.get("should_interrupt", False))
        }
    
    def _create_fallback_tutoring(self) -> Dict[str, Any]:
        """Create safe fallback tutoring response"""
        return {
            "message": "I'm here to help! Keep working through the problem step by step.",
            "feedback_type": "encouragement",
            "concepts": [],
            "urgency": "low",
            "visual_annotations": [],
            "should_interrupt": False
        }
    
    def _extract_tutoring_from_text(self, text: str) -> Dict[str, Any]:
        """Extract tutoring guidance from non-JSON text"""
        text_lower = text.lower()
        
        # Determine feedback type based on keywords
        feedback_type = "encouragement"
        if any(word in text_lower for word in ["wrong", "error", "mistake", "incorrect"]):
            feedback_type = "correction"
        elif any(word in text_lower for word in ["try", "consider", "what if", "think about"]):
            feedback_type = "hint"
        elif "?" in text:
            feedback_type = "question"
        
        # Determine urgency
        urgency = "low"
        if any(word in text_lower for word in ["urgent", "important", "careful", "watch out"]):
            urgency = "medium"
        
        return {
            "message": text[:500],  # Truncate if too long
            "feedback_type": feedback_type,
            "concepts": [],
            "urgency": urgency,
            "visual_annotations": [],
            "should_interrupt": urgency == "medium"
        }
    
    def _create_fallback_routing(self) -> Dict[str, Any]:
        """Create safe fallback routing decision"""
        return {
            "interrupt": "none",
            "reasoning": "fallback decision",
            "problem_type": "unknown",
            "concepts": [],
            "route_to": "claude",
            "confidence": 0.3
        }
    
    def _extract_routing_from_text(self, text: str) -> Dict[str, Any]:
        """Extract routing decision from non-JSON text"""
        text_lower = text.lower()
        
        # Simple keyword extraction
        interrupt = "none"
        if "urgent" in text_lower:
            interrupt = "urgent"
        elif "gentle" in text_lower or "hint" in text_lower:
            interrupt = "gentle"
        
        problem_type = "unknown"
        for ptype in ["algebra", "calculus", "geometry", "statistics"]:
            if ptype in text_lower:
                problem_type = ptype
                break
        
        return {
            "interrupt": interrupt,
            "reasoning": "extracted from text",
            "problem_type": problem_type,
            "concepts": [],
            "route_to": "claude",
            "confidence": 0.4
        }
    
    def _extract_classification_from_text(self, text: str) -> Dict[str, Any]:
        """Extract classification from non-JSON text"""
        text_lower = text.lower()
        
        problem_type = "unknown"
        for ptype in ["algebra", "calculus", "geometry", "trigonometry", "statistics", "precalculus"]:
            if ptype in text_lower:
                problem_type = ptype
                break
        
        difficulty = "intermediate"
        if "basic" in text_lower or "easy" in text_lower:
            difficulty = "basic"
        elif "advanced" in text_lower or "hard" in text_lower:
            difficulty = "advanced"
        
        return {
            "problem_type": problem_type,
            "subtopic": "",
            "difficulty": difficulty,
            "concepts": [],
            "confidence": 0.4
        }
    
    def _extract_urgency_from_text(self, text: str) -> Dict[str, Any]:
        """Extract urgency from non-JSON text"""
        text_lower = text.lower()
        
        interrupt = "none"
        urgency_level = "low"
        
        if any(word in text_lower for word in ["urgent", "critical", "error"]):
            interrupt = "urgent"
            urgency_level = "high"
        elif any(word in text_lower for word in ["gentle", "hint", "help"]):
            interrupt = "gentle"
            urgency_level = "medium"
        
        return {
            "interrupt": interrupt,
            "urgency_level": urgency_level,
            "reason": "extracted from text",
            "should_intervene": interrupt != "none"
        }

# Pattern detection utilities
class PatternDetector:
    """Detects patterns in student behavior for routing decisions"""
    
    @staticmethod
    def detect_frustration_signals(context: Dict[str, Any]) -> bool:
        """Detect if student shows frustration signals"""
        user_text = context.get("user_text", "").lower()
        temporal = context.get("temporal_context", {})
        
        # Text-based frustration indicators
        frustration_words = ["stuck", "confused", "don't get", "doesn't work", "wrong", "help"]
        has_frustration_words = any(word in user_text for word in frustration_words)
        
        # Behavioral indicators
        is_stalled = temporal.get("is_stalled", False)
        
        return has_frustration_words or is_stalled
    
    @staticmethod
    def detect_progress_signals(context: Dict[str, Any]) -> bool:
        """Detect if student is making progress"""
        visual_state = context.get("visual_state", {})
        temporal = context.get("temporal_context", {})
        
        # Visual activity indicates engagement
        drawing_active = visual_state.get("drawing_analysis", {}).get("activity") == "active"
        
        # Regular activity indicates progress
        time_since_activity = temporal.get("time_since_last_activity", float('inf'))
        
        return drawing_active and time_since_activity < 15
    
    @staticmethod
    def estimate_cognitive_load(context: Dict[str, Any]) -> str:
        """Estimate student's cognitive load level"""
        profile = context.get("user_profile", {})
        knowledge = context.get("knowledge_state", {})
        
        # High cognitive load indicators
        interaction_frequency = profile.get("interaction_frequency", 0)
        weak_concept_count = len(knowledge.get("weak_concepts", []))
        
        if weak_concept_count > 3 or interaction_frequency < 0.5:
            return "high"
        elif weak_concept_count > 1 or interaction_frequency < 1.0:
            return "medium"
        else:
            return "low"

# Global service instances (lazy initialization)
cerebras_service = None
pattern_detector = PatternDetector()

def get_cerebras_service() -> CerebrasService:
    """Get or create the Cerebras service instance"""
    global cerebras_service
    if cerebras_service is None:
        cerebras_service = CerebrasService()
    return cerebras_service

async def cerebras_route(context: Dict[str, Any]) -> Dict[str, Any]:
    """Main routing function using Cerebras"""
    # Add pattern detection to context
    context["frustration_detected"] = pattern_detector.detect_frustration_signals(context)
    context["progress_detected"] = pattern_detector.detect_progress_signals(context)
    context["cognitive_load"] = pattern_detector.estimate_cognitive_load(context)
    
    service = get_cerebras_service()
    return await service.route_decision(context)

async def quick_classify(context: Dict[str, Any]) -> Dict[str, Any]:
    """Quick problem classification"""
    service = get_cerebras_service()
    return await service.classify_problem(context)

async def check_urgency(context: Dict[str, Any]) -> Dict[str, Any]:
    """Quick urgency check"""
    service = get_cerebras_service()
    return await service.detect_urgency(context)

async def math_fact_check(query: str) -> Dict[str, Any]:
    """Quick math fact verification"""
    service = get_cerebras_service()
    return await service.quick_factual_check(query)

async def cerebras_tutor(context: Dict[str, Any]) -> Dict[str, Any]:
    """Main AI tutoring function using Cerebras for low-latency response"""
    # Add pattern detection to context
    context["frustration_detected"] = pattern_detector.detect_frustration_signals(context)
    context["progress_detected"] = pattern_detector.detect_progress_signals(context)
    context["cognitive_load"] = pattern_detector.estimate_cognitive_load(context)
    
    service = get_cerebras_service()
    return await service.tutor_response(context)
