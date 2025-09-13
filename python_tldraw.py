import requests
import json
from ai_writing import extract_splines
from time import sleep

def draw_line(point1, point2, color="#000000", width=2):
    """
    Draw a line on tldraw via Flask API
    
    Args:
        point1: tuple (x, y) for start point
        point2: tuple (x, y) for end point
        color: hex color string (#ff0000, #0000ff, #00ff00, #000000)
        width: line thickness (1-6)
    """
    url = "http://localhost:5000/api/draw-line"
    
    data = {
        "point1": [int(point1[0]), int(point1[1])],
        "point2": [int(point2[0]), int(point2[1])],
        "color": color,
        "width": width
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print(f"✅ Drew line: {point1} → {point2} ({color})")
            return True
        else:
            print(f"❌ Error: {response.json()}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Flask server not running. Start with: python flask_server.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def clear_tldraw():
    """Clear all drawings on tldraw"""
    try:
        response = requests.post("http://localhost:5000/api/clear")
        if response.status_code == 200:
            print("🧹 Cleared tldraw canvas")
            return True
    except:
        print("❌ Could not clear canvas")
        return False

# Example usage
if __name__ == "__main__":
    print("🎨 Drawing on tldraw...")

    latex_text = r'\sum_{i=1}^n i = \frac{n(n+1)}{2}'
    splines = extract_splines(latex_text, 500)

    for spline in splines:
        for i in range(len(spline['original_segment']) - 1):
            print(spline['original_segment'][i], spline['original_segment'][i+1])
            draw_line(spline['original_segment'][i], spline['original_segment'][i+1], "#000000", 2)
    
    print("Done! Check your browser.")
