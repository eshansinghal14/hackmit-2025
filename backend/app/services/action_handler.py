"""
AI Action Handler Service
Processes and executes AI drawing actions (LaTeX and circle drawing)
"""
import asyncio
from typing import Dict, Any, List, Tuple
from ..core.ai_drawing import draw_latex_to_tldraw
import json
import time
import requests

class ActionHandlerService:
    """Service for handling AI drawing actions"""
    
    def __init__(self):
        self.api_base_url = "http://localhost:8000"
    
    async def process_actions(self, actions: List[Dict[str, Any]], screen_width: int = 1920, screen_height: int = 1080) -> bool:
        """
        Process a list of AI actions
        
        Args:
            actions: List of action dictionaries with action_type, position, content
            screen_width: User's screen width in pixels
            screen_height: User's screen height in pixels
            
        Returns:
            bool: True if all actions processed successfully
        """
        if not actions:
            return True
            
        success = True
        for action in actions:
            try:
                action_type = action.get("action_type")
                position = action.get("position", [0.5, 0.5])  # Default center
                content = action.get("content", "")
                
                # Convert proportional position to pixel coordinates
                pixel_x, pixel_y = self._proportional_to_pixels(position, screen_width, screen_height)
                
                if action_type == "latex":
                    success &= await self._handle_latex_action(content, pixel_x, pixel_y)
                elif action_type == "circle":
                    success &= await self._handle_circle_action(pixel_x, pixel_y)
                else:
                    print(f"⚠️ Unknown action type: {action_type}")
                    success = False
                    
            except Exception as e:
                print(f"❌ Error processing action: {e}")
                success = False
                
        return success
    
    def _proportional_to_pixels(self, position: List[float], screen_width: int, screen_height: int) -> Tuple[int, int]:
        """
        Convert proportional position (0-1) to pixel coordinates
        
        Args:
            position: [x_proportion, y_proportion] where 0.0-1.0
            screen_width: Screen width in pixels
            screen_height: Screen height in pixels
            
        Returns:
            Tuple of (pixel_x, pixel_y)
        """
        if len(position) != 2:
            position = [0.5, 0.5]  # Default to center
            
        x_prop, y_prop = position
        
        # Clamp to valid range
        x_prop = max(0.0, min(1.0, x_prop))
        y_prop = max(0.0, min(1.0, y_prop))
        
        # Convert to pixels (leave some margin)
        margin_x = screen_width * 0.05  # 5% margin
        margin_y = screen_height * 0.05  # 5% margin
        
        usable_width = screen_width - (2 * margin_x)
        usable_height = screen_height - (2 * margin_y)
        
        pixel_x = int(margin_x + (x_prop * usable_width))
        pixel_y = int(margin_y + (y_prop * usable_height))
        
        return pixel_x, pixel_y
    
    async def _handle_latex_action(self, latex_content: str, x: int, y: int) -> bool:
        """
        Handle LaTeX drawing action
        
        Args:
            latex_content: LaTeX expression to draw
            x: X coordinate in pixels
            y: Y coordinate in pixels
            
        Returns:
            bool: True if successful
        """
        try:
            print(f"🔤 Drawing LaTeX '{latex_content}' at ({x}, {y})")
            
            # Use the existing LaTeX drawing function
            success = draw_latex_to_tldraw(latex_content, x, y)
            
            if success:
                print(f"✅ LaTeX action completed successfully")
            else:
                print(f"❌ LaTeX action failed")
                
            return success
            
        except Exception as e:
            print(f"❌ Error in LaTeX action: {e}")
            return False
    
    async def _handle_circle_action(self, x: int, y: int, radius: int = 50) -> bool:
        """
        Handle circle drawing action (hand-drawn style)
        
        Args:
            x: Center X coordinate in pixels
            y: Center Y coordinate in pixels
            radius: Circle radius in pixels
            
        Returns:
            bool: True if successful
        """
        try:
            print(f"⭕ Drawing hand-drawn circle at ({x}, {y}) with radius {radius}")
            
            # Generate hand-drawn circle points
            circle_segments = self._generate_hand_drawn_circle(x, y, radius)
            
            # Send drawing commands
            success = await self._send_drawing_commands(circle_segments)
            
            if success:
                print(f"✅ Circle action completed successfully")
            else:
                print(f"❌ Circle action failed")
                
            return success
            
        except Exception as e:
            print(f"❌ Error in circle action: {e}")
            return False
    
    def _generate_hand_drawn_circle(self, center_x: int, center_y: int, radius: int) -> List[List[List[int]]]:
        """
        Generate points for a hand-drawn style circle
        
        Args:
            center_x: Circle center X
            center_y: Circle center Y  
            radius: Circle radius
            
        Returns:
            List of line segments [[start, end], ...]
        """
        import math
        import random
        
        segments = []
        num_points = 32  # Number of points around the circle
        
        # Add some randomness for hand-drawn effect
        angle_jitter = 0.1  # Small random angle variation
        radius_jitter = radius * 0.05  # Small radius variation
        
        previous_point = None
        
        # Generate points around circle with slight variations
        for i in range(num_points + 1):  # +1 to close the circle
            angle = (2 * math.pi * i) / num_points
            
            # Add jitter for hand-drawn effect
            jittered_angle = angle + random.uniform(-angle_jitter, angle_jitter)
            jittered_radius = radius + random.uniform(-radius_jitter, radius_jitter)
            
            # Calculate point on circle
            x = int(center_x + jittered_radius * math.cos(jittered_angle))
            y = int(center_y + jittered_radius * math.sin(jittered_angle))
            
            current_point = [x, y]
            
            # Create line segment from previous point
            if previous_point is not None:
                segments.append([previous_point, current_point])
                
            previous_point = current_point
        
        return segments
    
    async def _send_drawing_commands(self, segments: List[List[List[int]]]) -> bool:
        """
        Send drawing commands to the API
        
        Args:
            segments: List of line segments to draw
            
        Returns:
            bool: True if successful
        """
        try:
            url = f"{self.api_base_url}/api/draw-line"
            data = {"symbols": segments}
            
            response = requests.post(url, json=data)
            
            if response.status_code == 200:
                return True
            else:
                print(f"❌ API error: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error sending drawing commands: {e}")
            return False

# Global service instance
action_handler_service = None

def get_action_handler() -> ActionHandlerService:
    """Get or create the action handler service instance"""
    global action_handler_service
    if action_handler_service is None:
        action_handler_service = ActionHandlerService()
    return action_handler_service

async def process_ai_actions(actions: List[Dict[str, Any]], screen_width: int = 1920, screen_height: int = 1080) -> bool:
    """Main function to process AI actions"""
    handler = get_action_handler()
    return await handler.process_actions(actions, screen_width, screen_height)
