"""
AI Visual Annotations and Cursor Management
Handles AI-driven visual interactions on the whiteboard
"""
import asyncio
import random
import math
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class Point:
    """2D point for coordinates"""
    x: float
    y: float
    
    def distance_to(self, other: 'Point') -> float:
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2)

@dataclass
class Stroke:
    """Represents a drawing stroke for annotations"""
    points: List[Point]
    color: str = "#4CAF50"
    width: float = 2.0
    style: str = "solid"  # solid, dashed, dotted
    emphasis: float = 1.0  # 0.5 = subtle, 1.0 = normal, 1.5 = strong
    speed: str = "natural"  # slow, natural, fast

class AnnotationType:
    """Types of visual annotations"""
    HIGHLIGHT = "highlight"
    UNDERLINE = "underline"
    CIRCLE = "circle"
    ARROW = "arrow"
    BRACKET = "bracket"
    CROSS_OUT = "cross_out"
    DRAWING = "drawing"
    TEXT = "text"
    MATH = "math"

class VisualAnnotationManager:
    """Manages AI visual annotations on the whiteboard"""
    
    def __init__(self):
        self.active_annotations: List[Dict[str, Any]] = []
        self.annotation_counter = 0
        
    def create_highlight_annotation(self, 
                                  center: Point, 
                                  width: float = 100, 
                                  height: float = 30,
                                  color: str = "#FFEB3B80") -> Dict[str, Any]:
        """Create a highlight annotation"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.HIGHLIGHT,
            "center": {"x": center.x, "y": center.y},
            "width": width,
            "height": height,
            "color": color,
            "opacity": 0.5,
            "lifetimeMs": 4000,
            "animation": {
                "type": "fade_in",
                "duration": 500
            }
        }
    
    def create_circle_annotation(self, 
                               center: Point, 
                               radius: float = 50,
                               color: str = "#2196F3") -> Dict[str, Any]:
        """Create a circle annotation around an area"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.CIRCLE,
            "center": {"x": center.x, "y": center.y},
            "radius": radius,
            "color": color,
            "width": 2,
            "lifetimeMs": 5000,
            "animation": {
                "type": "draw_circle",
                "duration": 800,
                "easing": "ease_out"
            }
        }
    
    def create_arrow_annotation(self, 
                              start: Point, 
                              end: Point,
                              color: str = "#FF5722") -> Dict[str, Any]:
        """Create an arrow pointing from start to end"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.ARROW,
            "start": {"x": start.x, "y": start.y},
            "end": {"x": end.x, "y": end.y},
            "color": color,
            "width": 3,
            "arrowhead_size": 12,
            "lifetimeMs": 6000,
            "animation": {
                "type": "draw_arrow",
                "duration": 1000,
                "easing": "ease_in_out"
            }
        }
    
    def create_underline_annotation(self, 
                                   start: Point, 
                                   end: Point,
                                   color: str = "#4CAF50") -> Dict[str, Any]:
        """Create an underline annotation"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.UNDERLINE,
            "start": {"x": start.x, "y": start.y},
            "end": {"x": end.x, "y": end.y},
            "color": color,
            "width": 2,
            "style": "solid",
            "lifetimeMs": 4000,
            "animation": {
                "type": "draw_line",
                "duration": 600
            }
        }
    
    def create_bracket_annotation(self, 
                                top_left: Point, 
                                bottom_right: Point,
                                color: str = "#9C27B0") -> Dict[str, Any]:
        """Create bracket annotation around content"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.BRACKET,
            "top_left": {"x": top_left.x, "y": top_left.y},
            "bottom_right": {"x": bottom_right.x, "y": bottom_right.y},
            "color": color,
            "width": 2,
            "lifetimeMs": 5000,
            "animation": {
                "type": "draw_bracket",
                "duration": 1200
            }
        }
    
    def create_text_annotation(self, 
                             position: Point, 
                             text: str,
                             color: str = "#333333",
                             font_size: int = 16) -> Dict[str, Any]:
        """Create text annotation"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.TEXT,
            "position": {"x": position.x, "y": position.y},
            "text": text,
            "color": color,
            "font_size": font_size,
            "font_family": "Arial, sans-serif",
            "lifetimeMs": 8000,
            "animation": {
                "type": "type_text",
                "duration": len(text) * 50  # 50ms per character
            }
        }
    
    def create_math_annotation(self, 
                             position: Point, 
                             latex: str,
                             color: str = "#1976D2") -> Dict[str, Any]:
        """Create mathematical annotation with LaTeX"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.MATH,
            "position": {"x": position.x, "y": position.y},
            "latex": latex,
            "color": color,
            "font_size": 18,
            "lifetimeMs": 10000,
            "animation": {
                "type": "fade_in",
                "duration": 800
            }
        }
    
    def create_cross_out_annotation(self, 
                                  top_left: Point, 
                                  bottom_right: Point,
                                  color: str = "#F44336") -> Dict[str, Any]:
        """Create cross-out annotation to mark errors"""
        return {
            "id": self._generate_id(),
            "type": AnnotationType.CROSS_OUT,
            "top_left": {"x": top_left.x, "y": top_left.y},
            "bottom_right": {"x": bottom_right.x, "y": bottom_right.y},
            "color": color,
            "width": 3,
            "lifetimeMs": 6000,
            "animation": {
                "type": "draw_x",
                "duration": 800
            }
        }
    
    def _generate_id(self) -> str:
        """Generate unique annotation ID"""
        self.annotation_counter += 1
        return f"annotation_{self.annotation_counter}"

class CursorMovementManager:
    """Manages AI cursor movement with natural animations"""
    
    def __init__(self):
        self.current_position = Point(100, 100)
        self.movement_speed = 300  # pixels per second
        
    def create_cursor_move(self, 
                          target: Point, 
                          speed: str = "natural",
                          style: str = "glow") -> Dict[str, Any]:
        """Create cursor movement animation"""
        distance = self.current_position.distance_to(target)
        
        # Calculate duration based on speed
        speed_multipliers = {
            "slow": 0.5,
            "natural": 1.0,
            "fast": 2.0,
            "instant": 10.0
        }
        
        duration = (distance / self.movement_speed) / speed_multipliers.get(speed, 1.0)
        duration = max(0.1, min(3.0, duration))  # Clamp between 0.1s and 3s
        
        self.current_position = target
        
        return {
            "type": "ai_cursor_move",
            "target": {"x": target.x, "y": target.y},
            "duration": duration * 1000,  # Convert to milliseconds
            "speed": speed,
            "style": style,
            "easing": "ease_out" if speed == "natural" else "linear"
        }
    
    def create_cursor_path(self, 
                          waypoints: List[Point], 
                          speed: str = "natural") -> List[Dict[str, Any]]:
        """Create a series of cursor movements along waypoints"""
        movements = []
        
        for waypoint in waypoints:
            movement = self.create_cursor_move(waypoint, speed)
            movements.append(movement)
        
        return movements

class AnnotationOrchestrator:
    """Orchestrates complex annotation sequences"""
    
    def __init__(self):
        self.visual_manager = VisualAnnotationManager()
        self.cursor_manager = CursorMovementManager()
    
    async def highlight_and_explain(self, 
                                  websocket, 
                                  center: Point, 
                                  explanation: str,
                                  highlight_size: Tuple[float, float] = (120, 40)) -> None:
        """Highlight an area and show explanation"""
        # Move cursor to position
        cursor_move = self.cursor_manager.create_cursor_move(
            Point(center.x - 60, center.y - 20)
        )
        await websocket.send_json(cursor_move)
        await asyncio.sleep(cursor_move["duration"] / 1000)
        
        # Create highlight
        highlight = self.visual_manager.create_highlight_annotation(
            center, 
            width=highlight_size[0], 
            height=highlight_size[1]
        )
        await websocket.send_json({"type": "annotation", **highlight})
        
        # Add text explanation
        text_pos = Point(center.x + highlight_size[0]/2 + 10, center.y)
        text_annotation = self.visual_manager.create_text_annotation(
            text_pos, 
            explanation
        )
        await websocket.send_json({"type": "annotation", **text_annotation})
    
    async def circle_and_point(self, 
                             websocket, 
                             target: Point, 
                             radius: float = 60) -> None:
        """Circle an area and point to it with cursor"""
        # Move cursor near the target
        approach_point = Point(
            target.x - radius - 20,
            target.y - radius - 20
        )
        cursor_move = self.cursor_manager.create_cursor_move(approach_point)
        await websocket.send_json(cursor_move)
        await asyncio.sleep(cursor_move["duration"] / 1000)
        
        # Draw circle
        circle = self.visual_manager.create_circle_annotation(target, radius)
        await websocket.send_json({"type": "annotation", **circle})
        
        # Move cursor to center
        await asyncio.sleep(0.5)  # Wait for circle to start drawing
        center_move = self.cursor_manager.create_cursor_move(target)
        await websocket.send_json(center_move)
    
    async def show_step_by_step(self, 
                              websocket, 
                              steps: List[Tuple[Point, str]]) -> None:
        """Show a sequence of steps with annotations"""
        for i, (position, text) in enumerate(steps):
            # Move cursor to position
            cursor_move = self.cursor_manager.create_cursor_move(position)
            await websocket.send_json(cursor_move)
            await asyncio.sleep(cursor_move["duration"] / 1000)
            
            # Add step number
            step_text = f"{i+1}. {text}"
            text_annotation = self.visual_manager.create_text_annotation(
                Point(position.x + 20, position.y),
                step_text,
                color="#1976D2"
            )
            await websocket.send_json({"type": "annotation", **text_annotation})
            
            # Brief pause before next step
            await asyncio.sleep(1.5)
    
    async def mark_error_and_correct(self, 
                                   websocket, 
                                   error_area: Tuple[Point, Point], 
                                   correction_pos: Point, 
                                   correction: str) -> None:
        """Mark an error and show correction"""
        # Move cursor to error
        cursor_move = self.cursor_manager.create_cursor_move(error_area[0])
        await websocket.send_json(cursor_move)
        await asyncio.sleep(cursor_move["duration"] / 1000)
        
        # Cross out error
        cross_out = self.visual_manager.create_cross_out_annotation(
            error_area[0], 
            error_area[1]
        )
        await websocket.send_json({"type": "annotation", **cross_out})
        
        # Wait for cross-out animation
        await asyncio.sleep(1.0)
        
        # Move to correction position
        correction_move = self.cursor_manager.create_cursor_move(correction_pos)
        await websocket.send_json(correction_move)
        await asyncio.sleep(correction_move["duration"] / 1000)
        
        # Show correction
        correction_annotation = self.visual_manager.create_text_annotation(
            correction_pos,
            correction,
            color="#4CAF50"
        )
        await websocket.send_json({"type": "annotation", **correction_annotation})

# Global orchestrator instance
annotation_orchestrator = AnnotationOrchestrator()

async def animate_annotation(websocket, annotation_data: Dict[str, Any]):
    """Animate a single annotation"""
    await websocket.send_json({
        "type": "annotation",
        **annotation_data
    })

async def realize_tutor_plan(websocket, state, plan: Dict[str, Any]):
    """Execute a tutoring plan with speech and visual annotations"""
    # Send speech/text if provided
    if "say" in plan:
        await websocket.send_json({
            "type": "subtitle",
            "text": plan["say"],
            "mode": plan.get("mode", "hint"),
            "ttlMs": plan.get("duration", 5000)
        })
    
    # Execute visual annotations if provided
    if "annotations" in plan:
        for annotation in plan["annotations"]:
            await animate_annotation(websocket, annotation)
            # Small delay between annotations
            await asyncio.sleep(0.2)
    
    # Execute cursor movements if provided
    if "cursor_moves" in plan:
        for cursor_move in plan["cursor_moves"]:
            await websocket.send_json({
                "type": "ai_cursor_move",
                **cursor_move
            })
            await asyncio.sleep(cursor_move.get("duration", 500) / 1000)
    
    # Execute complex orchestrated actions
    if "orchestration" in plan:
        orchestration = plan["orchestration"]
        action_type = orchestration.get("type")
        
        if action_type == "highlight_and_explain":
            await annotation_orchestrator.highlight_and_explain(
                websocket,
                Point(**orchestration["center"]),
                orchestration["explanation"]
            )
        elif action_type == "circle_and_point":
            await annotation_orchestrator.circle_and_point(
                websocket,
                Point(**orchestration["target"])
            )
        elif action_type == "mark_error_and_correct":
            await annotation_orchestrator.mark_error_and_correct(
                websocket,
                (Point(**orchestration["error_start"]), Point(**orchestration["error_end"])),
                Point(**orchestration["correction_pos"]),
                orchestration["correction_text"]
            )

def create_simple_hint_plan(hint_text: str, position: Optional[Point] = None) -> Dict[str, Any]:
    """Create a simple tutoring plan with just a hint"""
    plan = {
        "say": hint_text,
        "mode": "hint",
        "duration": 4000
    }
    
    if position:
        plan["cursor_moves"] = [
            annotation_orchestrator.cursor_manager.create_cursor_move(position)
        ]
    
    return plan

def create_correction_plan(error_text: str, 
                         correction_text: str,
                         error_position: Optional[Tuple[Point, Point]] = None) -> Dict[str, Any]:
    """Create a plan for correcting an error"""
    plan = {
        "say": f"Let me help you fix this: {correction_text}",
        "mode": "correction",
        "duration": 6000
    }
    
    if error_position:
        plan["orchestration"] = {
            "type": "mark_error_and_correct",
            "error_start": {"x": error_position[0].x, "y": error_position[0].y},
            "error_end": {"x": error_position[1].x, "y": error_position[1].y},
            "correction_pos": {"x": error_position[1].x + 50, "y": error_position[1].y},
            "correction_text": correction_text
        }
    
    return plan
