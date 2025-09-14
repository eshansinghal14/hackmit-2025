import requests
import json
import numpy as np
from skimage import morphology, measure
import cv2
from .ai_writing import latex_to_pixels

def draw_latex_to_tldraw(latex_text, start_x=100, start_y=100):
    """
    Draw LaTeX equation to tldraw using skeleton-based connected components with DFS traversal
    
    Args:
        latex_text: LaTeX string to render and draw
        start_x: X offset for drawing position
        start_y: Y offset for drawing position
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"🎨 Drawing LaTeX: {latex_text}")
    
    try:
        # Get pixel data and extract skeleton
        pixel_array = latex_to_pixels(latex_text, 2000)
        
        # Convert to binary and skeletonize
        binary = pixel_array < 128  # Black pixels (text)
        skeleton = morphology.skeletonize(binary)
        
        # Find connected components in skeleton
        labeled_skeleton = measure.label(skeleton, connectivity=2)
        components = []
        
        for region in measure.regionprops(labeled_skeleton):
            # Get all skeleton pixels for this component
            component_pixels = []
            for coord in region.coords:
                y, x = coord
                # Transform coordinates and add offset
                transformed_x = x + start_x
                transformed_y = y + start_y
                component_pixels.append((transformed_x, transformed_y))
            
            if len(component_pixels) > 1:  # Skip single pixels
                components.append(component_pixels)
        
        print(f"Found {len(components)} connected components")
        
        # Greedy ordering: start with leftmost, then greedily select closest
        sorted_components = _greedy_component_ordering(components)
        
        # Draw each component using DFS traversal
        all_drawing_paths = []
        for i, component in enumerate(sorted_components):
            print(f"Processing component {i+1}/{len(sorted_components)} with {len(component)} pixels")
            drawing_path = _dfs_drawing_path(component)
            all_drawing_paths.extend(drawing_path)
        
        print(f"Total drawing segments: {len(all_drawing_paths)}")
        success = _draw_connected_paths(all_drawing_paths)
        
        if success:
            print("✅ LaTeX drawing completed successfully!")
        else:
            print("❌ LaTeX drawing failed")
            
        return success
        
    except Exception as e:
        print(f"❌ Error drawing LaTeX: {e}")
        return False

def _get_component_center(component):
    """Get the center point of a component"""
    x_coords = [pixel[0] for pixel in component]
    y_coords = [pixel[1] for pixel in component]
    return (sum(x_coords) / len(x_coords), sum(y_coords) / len(y_coords))

def _distance(point1, point2):
    """Calculate Euclidean distance between two points"""
    return ((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2) ** 0.5

def _greedy_component_ordering(components):
    """Order components greedily: start with leftmost, then select closest"""
    if not components:
        return []
    
    # Find the leftmost component (by leftmost pixel)
    leftmost_component = min(components, key=lambda comp: min(pixel[0] for pixel in comp))
    
    ordered_components = [leftmost_component]
    remaining_components = [comp for comp in components if comp != leftmost_component]
    
    current_center = _get_component_center(leftmost_component)
    
    # Greedily select the closest remaining component
    while remaining_components:
        closest_component = min(remaining_components, 
                              key=lambda comp: _distance(current_center, _get_component_center(comp)))
        
        ordered_components.append(closest_component)
        remaining_components.remove(closest_component)
        current_center = _get_component_center(closest_component)
    
    return ordered_components

def _dfs_drawing_path(component_pixels):
    """
    Use DFS to create a natural drawing path through connected component
    
    Args:
        component_pixels: list of (x, y) pixel coordinates in the component
    
    Returns:
        list of line segments [[start, end], ...] representing drawing path
    """
    if len(component_pixels) < 2:
        return []
    
    # Create adjacency graph of neighboring pixels
    pixel_set = set(component_pixels)
    adjacency = {}
    
    for pixel in component_pixels:
        x, y = pixel
        neighbors = []
        # Check 8-connected neighbors
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                neighbor = (x + dx, y + dy)
                if neighbor in pixel_set:
                    neighbors.append(neighbor)
        adjacency[pixel] = neighbors
    
    # Find starting point (top-left most pixel)
    start_pixel = min(component_pixels, key=lambda p: (p[1], p[0]))
    
    # DFS traversal to create drawing path
    visited = set()
    drawing_segments = []
    
    def dfs(current_pixel, parent_pixel=None):
        if current_pixel in visited:
            return
        
        visited.add(current_pixel)
        
        # If we have a parent, draw line from parent to current
        if parent_pixel is not None:
            # Convert numpy int64 to regular Python int for JSON serialization
            parent_coords = [int(parent_pixel[0]), int(parent_pixel[1])]
            current_coords = [int(current_pixel[0]), int(current_pixel[1])]
            drawing_segments.append([parent_coords, current_coords])
        
        # Visit unvisited neighbors
        for neighbor in adjacency[current_pixel]:
            if neighbor not in visited:
                dfs(neighbor, current_pixel)
    
    # Start DFS from the top-left pixel
    dfs(start_pixel)
    
    # Handle any remaining unvisited pixels (disconnected parts)
    for pixel in component_pixels:
        if pixel not in visited:
            dfs(pixel)
    
    return drawing_segments

def _draw_connected_paths(drawing_segments):
    """
    Draw connected paths as line segments via FastAPI
    
    Args:
        drawing_segments: list of [start, end] coordinate pairs
    
    Returns:
        bool: True if successful, False otherwise
    """
    url = "http://localhost:8000/api/draw-line"
    
    # Use batch size of 700 segments
    batch_size = 700
    batches = [drawing_segments[i:i + batch_size] for i in range(0, len(drawing_segments), batch_size)]
    
    for batch_idx, batch in enumerate(batches):
        data = {"symbols": batch}
        
        try:
            response = requests.post(url, json=data)
            if response.status_code == 200:
                print(f"✅ Drew batch {batch_idx + 1}/{len(batches)}: {len(batch)} segments")
            else:
                print(f"❌ Error in batch {batch_idx + 1}: {response.json()}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ FastAPI server not running. Start with: python main.py")
            return False
        except Exception as e:
            print(f"❌ Error in batch {batch_idx + 1}: {e}")
            return False
    
    return True

def clear_tldraw():
    """Clear all drawings on tldraw"""
    try:
        response = requests.post("http://localhost:8000/api/clear")
        if response.status_code == 200:
            print("🧹 Cleared tldraw canvas")
            return True
        else:
            print("❌ Could not clear canvas")
            return False
    except Exception as e:
        print(f"❌ Could not clear canvas: {e}")
        return False
