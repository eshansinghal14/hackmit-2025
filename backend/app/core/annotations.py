"""
Simplified AI Visual Annotations - Text (LaTeX) and Circling Only
Handles AI-driven visual interactions on the whiteboard
"""
import requests
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

@dataclass
class Point:
    """2D point for coordinates"""
    x: float
    y: float

class AnnotationType:
    """Types of visual annotations - simplified"""
    CIRCLE = "circle"
    TEXT = "text"
    LATEX = "latex"

class SimplifiedAnnotationManager:
    """Simplified manager for text (LaTeX) and circling annotations only"""
    
    def __init__(self):
        self.annotation_counter = 0
        
    def draw_circle(self, center_x: float, center_y: float, radius: float = 50) -> bool:
        """Draw a circle at specified coordinates using tldraw API"""
        try:
            url = "http://localhost:5001/api/draw-circle"
            data = {
                "center": {"x": center_x, "y": center_y},
                "radius": radius
            }
            
            response = requests.post(url, json=data)
            if response.status_code == 200:
                print(f"✅ Drew circle at ({center_x}, {center_y}) with radius {radius}")
                return True
            else:
                print(f"❌ Error drawing circle: {response.json()}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ Flask server not running. Start with: python flask_server.py")
            return False
        except Exception as e:
            print(f"❌ Error drawing circle: {e}")
            return False
    
    def _generate_id(self) -> str:
        """Generate unique annotation ID"""
        self.annotation_counter += 1
        return f"annotation_{self.annotation_counter}"


def process_claude_annotations(claude_output: Dict[str, Any]) -> bool:
    """
    Process JSON output from Claude and execute annotations
    
    Expected format:
    {
        "annotations": [
            {
                "type": "latex",
                "content": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
                "x": 100,
                "y": 200
            },
            {
                "type": "circle", 
                "x": 150,
                "y": 250,
                "radius": 30
            }
        ]
    }
    """
    from ai_drawing import draw_latex_to_tldraw
    
    manager = SimplifiedAnnotationManager()
    
    try:
        annotations = claude_output.get("annotations", [])
        success_count = 0
        
        for annotation in annotations:
            annotation_type = annotation.get("type")
            x = annotation.get("x", 100)
            y = annotation.get("y", 100)
            
            if annotation_type == "latex" or annotation_type == "text":
                content = annotation.get("content", "")
                if content:
                    success = draw_latex_to_tldraw(content, x, y)
                    if success:
                        success_count += 1
                        print(f"✅ Drew LaTeX: {content} at ({x}, {y})")
                    else:
                        print(f"❌ Failed to draw LaTeX: {content}")
            
            elif annotation_type == "circle":
                radius = annotation.get("radius", 50)
                success = manager.draw_circle(x, y, radius)
                if success:
                    success_count += 1
            
            else:
                print(f"⚠️ Unsupported annotation type: {annotation_type}")
        
        print(f"📋 Processed {len(annotations)} annotations, {success_count} successful")
        return success_count == len(annotations)
        
    except Exception as e:
        print(f"❌ Error processing Claude annotations: {e}")
        return False


def clear_all_annotations() -> bool:
    """Clear all annotations from tldraw"""
    from .ai_drawing import clear_tldraw
    return clear_tldraw()
