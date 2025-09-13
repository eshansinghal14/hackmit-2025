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
import { useWebSocket } from '@/hooks/useWebSocket'

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
      }, 3000) // Wait 3 seconds after last change
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