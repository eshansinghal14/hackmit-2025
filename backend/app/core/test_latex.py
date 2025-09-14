#!/usr/bin/env python3
"""
Test script to draw x^2 in the middle of the screen
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from ai_drawing import draw_latex_to_tldraw, clear_tldraw

def test_latex_drawing():
    """Test drawing x^2 in the middle of the screen"""
    print("🧹 Clearing canvas first...")
    clear_tldraw()
    
    print("🎨 Drawing x^2 in the middle of the screen...")
    # Draw x^2 at coordinates (400, 300) - roughly middle of screen
    success = draw_latex_to_tldraw("x^2", 400, 300)
    
    if success:
        print("✅ Successfully drew x^2!")
        return True
    else:
        print("❌ Failed to draw x^2")
        return False

if __name__ == "__main__":
    test_latex_drawing()
