"""
Claude Lecture Service for Interactive Math Teaching
Generates structured lecture content with alternating context and visual actions
"""
import os
import json
import asyncio
from typing import Dict, Any, List
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LectureService:
    """Service for generating structured lecture content with Claude"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.base_url = "https://api.anthropic.com/v1"
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 800
        
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is required")
    
    def generate_lecture(self, topic: str) -> Dict[str, Any]:
        """Generate a structured lecture for the given topic"""
        print(f"🎓 Starting lecture generation for topic: {topic}")
        
        system_prompt = self._build_lecture_system_prompt()
        user_prompt = self._build_lecture_user_prompt(topic)
        
        try:
            # Run async function synchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            response = loop.run_until_complete(self._make_request(system_prompt, user_prompt))
            result = self._parse_lecture_response(response)
            loop.close()
            
            print(f"✅ Lecture generated successfully: {len(result.get('lecture_segments', []))} segments")
            print(f"📚 Lecture content: {result}")
            return result
            
        except Exception as e:
            print(f"❌ Claude Lecture API error: {e}")
            fallback = self._create_fallback_lecture(topic)
            print(f"🔄 Using fallback lecture: {fallback}")
            return fallback
    
    def _build_lecture_system_prompt(self) -> str:
        """Build system prompt for lecture generation"""
        return """You are an expert mathematics professor delivering a concise, engaging lecture. Your goal is to teach a specific topic through alternating spoken content and visual demonstrations.

**STRICT OUTPUT FORMAT** - Respond ONLY with valid JSON:
```json
{
    "lecture_segments": [
        {
            "type": "context",
            "content": "Your spoken explanation as a professor (conversational, engaging)"
        },
        {
            "type": "action", 
            "content": "LaTeX equation or mathematical expression",
            "description": "Brief description of what you're writing"
        }
    ]
}
```

**REQUIREMENTS**:
- Total word count: 140-160 words across ALL segments
- Alternate between "context" (spoken) and "action" (visual LaTeX)
- Start with context, then action, then context, etc.
- 4-6 segments total
- Context: Natural professor speech, engaging and clear
- Action: Valid LaTeX for equations, formulas, or key concepts
- Keep explanations concise but pedagogically sound

**LaTeX EXAMPLES** (Keep SHORT and SIMPLE):
- Simple: `x^2 + 1 = 0`
- Fractions: `\\frac{dy}{dx} = 2x`
- Basic integrals: `\\int x dx`
- Functions: `f(x) = mx + b`

**LaTeX CONSTRAINTS** (VERY IMPORTANT):
- ONLY equations or 1-2 key mathematical words
- Maximum 10-15 characters per LaTeX expression
- Examples: `x^2`, `\frac{dy}{dx}`, `\int`, `\lim`, `f(x)`
- NO long expressions, NO complex formulas
- Focus on single essential concept per action segment

Focus on the most essential concepts for understanding the topic."""

    def _build_lecture_user_prompt(self, topic: str) -> str:
        """Build user prompt with the specific topic"""
        return f"""Generate a concise lecture for the topic: "{topic}"

Structure it as alternating context (spoken explanation) and action (LaTeX visual) segments. Make it engaging and pedagogically effective for a student learning this topic for the first time.

Remember: 
- Target 140-160 words total across all segments
- Start with context explaining what we'll learn
- Follow with TINY LaTeX snippets (equations or 1-2 key words only)
- Use only essential mathematical symbols: x^2, dy/dx, ∫, lim, etc.
- End with context summarizing the main insight

Topic: {topic}"""

    async def _make_request(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Make request to Claude API"""
        print(f"🔑 Using API key: {self.api_key[:10]}..." if self.api_key else "❌ No API key found")
        
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
            "temperature": 0.1
        }
        
        print(f"📡 Making request to Claude API with model: {self.model}")
        print(f"📝 Request payload: {json.dumps(payload, indent=2)}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/messages",
                json=payload,
                headers=headers
            ) as response:
                print(f"📊 Response status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Received successful response from Claude")
                    return data
                else:
                    error_text = await response.text()
                    print(f"❌ Claude API error {response.status}: {error_text}")
                    raise Exception(f"Claude API error {response.status}: {error_text}")

    def _parse_lecture_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude's lecture response"""
        try:
            print(f"🔍 Parsing Claude response: {response}")
            
            # Extract content from Claude's response format
            content = response.get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")
                print(f"📝 Raw Claude text content: {text_content}")
                
                # Try to parse as JSON
                try:
                    # Clean up potential markdown formatting
                    if text_content.startswith("```json"):
                        text_content = text_content.replace("```json", "").replace("```", "").strip()
                    
                    print(f"🧹 Cleaned content for JSON parsing: {text_content}")
                    parsed = json.loads(text_content)
                    print(f"✅ Successfully parsed JSON: {parsed}")
                    return self._validate_lecture_structure(parsed)
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON parsing error: {e}")
                    print(f"Raw content: {text_content[:500]}...")
                    return self._create_fallback_lecture("Unknown Topic")
            
            print("❌ No content found in Claude response")
            return self._create_fallback_lecture("Unknown Topic")
            
        except Exception as e:
            print(f"❌ Error parsing lecture response: {e}")
            return self._create_fallback_lecture("Unknown Topic")

    def _validate_lecture_structure(self, lecture_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean up lecture structure"""
        segments = lecture_data.get("lecture_segments", [])
        validated_segments = []
        
        for segment in segments:
            if isinstance(segment, dict) and "type" in segment and "content" in segment:
                segment_type = segment["type"]
                if segment_type in ["context", "action"]:
                    validated_segment = {
                        "type": segment_type,
                        "content": segment["content"]
                    }
                    if segment_type == "action" and "description" in segment:
                        validated_segment["description"] = segment["description"]
                    validated_segments.append(validated_segment)
        
        return {
            "lecture_segments": validated_segments,
            "total_segments": len(validated_segments)
        }

    def _create_fallback_lecture(self, topic: str) -> Dict[str, Any]:
        """Create fallback lecture when Claude API fails"""
        return {
            "lecture_segments": [
                {
                    "type": "context",
                    "content": f"Let's explore {topic}. This is a fundamental concept in mathematics."
                },
                {
                    "type": "action",
                    "content": "f(x) = x^2",
                    "description": "Basic function notation"
                },
                {
                    "type": "context", 
                    "content": "Understanding this concept will help you solve many mathematical problems."
                }
            ],
            "total_segments": 3
        }

# Global service instance
lecture_service = None

def get_lecture_service() -> LectureService:
    """Get or create the Lecture service instance"""
    global lecture_service
    if lecture_service is None:
        lecture_service = LectureService()
    return lecture_service

async def generate_topic_lecture(topic: str) -> Dict[str, Any]:
    """Main function for generating topic lectures"""
    service = get_lecture_service()
    return await service.generate_lecture(topic)