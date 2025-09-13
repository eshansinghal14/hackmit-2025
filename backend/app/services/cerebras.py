"""
Cerebras Integration for Fast Routing and Classification
Uses Llama 3.x small model for quick decisions and routing
"""
import os
import json
import asyncio
from typing import Dict, Any, List, Optional
import aiohttp

class CerebrasService:
    """Service for fast routing and classification using Cerebras Llama models"""
    
    def __init__(self):
        self.api_key = os.getenv("CEREBRAS_API_KEY")
        self.base_url = "https://api.cerebras.ai/v1"
        self.model = "llama3.1-8b"  # Fast, efficient model for routing
        self.max_tokens = 200  # Keep responses short for speed
        
        if not self.api_key:
            raise ValueError("CEREBRAS_API_KEY environment variable is required")
    
    async def route_decision(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Make fast routing decisions based on context"""
        
        prompt = self._build_routing_prompt(context)
        
        try:
            response = await self._make_request(prompt)
            return self._parse_routing_response(response)
            
        except Exception as e:
            print(f"❌ Cerebras API error: {e}")
            return self._create_fallback_routing()
    
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
    
    async def _make_request(self, prompt: str) -> Dict[str, Any]:
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
            "max_tokens": self.max_tokens,
            "temperature": 0.3,  # Lower temperature for consistent routing
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

# Global service instances
cerebras_service = CerebrasService()
pattern_detector = PatternDetector()

async def cerebras_route(context: Dict[str, Any]) -> Dict[str, Any]:
    """Main routing function using Cerebras"""
    # Add pattern detection to context
    context["frustration_detected"] = pattern_detector.detect_frustration_signals(context)
    context["progress_detected"] = pattern_detector.detect_progress_signals(context)
    context["cognitive_load"] = pattern_detector.estimate_cognitive_load(context)
    
    return await cerebras_service.route_decision(context)

async def quick_classify(context: Dict[str, Any]) -> Dict[str, Any]:
    """Quick problem classification"""
    return await cerebras_service.classify_problem(context)

async def check_urgency(context: Dict[str, Any]) -> Dict[str, Any]:
    """Quick urgency check"""
    return await cerebras_service.detect_urgency(context)

async def math_fact_check(query: str) -> Dict[str, Any]:
    """Quick math fact verification"""
    return await cerebras_service.quick_factual_check(query)
