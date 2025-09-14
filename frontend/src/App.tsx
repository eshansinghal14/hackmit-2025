import React, { useEffect, useRef } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const App: React.FC = () => {
  const editorRef = useRef<any>(null)
  
  // Poll for drawing commands from Flask server
  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/commands')
        const commands = await response.json()
        
        if (commands.length > 0 && editorRef.current) {
          commands.forEach((command: any) => {
            if (command.type === 'create_shape') {
              // Calculate total delay counter for consistent timing
              let totalDelay = 0;
              
              command.symbols.forEach((points: any[]) => {
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
                  }, totalDelay * 5); // 5ms delay between each line
                  
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
      } catch (error) {
        // Silently handle server connection errors
        console.log('Flask server not running')
      }
    }

    // Poll every 500ms for new commands
    const interval = setInterval(pollCommands, 500)
    return () => clearInterval(interval)
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
