import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material'
import { 
  Mic, 
  MicOff, 
  Settings, 
  AccountTree, 
  School, 
  Fullscreen,
  FullscreenExit
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import 'tldraw/tldraw.css'

// Components
import TldrawWhiteboard from '@/components/TldrawWhiteboard'
import KnowledgeGraphPanel from '@/components/KnowledgeGraphPanel'
import SettingsPanel from '@/components/SettingsPanel'
import SubtitleDisplay from '@/components/SubtitleDisplay'
import WelcomeModal from '@/components/WelcomeModal'

// Hooks and services
import { useWebSocket } from '@/hooks/useWebSocket'
import { useWebSpeechAPI } from '@/hooks/useWebSpeechAPI'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Store
import { useAppStore } from '@/store/appStore'

const App: React.FC = () => {
  // State management
  const editorRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  
  // Global store
  const { 
    sessionId, 
    currentSubtitle,
    setVoiceEnabled,
    initialize 
  } = useAppStore()
  
  // Custom hooks
  const { connect, disconnect, sendMessage } = useWebSocket()
  
  // Web Speech API for voice input
  const { 
    isListening, 
    transcript, 
    isSupported: speechSupported,
    toggleListening
  } = useWebSpeechAPI({
    onFinalTranscript: (finalText: string) => {
      console.log('🎤 Sending voice input to AI:', finalText)
      // Send the transcribed voice input to the AI backend
      sendMessage({
        type: 'voice_input',
        text: finalText,
        timestamp: Date.now()
      })
    }
  })
  
  // Initialize app
  useEffect(() => {
    initialize()
  }, []) // Empty dependency array - only run once on mount
  
  // Connect WebSocket on mount
  useEffect(() => {
    if (sessionId) {
      connect(sessionId)
    }
    
    return () => disconnect()
  }, [sessionId]) // Only depend on sessionId, not the functions

  // AI drawing use effect
  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/commands')
        const commands = await response.json()
        
        if (commands.length > 0 && editorRef.current) {
          commands.forEach((command: { type: string; symbols?: Array<Array<[number, number]>> }) => {
            if (command.type === 'create_shape') {
              // Calculate total delay counter for consistent timing
              let totalDelay = 0;
              
              command.symbols?.forEach((points) => {
                // Draw lines between consecutive point pairs with consistent delays
                for (let i = 0; i < points.length - 1; i++) {
                  const start = points[i];
                  const end = points[i + 1];
                  
                  setTimeout(() => {
                    editorRef.current.createShapes([{
                      type: 'line',
                      x: 0,
                      y: 0,
                      props: {
                        color: 'black',
                        dash: 'solid',
                        size: 's', 
                        spline: 'line',
                        points: {
                          'a1': { id: 'a1', index: 'a1', x: start[0], y: start[1] },
                          'a2': { id: 'a2', index: 'a2', x: end[0], y: end[1] }
                        }
                      }
                    }]);
                  }, totalDelay * 5); // 3ms delay between each line
                  
                  totalDelay++; // Increment for next line
                }
              })
            } else if (command.type === 'clear_all') {
              editorRef.current.selectAll()
              editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds())
            }
          })
          
          // Clear processed commands
          await fetch('http://localhost:5000/api/commands', { method: 'DELETE' })
        }
      } catch (error: unknown) {
        // Only log if it's not a network error (server actually down)
        if (error instanceof TypeError && error.message.includes('fetch')) {
          // Network error - server likely not running
          console.log('Flask server not running')
        } else if (error instanceof Error) {
          // Other errors - log the actual error
          console.error('Error polling commands:', error.message)
        }
      }
    }

    // Poll every 5ms for new commands (fastest response)
    const interval = setInterval(pollCommands, 500)
    return () => clearInterval(interval)
  }, [])
  
  // Keyboard shortcuts - memoize the shortcuts object to prevent re-renders
  const keyboardShortcuts = React.useMemo(() => ({
    'Space': () => {
      if (speechSupported) {
        toggleListening()
      }
    },
    'Escape': () => setIsFullscreen(false),
    'F11': () => toggleFullscreen(),
    'KeyS': (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setShowSettings(true)
      }
    },
    'KeyG': (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setShowKnowledgeGraph(true)
      }
    }
  }), [toggleListening, speechSupported])
  
  useKeyboardShortcuts(keyboardShortcuts)
  
  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  // Voice recording toggle
  const handleVoiceToggle = () => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported in this browser')
      return
    }
    
    if (isListening) {
      setVoiceEnabled(false)
      toggleListening()
    } else {
      setVoiceEnabled(true)
      toggleListening()
    }
  }
  
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          color: 'text.primary'
        }}
      >
        <Toolbar sx={{ minHeight: '64px !important' }}>
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <School sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            </motion.div>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              AI Whiteboard Tutor
            </Typography>
            
            {/* Connection Status removed */}
          </Box>
          
          {/* Voice Controls */}
          <Tooltip title={
            !speechSupported ? 'Speech not supported' :
            isListening ? 'Stop Voice Input (Space)' : 'Start Voice Input (Space)'
          }>
            <span>
              <IconButton
                onClick={handleVoiceToggle}
                disabled={!speechSupported}
                sx={{ 
                  mr: 1,
                  background: isListening ? 'primary.main' : 'grey.200',
                  color: isListening ? 'white' : 'grey.600',
                  '&:hover': {
                    background: isListening ? 'primary.dark' : 'grey.300'
                  },
                  '&:disabled': {
                    background: 'grey.100',
                    color: 'grey.400'
                  }
                }}
              >
                {isListening ? <Mic /> : <MicOff />}
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Knowledge Graph */}
          <Tooltip title="Knowledge Graph (Ctrl+G)">
            <IconButton 
              onClick={() => setShowKnowledgeGraph(true)}
              sx={{ mr: 1 }}
            >
              <AccountTree />
            </IconButton>
          </Tooltip>
          
          {/* Settings */}
          <Tooltip title="Settings (Ctrl+S)">
            <IconButton 
              onClick={() => setShowSettings(true)}
              sx={{ mr: 1 }}
            >
              <Settings />
            </IconButton>
          </Tooltip>
          
          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}>
            <IconButton onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={
            <>
              {/* TLdraw Whiteboard */}
              <TldrawWhiteboard />
              
              {/* Subtitle Display - Skip initial welcome message */}
              <AnimatePresence>
                {currentSubtitle && currentSubtitle.text !== "Hi! I'm your AI math tutor. Start drawing or speaking, and I'll help guide you." && (
                  <SubtitleDisplay 
                    text={currentSubtitle.text} 
                    mode={currentSubtitle.mode}
                  />
                )}
                </AnimatePresence>
              
              {/* Floating Voice Button removed */}
              
              {/* Live Transcript Indicator */}
              <AnimatePresence>
                {isListening && transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{
                      position: 'fixed',
                      bottom: 100,
                      right: 24,
                      zIndex: 1000,
                      background: 'rgba(33, 150, 243, 0.9)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      maxWidth: '300px',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    🎤 "{transcript}"
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      
      {/* Panels and Modals */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal 
            open={showWelcome} 
            onClose={() => setShowWelcome(false)} 
          />
        )}
        
        {showKnowledgeGraph && (
          <KnowledgeGraphPanel
            open={showKnowledgeGraph}
            onClose={() => setShowKnowledgeGraph(false)}
          />
        )}
        
        {showSettings && (
          <SettingsPanel
            open={showSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Help Tooltip removed */}
    </Box>
  )
}

export default App
