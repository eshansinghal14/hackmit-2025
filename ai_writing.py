import matplotlib.pyplot as plt
import io
from PIL import Image
import numpy as np
import cv2
from skimage import morphology, measure
import networkx as nx
from scipy.interpolate import splprep, splev, interp1d

def latex_to_pixels(latex_text, width_pixels, dpi=100, background='white', text_color='black'):
    """Convert LaTeX text to pixel array"""
    fig = plt.figure(figsize=(10, 2), dpi=dpi)
    ax = fig.add_subplot(111)
    
    if not latex_text.startswith('$'):
        latex_text = f'${latex_text}$'
    
    text_obj = ax.text(0.5, 0.5, latex_text, 
                      transform=ax.transAxes,
                      fontsize=20,
                      ha='center', va='center',
                      color=text_color)
    
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    
    if background == 'transparent':
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)
    else:
        fig.patch.set_facecolor(background)
        ax.patch.set_facecolor(background)
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', 
                pad_inches=0.1, dpi=dpi, 
                facecolor=background if background != 'transparent' else 'none',
                transparent=(background == 'transparent'))
    buf.seek(0)
    plt.close(fig)
    
    img = Image.open(buf)
    original_width = img.width
    scale_factor = width_pixels / original_width if original_width > width_pixels else 1.0
    
    if scale_factor < 1.0:
        new_width = width_pixels
        new_height = int(img.height * scale_factor)
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    img_array = np.array(img)
    if len(img_array.shape) == 3:
        if img_array.shape[2] == 4:  # RGBA
            rgb = img_array[:,:,:3]
            alpha = img_array[:,:,3] / 255.0
            grayscale = np.dot(rgb, [0.299, 0.587, 0.114])
            grayscale = grayscale * alpha + 255 * (1 - alpha)
        else:  # RGB
            grayscale = np.dot(img_array, [0.299, 0.587, 0.114])
    else:
        grayscale = img_array
    
    return grayscale.astype(np.uint8)

def extract_skeleton(binary_img):
    """Extract the skeleton (centerline) of text strokes"""
    # Ensure binary (0 and 1)
    binary = (binary_img < 128).astype(np.uint8)
    
    # Clean up the image
    kernel = np.ones((2,2), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    # Skeletonize to get centerlines
    skeleton = morphology.skeletonize(binary)
    
    return skeleton.astype(np.uint8)

def order_coordinates_along_path(coords):
    """Order coordinates along the stroke path using graph traversal"""
    if len(coords) <= 2:
        return coords
    
    # Create graph where each coordinate is a node
    G = nx.Graph()
    
    # Add all coordinates as nodes
    for i, coord in enumerate(coords):
        G.add_node(i, pos=coord)
    
    # Connect adjacent pixels (8-connectivity)
    for i, coord1 in enumerate(coords):
        for j, coord2 in enumerate(coords[i+1:], i+1):
            # Check if pixels are adjacent (distance <= sqrt(2))
            dist = np.linalg.norm(coord1 - coord2)
            if dist <= 1.42:  # sqrt(2) for diagonal adjacency
                G.add_edge(i, j)
    
    # Find endpoints (nodes with degree 1)
    endpoints = [node for node, degree in G.degree() if degree == 1]
    
    if len(endpoints) >= 2:
        # Trace path from one endpoint to another
        start = endpoints[0]
        path = nx.shortest_path(G, start, endpoints[1])
    else:
        # Handle loops or single points
        start = list(G.nodes())[0]
        path = list(nx.dfs_preorder_nodes(G, start))
    
    # Return coordinates in path order
    return np.array([coords[i] for i in path])

def extract_strokes(skeleton):
    # Find junction points (pixels with >2 neighbors)
    kernel = np.ones((3,3), np.uint8)
    neighbors = cv2.filter2D(skeleton.astype(np.uint8), -1, kernel)
    junctions = (neighbors > 3) & (skeleton > 0)
    
    # Remove junctions temporarily to split strokes
    skeleton_no_junctions = skeleton.copy()
    skeleton_no_junctions[junctions] = 0
    
    # Find connected components (individual stroke segments)
    labeled = measure.label(skeleton_no_junctions)
    segments = []
    
    for region in measure.regionprops(labeled):
        coords = region.coords
        # Order coordinates along the stroke path
        ordered_coords = order_coordinates_along_path(coords)
        segments.append(ordered_coords)
    
    return segments, junctions

def segment_to_spline(segment):
    """Convert a segment (array of points) to a spline function"""
    if len(segment) < 3:
        # For very short segments, use linear interpolation
        def linear_spline(t):
            t = np.clip(t, 0, 1)
            if len(segment) == 1:
                return segment[0]
            # Linear interpolation between points
            idx = t * (len(segment) - 1)
            i = int(np.floor(idx))
            frac = idx - i
            if i >= len(segment) - 1:
                return segment[-1]
            return segment[i] * (1 - frac) + segment[i + 1] * frac
        
        return linear_spline, 1.0  # Return function and length
    
    # Use scipy spline interpolation for smooth curves
    try:
        # Fit parametric spline to the points
        x = segment[:, 0]
        y = segment[:, 1]
        
        # Create parametric spline
        tck, u = splprep([x, y], s=1.0, k=min(3, len(segment)-1))
        
        # Calculate approximate arc length
        u_fine = np.linspace(0, 1, len(segment) * 5)
        fine_points = np.array(splev(u_fine, tck)).T
        distances = np.linalg.norm(np.diff(fine_points, axis=0), axis=1)
        arc_length = np.sum(distances)
        
        def spline_func(t):
            """Evaluate spline at parameter t (0 to 1)"""
            t = np.clip(t, 0, 1)
            return np.array(splev(t, tck)).T
        
        return spline_func, arc_length
        
    except Exception as e:
        # Fallback to linear interpolation if spline fitting fails
        print(f"Spline fitting failed: {e}, using linear interpolation")
        return segment_to_spline(segment)  # Recursive call to linear case

def segments_to_splines(segments):
    """Convert all segments to spline functions"""
    splines = []
    
    for i, segment in enumerate(segments):
        spline_func, length = segment_to_spline(segment)
        splines.append({
            'function': spline_func,
            'length': length,
            'original_segment': segment,
            'index': i
        })
    
    return splines

def order_splines_left_to_right(splines):
    """Order splines greedily from left to right, top to bottom"""
    
    def get_spline_bounds(spline_info):
        """Get bounding box of a spline"""
        segment = spline_info['original_segment']
        min_x = np.min(segment[:, 0])
        max_x = np.max(segment[:, 0])
        min_y = np.min(segment[:, 1])
        max_y = np.max(segment[:, 1])
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        
        return {
            'min_x': min_x, 'max_x': max_x,
            'min_y': min_y, 'max_y': max_y,
            'center_x': center_x, 'center_y': center_y
        }
    
    # Calculate bounds for each spline
    spline_bounds = []
    for spline in splines:
        bounds = get_spline_bounds(spline)
        spline_bounds.append((spline, bounds))
    
    # Sort by reading order: primarily by y (top to bottom), then by x (left to right)
    # Use center points for sorting
    def reading_order_key(spline_bound_pair):
        spline, bounds = spline_bound_pair
        # Weight y more heavily than x for reading order
        return (bounds['center_y'], bounds['center_x'])
    
    sorted_splines = sorted(spline_bounds, key=reading_order_key)
    
    # Extract just the splines from the sorted pairs
    return [spline for spline, bounds in sorted_splines]

def visualize_splines(splines, original_img=None, title="Spline Visualization", show_order=True):
    """Visualize splines with multiple display options"""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Plot 1: Original segments (skeleton points)
    ax1 = axes[0]
    if original_img is not None:
        ax1.imshow(original_img, cmap='gray', alpha=0.3)
    
    colors = plt.cm.tab10(np.linspace(0, 1, len(splines)))
    for i, spline in enumerate(splines):
        segment = spline['original_segment']
        ax1.scatter(segment[:, 1], segment[:, 0], c=[colors[i]], s=10, alpha=0.7)
        if show_order:
            # Add spline number at center
            center_y = np.mean(segment[:, 0])
            center_x = np.mean(segment[:, 1])
            ax1.text(center_x, center_y, str(i), fontsize=12, 
                    bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.8))
    
    ax1.set_title('Original Segments')
    ax1.invert_yaxis()
    ax1.set_aspect('equal')
    
    # Plot 2: Smooth splines
    ax2 = axes[1]
    if original_img is not None:
        ax2.imshow(original_img, cmap='gray', alpha=0.3)
    
    for i, spline in enumerate(splines):
        # Sample points along the spline
        t_values = np.linspace(0, 1, 100)
        try:
            spline_points = np.array([spline['function'](t) for t in t_values])
            ax2.plot(spline_points[:, 1], spline_points[:, 0], 
                    color=colors[i], linewidth=2, alpha=0.8)
            if show_order:
                # Add spline number at start
                start_point = spline['function'](0)
                ax2.text(start_point[1], start_point[0], str(i), fontsize=12,
                        bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.8))
        except Exception as e:
            print(f"Error plotting spline {i}: {e}")
            # Fallback to original segment
            segment = spline['original_segment']
            ax2.plot(segment[:, 1], segment[:, 0], color=colors[i], linewidth=2, alpha=0.8)
    
    ax2.set_title('Smooth Splines')
    ax2.invert_yaxis()
    ax2.set_aspect('equal')
    
    # Plot 3: Spline order visualization
    ax3 = axes[2]
    if original_img is not None:
        ax3.imshow(original_img, cmap='gray', alpha=0.3)
    
    # Draw splines with arrows showing order
    for i, spline in enumerate(splines):
        try:
            # Sample fewer points for cleaner arrow visualization
            t_values = np.linspace(0, 1, 20)
            spline_points = np.array([spline['function'](t) for t in t_values])
            
            # Plot the spline
            ax3.plot(spline_points[:, 1], spline_points[:, 0], 
                    color=colors[i], linewidth=3, alpha=0.8, label=f'Spline {i}')
            
            # Add arrow at the end to show direction
            if len(spline_points) > 1:
                end_point = spline_points[-1]
                second_last = spline_points[-2]
                dx = end_point[1] - second_last[1]
                dy = end_point[0] - second_last[0]
                ax3.arrow(second_last[1], second_last[0], dx, dy, 
                         head_width=3, head_length=3, fc=colors[i], ec=colors[i])
            
            # Add order number at start
            start_point = spline['function'](0)
            ax3.text(start_point[1], start_point[0], str(i), fontsize=14, 
                    fontweight='bold', color='red',
                    bbox=dict(boxstyle="circle,pad=0.3", facecolor='yellow', alpha=0.9))
                    
        except Exception as e:
            print(f"Error plotting ordered spline {i}: {e}")
    
    ax3.set_title('Spline Order (Red numbers show sequence)')
    ax3.invert_yaxis()
    ax3.set_aspect('equal')
    
    plt.tight_layout()
    plt.suptitle(title, fontsize=16, y=1.02)
    return fig

def interactive_spline_viewer(splines, original_img=None):
    """Create an interactive viewer for individual splines"""
    def plot_single_spline(spline_idx):
        if spline_idx >= len(splines):
            print(f"Spline index {spline_idx} out of range. Max index: {len(splines)-1}")
            return
            
        spline = splines[spline_idx]
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Original segment
        segment = spline['original_segment']
        ax1.scatter(segment[:, 1], segment[:, 0], c='red', s=20)
        ax1.plot(segment[:, 1], segment[:, 0], 'r-', alpha=0.5)
        if original_img is not None:
            ax1.imshow(original_img, cmap='gray', alpha=0.3)
        ax1.set_title(f'Spline {spline_idx} - Original Segment')
        ax1.invert_yaxis()
        ax1.set_aspect('equal')
        
        # Smooth spline
        try:
            t_values = np.linspace(0, 1, 200)
            spline_points = np.array([spline['function'](t) for t in t_values])
            ax2.plot(spline_points[:, 1], spline_points[:, 0], 'b-', linewidth=3)
            ax2.scatter([spline_points[0, 1]], [spline_points[0, 0]], c='green', s=100, label='Start')
            ax2.scatter([spline_points[-1, 1]], [spline_points[-1, 0]], c='red', s=100, label='End')
        except Exception as e:
            print(f"Error with spline function: {e}")
            ax2.plot(segment[:, 1], segment[:, 0], 'b-', linewidth=3)
            
        if original_img is not None:
            ax2.imshow(original_img, cmap='gray', alpha=0.3)
        ax2.set_title(f'Spline {spline_idx} - Smooth Curve (Length: {spline["length"]:.2f})')
        ax2.legend()
        ax2.invert_yaxis()
        ax2.set_aspect('equal')
        
        plt.tight_layout()
        plt.show()
        
    return plot_single_spline

if __name__ == '__main__':
    # Generate LaTeX image and extract splines
    latex_text = r'\sum_{i=1}^n i = \frac{n(n+1)}{2}'
    img = latex_to_pixels(latex_text, 1000)
    skeleton = extract_skeleton(img)
    strokes, junctions = extract_strokes(skeleton)
    splines = segments_to_splines(strokes)
    ordered_splines = order_splines_left_to_right(splines)
    
    print(f"Extracted {len(ordered_splines)} splines from LaTeX: {latex_text}")
    
    # Visualize all splines
    fig = visualize_splines(ordered_splines, img, 
                           title=f"Splines for: {latex_text}")
    plt.show()
    
    # Create interactive viewer function
    view_spline = interactive_spline_viewer(ordered_splines, img)
    
    # Example: view individual splines
    print("\nTo view individual splines, call:")
    print("view_spline(0)  # View first spline")
    print("view_spline(1)  # View second spline")
    print("etc.")
    
    # Show first few splines as examples
    for i in range(min(15, len(ordered_splines))):
        view_spline(i)