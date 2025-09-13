import React, { useRef, useEffect, useState, useCallback } from 'react';

// Spline utility functions
const createSpline = (points) => {
  if (points.length < 2) return null;
  
  // Calculate control points for smooth curves
  const controlPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      controlPoints.push({ cp1: null, cp2: null });
    } else {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const tension = 0.3;
      const cp1x = curr.x - tension * (next.x - prev.x);
      const cp1y = curr.y - tension * (next.y - prev.y);
      const cp2x = curr.x + tension * (next.x - prev.x);
      const cp2y = curr.y + tension * (next.y - prev.y);
      
      controlPoints.push({
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y }
      });
    }
  }
  
  return { points, controlPoints };
};

const getSplinePoint = (spline, t) => {
  if (!spline || spline.points.length < 2) return null;
  
  const { points } = spline;
  const segmentLength = 1 / (points.length - 1);
  const segmentIndex = Math.min(Math.floor(t / segmentLength), points.length - 2);
  const localT = (t - segmentIndex * segmentLength) / segmentLength;
  
  const p0 = points[segmentIndex];
  const p1 = points[segmentIndex + 1];
  
  // Linear interpolation for simplicity (can be enhanced with Bezier curves)
  return {
    x: p0.x + (p1.x - p0.x) * localT,
    y: p0.y + (p1.y - p0.y) * localT
  };
};

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [paths, setPaths] = useState([]);
  const [splines, setSplines] = useState([]);
  const [tool, setTool] = useState('draw'); // 'draw', 'erase', 'spline'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [splineColor, setSplineColor] = useState('#ff0000');
  const [splineWidth, setSplineWidth] = useState(2);
  const [animationDuration, setAnimationDuration] = useState(2000);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animation state
  const animationRef = useRef(null);
  const [selectedSpline, setSelectedSpline] = useState(null);

  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e) => {
    if (tool === 'spline') return;
    
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setCurrentPath([coords]);
  }, [tool, getCanvasCoordinates]);

  const draw = useCallback((e) => {
    if (!isDrawing || tool === 'spline') return;

    const coords = getCanvasCoordinates(e);
    setCurrentPath(prev => [...prev, coords]);
  }, [isDrawing, tool, getCanvasCoordinates]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing || tool === 'spline') return;

    setIsDrawing(false);
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, {
        points: currentPath,
        color: strokeColor,
        width: strokeWidth,
        tool: tool
      }]);
    }
    setCurrentPath([]);
  }, [isDrawing, currentPath, strokeColor, strokeWidth, tool]);

  const handleSplineClick = useCallback((e) => {
    if (tool !== 'spline') return;

    const coords = getCanvasCoordinates(e);
    
    if (selectedSpline === null) {
      // Start new spline
      setSelectedSpline({ points: [coords], id: Date.now() });
    } else {
      // Add point to current spline
      const updatedSpline = {
        ...selectedSpline,
        points: [...selectedSpline.points, coords]
      };
      setSelectedSpline(updatedSpline);
    }
  }, [tool, getCanvasCoordinates, selectedSpline]);

  const finishSpline = useCallback(() => {
    if (selectedSpline && selectedSpline.points.length >= 2) {
      const spline = createSpline(selectedSpline.points);
      if (spline) {
        setSplines(prev => [...prev, {
          ...spline,
          id: selectedSpline.id,
          color: splineColor,
          width: splineWidth,
          duration: animationDuration
        }]);
      }
    }
    setSelectedSpline(null);
  }, [selectedSpline, splineColor, splineWidth, animationDuration]);

  const animateSpline = useCallback((splineId) => {
    const spline = splines.find(s => s.id === splineId);
    if (!spline || isAnimating) return;

    setIsAnimating(true);
    setAnimationProgress(0);
    
    const startTime = Date.now();
    const duration = spline.duration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setAnimationProgress(0);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [splines, isAnimating]);

  const clearCanvas = useCallback(() => {
    setPaths([]);
    setSplines([]);
    setSelectedSpline(null);
    setIsAnimating(false);
    setAnimationProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const drawPath = useCallback((ctx, path) => {
    if (path.points.length < 2) return;

    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const drawSpline = useCallback((ctx, spline, animationT = 1) => {
    if (!spline || spline.points.length < 2) return;

    ctx.strokeStyle = spline.color;
    ctx.lineWidth = spline.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const totalPoints = Math.floor(animationT * 100);
    
    ctx.beginPath();
    
    for (let i = 0; i <= totalPoints; i++) {
      const t = i / 100;
      const point = getSplinePoint(spline, t);
      
      if (point) {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
    }
    
    ctx.stroke();

    // Draw control points for selected spline
    if (animationT === 1) {
      ctx.fillStyle = spline.color;
      spline.points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw point numbers
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(index.toString(), point.x, point.y + 4);
        ctx.fillStyle = spline.color;
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all paths
    paths.forEach(path => drawPath(ctx, path));
    
    // Draw current path being drawn
    if (currentPath.length > 1) {
      drawPath(ctx, {
        points: currentPath,
        color: strokeColor,
        width: strokeWidth,
        tool: tool
      });
    }
    
    // Draw all splines
    splines.forEach(spline => {
      drawSpline(ctx, spline);
    });
    
    // Draw current spline being created
    if (selectedSpline && selectedSpline.points.length > 0) {
      ctx.strokeStyle = splineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      selectedSpline.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw points
      ctx.fillStyle = splineColor;
      selectedSpline.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
    
    // Draw animated spline
    if (isAnimating && animationProgress > 0) {
      const animatingSpline = splines[splines.length - 1]; // Animate the last spline
      if (animatingSpline) {
        ctx.strokeStyle = '#00ff00'; // Green for animation
        ctx.lineWidth = animatingSpline.width + 2;
        drawSpline(ctx, { ...animatingSpline, color: '#00ff00' }, animationProgress);
      }
    }
  }, [paths, currentPath, splines, selectedSpline, strokeColor, strokeWidth, splineColor, tool, drawPath, drawSpline, isAnimating, animationProgress]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="whiteboard-container">
      <div className="toolbar">
        <div className="tool-group">
          <label>Tools:</label>
          <button 
            className={`btn btn-primary ${tool === 'draw' ? 'active' : ''}`}
            onClick={() => setTool('draw')}
          >
            ✏️ Draw
          </button>
          <button 
            className={`btn btn-secondary ${tool === 'erase' ? 'active' : ''}`}
            onClick={() => setTool('erase')}
          >
            🧽 Erase
          </button>
          <button 
            className={`btn btn-success ${tool === 'spline' ? 'active' : ''}`}
            onClick={() => setTool('spline')}
          >
            📈 Spline
          </button>
        </div>

        <div className="tool-group">
          <label>Draw:</label>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
          />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          />
          <span>{strokeWidth}px</span>
        </div>

        <div className="tool-group">
          <label>Spline:</label>
          <input
            type="color"
            value={splineColor}
            onChange={(e) => setSplineColor(e.target.value)}
          />
          <input
            type="range"
            min="1"
            max="10"
            value={splineWidth}
            onChange={(e) => setSplineWidth(parseInt(e.target.value))}
          />
          <span>{splineWidth}px</span>
        </div>

        <div className="tool-group">
          <label>Animation:</label>
          <input
            type="number"
            min="500"
            max="10000"
            step="100"
            value={animationDuration}
            onChange={(e) => setAnimationDuration(parseInt(e.target.value))}
          />
          <span>ms</span>
        </div>

        <div className="tool-group">
          <button className="btn btn-danger" onClick={clearCanvas}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          className={`whiteboard-canvas ${tool === 'erase' ? 'eraser-mode' : ''}`}
          onMouseDown={tool === 'spline' ? handleSplineClick : startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {tool === 'spline' && (
          <div className="spline-controls">
            <h3>Spline Mode</h3>
            <p>Click to add points to your spline</p>
            {selectedSpline && (
              <div>
                <p>Points: {selectedSpline.points.length}</p>
                <button className="btn btn-success" onClick={finishSpline}>
                  ✅ Finish Spline
                </button>
              </div>
            )}
            {splines.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4>Animate Splines:</h4>
                {splines.map((spline, index) => (
                  <button
                    key={spline.id}
                    className="btn btn-primary"
                    style={{ margin: '2px', fontSize: '12px' }}
                    onClick={() => animateSpline(spline.id)}
                    disabled={isAnimating}
                  >
                    Animate #{index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`animation-progress ${isAnimating ? 'visible' : ''}`}>
          Animating... {Math.round(animationProgress * 100)}%
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
