import React, { useCallback, useRef, useState, useEffect } from 'react'
import { 
  Tldraw, 
  useEditor, 
  createShapeId,
  Editor
} from 'tldraw'
import 'tldraw/tldraw.css'
import { Box, IconButton, Tooltip, Paper, Fab } from '@mui/material'
import { 
  AutoAwesome, 
  Gesture,
  Functions,
  Edit,
  RadioButtonUnchecked,
  Close,
  CameraAlt
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useScreenshotCapture } from '@/hooks/useScreenshotCapture'
import { useWebSocket } from '@/hooks/useWebSocket'

// Custom AI Drawing Component with Human-like Collaboration
const AIDrawingOverlay = () => {
  const editor = useEditor()
  const [showWelcome, setShowWelcome] = useState(true)
  const { captureWhiteboardArea, isCapturing } = useScreenshotCapture()
  const { sendMessage, isConnected, reconnect } = useWebSocket()
  
  // Helper function to create smooth drawing paths
  const createDrawingPath = (points: number[][]) => {
    return points.map((point) => ({
      x: point[0],
      y: point[1],
      z: 0.5
    }))
  }
  
  // Demo: AI circles important areas and adds annotations
  const drawCircleAnnotation = useCallback(() => {
    if (!editor) return
    
    editor.batch(() => {
      // Clear existing content
      editor.selectAll()
      editor.deleteShapes(editor.getSelectedShapeIds())
      
      // First, create a "math problem" using basic shapes
      const problemBoxId = createShapeId()
      editor.createShape({
        id: problemBoxId,
        type: 'geo',
        x: 150,
        y: 100,
        props: {
          w: 200,
          h: 80,
          geo: 'rectangle',
          color: 'black',
          fill: 'none'
        }
      })
      
      // AI draws a circle around it (like a human collaborator would)
      setTimeout(() => {
        const circleId = createShapeId()
        
        // Create a hand-drawn style circle using draw shape
        const circlePoints = []
        for (let i = 0; i <= 32; i++) {
          const angle = (i / 32) * Math.PI * 2
          const radius = 120 + Math.sin(angle * 3) * 5 // Slightly wobbly like human drawing
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          circlePoints.push([x, y])
        }
        
        editor.createShape({
          id: circleId,
          type: 'draw',
          x: 250,
          y: 140,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(circlePoints)
            }],
            color: 'red',
            size: 'm'
          }
        })
      }, 1000)
      
      // AI adds an arrow pointing to it
      setTimeout(() => {
        const arrowId = createShapeId()
        const arrowPoints = [
          [0, 0],
          [60, -30],
          [50, -25],
          [60, -30],
          [55, -35]
        ]
        
        editor.createShape({
          id: arrowId,
          type: 'draw',
          x: 400,
          y: 200,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(arrowPoints)
            }],
            color: 'red',
            size: 'm'
          }
        })
      }, 2000)
      
      // AI writes "Important!" like handwriting
      setTimeout(() => {
        const textId = createShapeId()
        const handwritingPoints = [
          // Letter "I"
          [0, 0], [0, -20], [0, -10], [0, 0],
          // Letter "m"
          [10, 0], [10, -15], [15, -10], [20, -15], [25, -10], [25, 0],
          // Letter "p"
          [35, 5], [35, -15], [40, -15], [45, -10], [40, -5], [35, -5]
        ]
        
        editor.createShape({
          id: textId,
          type: 'draw',
          x: 420,
          y: 160,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(handwritingPoints)
            }],
            color: 'blue',
            size: 's'
          }
        })
      }, 3000)
    })
  }, [editor])
  
  // Demo: AI draws step-by-step solution with handwritten numbers
  const drawStepBySolution = useCallback(() => {
    if (!editor) return
    
    editor.batch(() => {
      editor.selectAll()
      editor.deleteShapes(editor.getSelectedShapeIds())
      
      // Create problem area
      const problemId = createShapeId()
      editor.createShape({
        id: problemId,
        type: 'geo',
        x: 100,
        y: 80,
        props: {
          w: 300,
          h: 50,
          geo: 'rectangle',
          color: 'blue',
          fill: 'semi'
        }
      })
      
      // AI draws step numbers and work like a human tutor
      const steps = [
        { delay: 1000, x: 120, y: 180, points: [[0, 0], [5, -10], [0, -20], [10, -20]] }, // "1"
        { delay: 2000, x: 220, y: 180, points: [[0, -20], [10, -20], [10, 0], [0, 0]] }, // "2"  
        { delay: 3000, x: 320, y: 180, points: [[0, -20], [10, -15], [5, -10], [10, -5], [0, 0]] }, // "3"
      ]
      
      steps.forEach((step) => {
        setTimeout(() => {
          const stepId = createShapeId()
          editor.createShape({
            id: stepId,
            type: 'draw',
            x: step.x,
            y: step.y,
            props: {
              segments: [{
                type: 'free',
                points: createDrawingPath(step.points)
              }],
              color: 'green',
              size: 'l'
            }
          })
          
          // Add underline for each step
          setTimeout(() => {
            const underlineId = createShapeId()
            editor.createShape({
              id: underlineId,
              type: 'draw',
              x: step.x - 5,
              y: step.y + 10,
              props: {
                segments: [{
                  type: 'free',
                  points: createDrawingPath([[0, 0], [20, 2]])
                }],
                color: 'green',
                size: 's'
              }
            })
          }, 300)
        }, step.delay)
      })
    })
  }, [editor])
  
  // Demo: AI draws geometric shapes with hand-drawn feel
  const drawHandDrawnGeometry = useCallback(() => {
    if (!editor) return
    
    editor.batch(() => {
      editor.selectAll()
      editor.deleteShapes(editor.getSelectedShapeIds())
      
      // AI draws a "wobbly" triangle like a human would
      setTimeout(() => {
        const triangleId = createShapeId()
        const trianglePoints = [
          [0, 0],
          [80, -5], // slightly imperfect like human drawing
          [40, -70],
          [2, 1] // close the shape with slight imperfection
        ]
        
        editor.createShape({
          id: triangleId,
          type: 'draw',
          x: 200,
          y: 200,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(trianglePoints)
            }],
            color: 'blue',
            size: 'm'
          }
        })
      }, 500)
      
      // AI labels the vertices like a teacher would
      setTimeout(() => {
        const labelAId = createShapeId()
        const letterA = [[0, -10], [5, 0], [10, -10], [3, -6], [7, -6]] // Hand-drawn "A"
        
        editor.createShape({
          id: labelAId,
          type: 'draw',
          x: 190,
          y: 210,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(letterA)
            }],
            color: 'red',
            size: 's'
          }
        })
      }, 1500)
      
      setTimeout(() => {
        const labelBId = createShapeId()
        const letterB = [[0, 0], [0, -10], [5, -10], [8, -8], [5, -5], [8, -3], [5, 0], [0, 0]] // Hand-drawn "B"
        
        editor.createShape({
          id: labelBId,
          type: 'draw',
          x: 285,
          y: 205,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(letterB)
            }],
            color: 'red',
            size: 's'
          }
        })
      }, 2500)
      
      setTimeout(() => {
        const labelCId = createShapeId()
        const letterC = [[8, -10], [0, -8], [0, -2], [8, 0]] // Hand-drawn "C"
        
        editor.createShape({
          id: labelCId,
          type: 'draw',
          x: 235,
          y: 140,
          props: {
            segments: [{
              type: 'free',
              points: createDrawingPath(letterC)
            }],
            color: 'red',
            size: 's'
          }
        })
      }, 3500)
    })
  }, [editor])
  
  // Demo: Clear canvas
  const clearCanvas = useCallback(() => {
    if (!editor) return
    editor.selectAll()
    editor.deleteShapes(editor.getSelectedShapeIds())
  }, [editor])

  // Screenshot and AI Analysis
  const captureAndAnalyze = useCallback(async () => {
    console.log(`🔍 Capture check: editor=${!!editor}, isCapturing=${isCapturing}, isConnected=${isConnected}`)
    
    if (!editor || isCapturing) {
      if (isCapturing) {
        console.log('⚠️ Skipping screenshot capture - Already capturing')
      }
      if (!editor) {
        console.log('⚠️ Skipping screenshot capture - No editor')
      }
      return
    }
    
    // If not connected, try to reconnect first
    if (!isConnected) {
      console.log('🔄 WebSocket not connected, attempting to reconnect before screenshot')
      reconnect()
      // Wait a moment for reconnection
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check again after reconnection attempt
      if (!isConnected) {
        console.log('⚠️ Still not connected after reconnect attempt, skipping screenshot')
        return
      }
    }
    
    console.log('📸 Capturing whiteboard for AI analysis...')
    
    try {
      const screenshot = await captureWhiteboardArea(editor, {
        format: 'png',
        quality: 0.8,
        background: '#ffffff'
      })
      
      if (screenshot) {
        // Send screenshot to backend for Cerebras analysis
        const message = {
          type: 'canvas_update',
          pngBase64: screenshot,
          width: editor.getViewportPageBounds().width,
          height: editor.getViewportPageBounds().height,
          timestamp: Date.now()
        }
        
        // Try sending the message, with a small retry if needed
        try {
          sendMessage(message)
          console.log('📸 Screenshot sent for AI analysis')
        } catch (error) {
          console.error('❌ Failed to send screenshot:', error)
          // Try once more after a brief delay
          setTimeout(() => {
            try {
              sendMessage(message)
              console.log('📸 Screenshot sent for AI analysis (retry)')
            } catch (retryError) {
              console.error('❌ Failed to send screenshot on retry:', retryError)
            }
          }, 1000)
        }
      } else {
        console.error('❌ Failed to capture screenshot')
      }
    } catch (error) {
      console.error('❌ Error in screenshot analysis:', error)
    }
  }, [editor, captureWhiteboardArea, isCapturing, sendMessage, isConnected, reconnect])

  // Auto-capture every 5 seconds for continuous AI analysis
  useEffect(() => {
    if (!editor) return
    
    const intervalId = setInterval(() => {
      const shapes = editor.getCurrentPageShapeIds()
      if (shapes.size > 0) {
        captureAndAnalyze()
      }
    }, 5000) // Capture every 5 seconds
    
    return () => clearInterval(intervalId)
  }, [editor, captureAndAnalyze])
  
  // Also capture on significant changes (debounced)
  useEffect(() => {
    if (!editor) return
    
    let timeoutId: NodeJS.Timeout
    
    const handleChange = () => {
      // Debounce screenshot capture to avoid too many requests
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const shapes = editor.getCurrentPageShapeIds()
        if (shapes.size > 0) {
          captureAndAnalyze()
        }
      }, 3000) // Wait 3 seconds after last change
    }
    
    // Listen for shape changes
    const unsubscribe = editor.store.listen(handleChange)
    
    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [editor, captureAndAnalyze])
  
  return (
    <>
      {/* AI Demo Controls - Positioned in middle-right to avoid TLdraw's color selector */}
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          right: 16,
          transform: 'translateY(-50%)',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2
        }}
      >
        <Tooltip title="AI Circles & Annotates" placement="left">
          <IconButton onClick={drawCircleAnnotation} size="small" color="primary">
            <RadioButtonUnchecked />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Step-by-Step Drawing" placement="left">
          <IconButton onClick={drawStepBySolution} size="small" color="secondary">
            <Functions />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Hand-drawn Geometry" placement="left">
          <IconButton onClick={drawHandDrawnGeometry} size="small" color="success">
            <Edit />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Clear Canvas" placement="left">
          <IconButton onClick={clearCanvas} size="small" color="error">
            <Gesture />
          </IconButton>
        </Tooltip>
        
        <Tooltip title={`Capture & Analyze ${isConnected ? '(Connected)' : '(Disconnected)'}`} placement="left">
          <span>
            <IconButton 
              onClick={captureAndAnalyze} 
              size="small" 
              color={isConnected ? "secondary" : "error"}
              disabled={isCapturing || !isConnected}
            >
              <CameraAlt />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
      
      {/* AI Status Indicator */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
      >
        <Fab
          size="small"
          sx={{
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(45deg, #FF5252, #26C6DA)'
            }
          }}
        >
          <AutoAwesome />
        </Fab>
      </motion.div>
      
      
      {/* Welcome instruction overlay - Dismissible */}
      {showWelcome && (
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            p: 3,
            zIndex: 999,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            textAlign: 'center',
            maxWidth: 400
          }}
        >
          {/* Close button */}
          <IconButton
            onClick={() => setShowWelcome(false)}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary'
              }
            }}
          >
            <Close />
          </IconButton>
          
          <Box sx={{ mb: 2, fontSize: '2rem' }}>🤖✏️</Box>
          <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', mb: 1 }}>
            AI Whiteboard Collaborator
          </Box>
          <Box sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 2 }}>
            Watch the AI draw like a human tutor - circling, annotating, and handwriting!
          </Box>
          <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            • Circles important areas • Handwritten annotations • Natural drawing
          </Box>
        </Paper>
      )}
    </>
  )
}

// Main TLdraw Whiteboard Component
interface TldrawWhiteboardProps {
  className?: string
}

const TldrawWhiteboard: React.FC<TldrawWhiteboardProps> = ({ className }) => {
  const editorRef = useRef<Editor | null>(null)
  
  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    console.log('🎨 TLdraw editor mounted and ready!')
  }, [])
  
  return (
    <Box 
      sx={{ 
        position: 'relative',
        width: '100%', 
        height: '100%',
        '& .tl-container': {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
        }
      }}
      className={className}
    >
      <Tldraw onMount={handleMount}>
        <AIDrawingOverlay />
      </Tldraw>
    </Box>
  )
}

export default TldrawWhiteboard