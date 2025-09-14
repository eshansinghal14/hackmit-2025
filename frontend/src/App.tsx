import React, { useEffect, useRef } from 'react'
import { Tldraw } from 'tldraw'
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

const App: React.FC = () => {
  const editorRef = useRef<any>(null)
  
  // Poll for drawing commands from Flask server
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

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        onMount={(editor) => {
          editorRef.current = editor
          console.log('🎨 tldraw editor ready for Python commands')
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        Python API: http://localhost:5000
      </div>
    </div>
  )
}

export default App
