import { Tldraw, createShapeId, DefaultToolbar, DefaultToolbarContent, TldrawUiToolbarButton, TldrawUiButtonIcon } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function App() {
  const editorRef = useRef(null)
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')

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
        console.log('Flask server not running')
      }
    }

    // Poll every 50ms for new commands (faster response)
    const interval = setInterval(pollCommands, 50)
    return () => clearInterval(interval)
  }, [])

  // Initialize Web Speech API for mic toggle
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      setIsListening(false)
      setTranscript('')
      setInterimTranscript('')
    }
    recognition.onerror = () => {
      setIsListening(false)
      setTranscript('')
      setInterimTranscript('')
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let currentInterim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          currentInterim += transcript
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript)
        setInterimTranscript('')
      } else {
        setInterimTranscript(currentInterim)
      }
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch (_) {}
    }
  }, [])

  const handleToggleMic = () => {
    if (!recognitionRef.current) return
    try {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
      }
    } catch (_) {
      // Some browsers throw if start/stop called too quickly
    }
  }

  // Add mic button to the bottom toolbar via components override
  const components = useMemo(() => {
    const Toolbar = () => (
      <DefaultToolbar>
        <>
          <DefaultToolbarContent />
          <TldrawUiToolbarButton
            type="icon"
            title={isSpeechSupported ? (isListening ? 'Stop recording' : 'Start recording') : 'Speech recognition not supported'}
            disabled={!isSpeechSupported}
            onClick={handleToggleMic}
          >
            <TldrawUiButtonIcon small icon={isListening ? 'toggle-off' : 'toggle-on'} />
          </TldrawUiToolbarButton>
        </>
      </DefaultToolbar>
    )
    return { Toolbar }
  }, [isListening, isSpeechSupported])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        components={components}
        onMount={(editor) => {
          editorRef.current = editor
          console.log(' tldraw editor ready for Python commands')
        }}
      />
      {/* Floating captions box */}
      {(transcript || interimTranscript) && (
        <div style={{
          position: 'absolute',
          bottom: '80px', // Position above the navigation bar
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '80%',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          transition: 'opacity 0.2s ease',
          opacity: isListening ? 1 : 0,
        }}>
          {transcript || interimTranscript}
        </div>
      )}
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
