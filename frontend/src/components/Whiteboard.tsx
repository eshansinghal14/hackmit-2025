import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Line, Circle, Group } from 'react-konva'
import { Box, Toolbar, IconButton, Slider, Typography, Paper, Tooltip } from '@mui/material'
import { 
  Edit, 
  Brush, 
  FormatColorFill,
  Undo,
  Redo,
  Clear,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  GridOn,
  GridOff
} from '@mui/icons-material'
import { AnimatePresence } from 'framer-motion'
import Konva from 'konva'

// Hooks and utilities
import { useAppStore } from '@/store/appStore'
import { useCanvasWebSocket } from '@/hooks/useWebSocket'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Types
import type { DrawingStroke, Point } from '@/types'

interface WhiteboardProps {
  width?: number
  height?: number
}

const DRAWING_TOOLS = [
  { id: 'pen', name: 'Pen', icon: <Edit />, color: '#000000', width: 2 },
  { id: 'brush', name: 'Brush', icon: <Brush />, color: '#000000', width: 8 },
  { id: 'highlighter', name: 'Highlighter', icon: <FormatColorFill />, color: '#ffff00', width: 12, opacity: 0.5 }
]

const COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#ff0000', // Red
  '#00ff00', // Green
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff8800', // Orange
  '#8800ff', // Purple
]

const Whiteboard: React.FC<WhiteboardProps> = ({ 
  width = window.innerWidth, 
  height = window.innerHeight - 64 // Account for header
}) => {
  // Refs
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointerPositionRef = useRef<Point | null>(null)
  
  // State
  const [tool, setTool] = useState('pen')
  const [brushSize, setBrushSize] = useState(2)
  const [color, setColor] = useState('#000000')
  const [history, setHistory] = useState<DrawingStroke[][]>([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [dimensions, setDimensions] = useState({ width, height })
  
  // Store
  const { 
    canvasState, 
    updateCanvasState, 
    aiCursorPosition 
  } = useAppStore()
  
  // WebSocket for canvas updates
  const { sendCanvasUpdate, sendPenEvent } = useCanvasWebSocket()
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize() // Initial call
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+z': () => undo(),
    'ctrl+y': () => redo(),
    'ctrl+shift+c': () => clear(),
    'KeyE': () => setTool('pen'),
    'KeyB': () => setTool('brush'),
    'KeyH': () => setTool('highlighter'),
    'Digit1': () => setColor(COLORS[0]),
    'Digit2': () => setColor(COLORS[1]),
    'Digit3': () => setColor(COLORS[2]),
    'Digit4': () => setColor(COLORS[3]),
    'Digit5': () => setColor(COLORS[4]),
  })
  
  // Drawing functions
  const startDrawing = useCallback((pos: Point) => {
    isDrawingRef.current = true
    lastPointerPositionRef.current = pos
    
    const selectedTool = DRAWING_TOOLS.find(t => t.id === tool) || DRAWING_TOOLS[0]
    
    const newStroke: DrawingStroke = {
      id: `stroke_${Date.now()}_${Math.random()}`,
      tool: tool,
      points: [pos.x, pos.y],
      color: color,
      width: brushSize,
      opacity: selectedTool.opacity || 1,
      timestamp: Date.now()
    }
    
    const newStrokes = [...canvasState.strokes, newStroke]
    updateCanvasState({ strokes: newStrokes })
    
    // Save to history for undo/redo
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newStrokes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
    
    // Send pen event
    sendPenEvent('down', [pos], color, brushSize)
    
  }, [tool, color, brushSize, canvasState.strokes, updateCanvasState, history, historyStep, sendPenEvent])
  
  const continueDrawing = useCallback((pos: Point) => {
    if (!isDrawingRef.current || !lastPointerPositionRef.current) return
    
    const strokes = [...canvasState.strokes]
    const lastStroke = strokes[strokes.length - 1]
    
    if (lastStroke) {
      lastStroke.points = [...lastStroke.points, pos.x, pos.y]
      updateCanvasState({ strokes })
      
      // Send pen event (throttled for performance)
      if (Date.now() % 3 === 0) { // Send every 3rd frame
        sendPenEvent('move', [pos], color, brushSize)
      }
    }
    
    lastPointerPositionRef.current = pos
  }, [canvasState.strokes, updateCanvasState, color, brushSize, sendPenEvent])
  
  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return
    
    isDrawingRef.current = false
    lastPointerPositionRef.current = null
    
    // Send canvas update
    setTimeout(() => {
      if (stageRef.current) {
        const dataURL = stageRef.current.toDataURL({
          mimeType: 'image/png',
          quality: 0.8,
          pixelRatio: 1
        })
        const base64Data = dataURL.split(',')[1]
        sendCanvasUpdate(base64Data, dimensions.width, dimensions.height)
      }
    }, 100) // Small delay to ensure stroke is rendered
    
    sendPenEvent('up', [], color, brushSize)
  }, [sendCanvasUpdate, sendPenEvent, dimensions, color, brushSize])
  
  // Undo/Redo functions
  const undo = useCallback(() => {
    if (historyStep > 0) {
      const newStep = historyStep - 1
      setHistoryStep(newStep)
      updateCanvasState({ strokes: history[newStep] || [] })
    }
  }, [historyStep, history, updateCanvasState])
  
  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1
      setHistoryStep(newStep)
      updateCanvasState({ strokes: history[newStep] || [] })
    }
  }, [historyStep, history, updateCanvasState])
  
  const clear = useCallback(() => {
    const newStrokes: DrawingStroke[] = []
    updateCanvasState({ strokes: newStrokes })
    
    const newHistory = [...history, newStrokes]
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }, [history, updateCanvasState])
  
  // Zoom functions
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(canvasState.zoom * 1.2, 5)
    updateCanvasState({ zoom: newZoom })
  }, [canvasState.zoom, updateCanvasState])
  
  const zoomOut = useCallback(() => {
    const newZoom = Math.max(canvasState.zoom / 1.2, 0.1)
    updateCanvasState({ zoom: newZoom })
  }, [canvasState.zoom, updateCanvasState])
  
  const resetZoom = useCallback(() => {
    updateCanvasState({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [updateCanvasState])
  
  const toggleGrid = useCallback(() => {
    updateCanvasState({ grid: !canvasState.grid })
  }, [canvasState.grid, updateCanvasState])
  
  // Event handlers
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target !== stageRef.current) return
    
    const pos = stageRef.current?.getPointerPosition()
    if (pos) {
      startDrawing(pos)
    }
  }
  
  const handleMouseMove = () => {
    if (!isDrawingRef.current) return
    
    const pos = stageRef.current?.getPointerPosition()
    if (pos) {
      continueDrawing(pos)
    }
  }
  
  const handleMouseUp = () => {
    stopDrawing()
  }
  
  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      overflow: 'hidden',
      background: canvasState.background 
    }}>
      {/* Toolbar */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: '48px !important', gap: 1 }}>
          {/* Drawing Tools */}
          {DRAWING_TOOLS.map((drawingTool) => (
            <Tooltip key={drawingTool.id} title={drawingTool.name}>
              <IconButton
                onClick={() => setTool(drawingTool.id)}
                color={tool === drawingTool.id ? 'primary' : 'default'}
                size="small"
              >
                {drawingTool.icon}
              </IconButton>
            </Tooltip>
          ))}
          
          {/* Color Picker */}
          <Box sx={{ display: 'flex', gap: 0.5, mx: 1 }}>
            {COLORS.slice(0, 5).map((colorOption) => (
              <Box
                key={colorOption}
                onClick={() => setColor(colorOption)}
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: colorOption,
                  border: color === colorOption ? '2px solid #1976d2' : '1px solid #ccc',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  '&:hover': { transform: 'scale(1.1)' }
                }}
              />
            ))}
          </Box>
          
          {/* Brush Size */}
          <Box sx={{ display: 'flex', alignItems: 'center', mx: 1, minWidth: 100 }}>
            <Typography variant="caption" sx={{ mr: 1 }}>Size:</Typography>
            <Slider
              value={brushSize}
              onChange={(_, value) => setBrushSize(value as number)}
              min={1}
              max={50}
              size="small"
              sx={{ width: 60 }}
            />
          </Box>
          
          {/* Actions */}
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton onClick={undo} disabled={historyStep <= 0} size="small">
                <Undo />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton onClick={redo} disabled={historyStep >= history.length - 1} size="small">
                <Redo />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Clear (Ctrl+Shift+C)">
            <IconButton onClick={clear} size="small">
              <Clear />
            </IconButton>
          </Tooltip>
          
          {/* View Controls */}
          <Tooltip title="Zoom In">
            <IconButton onClick={zoomIn} size="small">
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton onClick={zoomOut} size="small">
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View">
            <IconButton onClick={resetZoom} size="small">
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Toggle Grid">
            <IconButton onClick={toggleGrid} size="small" color={canvasState.grid ? 'primary' : 'default'}>
              {canvasState.grid ? <GridOn /> : <GridOff />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </Paper>
      
      {/* Status Info */}
      <Paper
        elevation={1}
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          px: 2,
          py: 1,
          zIndex: 1000,
          opacity: 0.8
        }}
      >
        <Typography variant="caption">
          Zoom: {Math.round(canvasState.zoom * 100)}% | Strokes: {canvasState.strokes.length}
        </Typography>
      </Paper>
      
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: tool === 'pen' ? 'crosshair' : tool === 'brush' ? 'pointer' : 'default'
        }}
      >
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          scaleX={canvasState.zoom}
          scaleY={canvasState.zoom}
          x={canvasState.pan.x}
          y={canvasState.pan.y}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          {/* Background Layer */}
          <Layer>
            {/* Grid */}
            {canvasState.grid && (
              <Group>
                {/* Grid lines would be rendered here */}
              </Group>
            )}
          </Layer>
          
          {/* Drawing Layer */}
          <Layer>
            {canvasState.strokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                opacity={stroke.opacity}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
          
          {/* AI Cursor Layer */}
          <Layer>
            <AnimatePresence>
              {aiCursorPosition && (
                <Circle
                  x={aiCursorPosition.x}
                  y={aiCursorPosition.y}
                  radius={8}
                  fill="rgba(25, 118, 210, 0.8)"
                  stroke="#1976d2"
                  strokeWidth={2}
                />
              )}
            </AnimatePresence>
          </Layer>
        </Stage>
      </div>
    </Box>
  )
}

export default Whiteboard
