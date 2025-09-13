import React, { useEffect, useRef } from 'react'
import { Tldraw, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import VoiceAssistant from './VoiceAssistant'

export default function App() {
  const editorRef = useRef(null)

  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/commands')
        const commands = await response.json()
        
        if (commands.length > 0 && editorRef.current) {
          commands.forEach(command => {
            if (command.type === 'create_shape') {
              const drawLine = (editor, start, end, color) => {
                editor.createShapes([{
                  type: 'line',
                  x: 0,
                  y: 0,
                  props: {
                    color: 'black',
                    dash: 'solid',
                    size: 'm', 
                    spline: 'line',
                    points: {
                      'a1': { id: 'a1', index: 'a1', x: start.x, y: start.y },
                      'a2': { id: 'a2', index: 'a2', x: end.x, y: end.y }
                    }
                  }
                }]);
              };
              
              // Call the drawLine function with command data
              drawLine(editorRef.current, command.start, command.end, command.color);
            } else if (command.type === 'clear_all') {
              editorRef.current.selectAll()
              editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds())
            }
          })
          
          // Clear processed commands
          await fetch('http://localhost:5000/api/commands', { method: 'DELETE' })
        }
      } catch (error) {
        // Only log if it's not a network error (server actually down)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          // Network error - server likely not running
          console.log('Flask server not running')
        } else {
          // Other errors - log the actual error
          console.error('Error polling commands:', error.message)
        }
      }
    }

    // Poll every 50ms for new commands (faster response)
    const interval = setInterval(pollCommands, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        onMount={(editor) => {
          editorRef.current = editor
          console.log(' tldraw editor ready for Python commands')
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
      <VoiceAssistant />
    </div>
  )
}
