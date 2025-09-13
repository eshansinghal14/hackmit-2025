import React, { useCallback, useRef, useState, useEffect } from 'react'
import { 
  Tldraw, 
  useEditor, 
  createShapeId,
  Editor
} from 'tldraw'
import 'tldraw/tldraw.css'
import { Box, IconButton, Paper } from '@mui/material'
import { Close } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useScreenshotCapture } from '@/hooks/useScreenshotCapture'
import { useAppStore } from '@/store/appStore'

// Custom AI Drawing Component with Human-like Collaboration
const AIDrawingOverlay = () => {
  const editor = useEditor()
  const [showWelcome, setShowWelcome] = useState(true)
  const { captureWhiteboardArea, isCapturing } = useScreenshotCapture()
  const { sendMessage } = useAppStore()
  
  // Auto-capture on significant changes
  useEffect(() => {
    if (!editor) return
    
    let timeoutId: NodeJS.Timeout
    
    const handleChange = () => {
      // Debounce screenshot capture to avoid too many requests
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const shapes = editor.getCurrentPageShapeIds()
        if (shapes.size > 0) {
          // Removed auto-capture functionality
        }
      }, 2000) // Wait 2 seconds after last change
    }
    
    // Listen for shape changes
    const unsubscribe = editor.store.listen(handleChange)
    
    return () => {
      clearTimeout(timeoutId)
      unsubscribe()
    }
  }, [editor])
  
  return (
    <>
      {/* AI Demo Controls removed */}
      
      {/* AI Status Indicator removed */}
      
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