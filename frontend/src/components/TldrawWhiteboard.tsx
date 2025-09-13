import React, { useCallback, useRef, useEffect } from 'react'
import { 
  Tldraw, 
  useEditor, 
  Editor
} from 'tldraw'
import 'tldraw/tldraw.css'
import { Box } from '@mui/material'
import { useVoiceScreenshotIntegration } from '@/hooks/useVoiceScreenshotIntegration'

// Custom AI Drawing Component with Voice Screenshot Integration
const AIDrawingOverlay = () => {
  const editor = useEditor()
  const { handleVoiceActivity, captureOnSpeechEnd } = useVoiceScreenshotIntegration(editor) as any
  
  // Set up global handlers for voice recording integration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set global voice activity handler
      ;(window as any).handleVoiceActivity = handleVoiceActivity
      // Set global speech end callback
      ;(window as any).onSpeechEnd = captureOnSpeechEnd
      
      console.log('🎤📸 Voice screenshot integration initialized')
      console.log('🎤📸 Global callbacks set:', {
        handleVoiceActivity: typeof (window as any).handleVoiceActivity,
        onSpeechEnd: typeof (window as any).onSpeechEnd
      })
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).handleVoiceActivity
        delete (window as any).onSpeechEnd
      }
    }
  }, [handleVoiceActivity, captureOnSpeechEnd])
  
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