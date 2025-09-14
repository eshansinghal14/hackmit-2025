import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import SettingsPanel from './SettingsPanel'

interface MicrophoneWhiteboardProps {
  onBack: () => void
}

const MicrophoneWhiteboard: React.FC<MicrophoneWhiteboardProps> = ({ onBack }) => {
  const editorRef = useRef<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [microphoneHistory, setMicrophoneHistory] = useState<string[]>([])
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize microphone and ask first question
  useEffect(() => {
    initializeMicrophone()
    drawInitialLatex()
    askInitialQuestion()
    startScreenshotCapture()
    
    return () => {
      cleanup()
    }
  }, [])

  const initializeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Set up speech recognition
      if ('webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          
          if (finalTranscript) {
            setMicrophoneHistory(prev => [...prev, finalTranscript])
            console.log('🎤 User said:', finalTranscript)
            // Process the speech with context
            processSpeechWithContext(finalTranscript)
          }
        }
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
        }
        
        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
        console.log('🎤 Microphone is now always listening...')
      }
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const drawInitialLatex = async () => {
    try {
      // Draw x^2 in the middle of the screen
      const response = await fetch('http://localhost:5001/api/process-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotations: [
            {
              type: 'latex',
              content: 'x^2',
              x: 400,
              y: 300
            }
          ]
        })
      })
      
      if (response.ok) {
        console.log('✅ Drew initial x^2 equation')
      }
    } catch (error) {
      console.error('Error drawing initial LaTeX:', error)
    }
  }

  const askInitialQuestion = () => {
    const question = "Hi! I see we have x² on the board. Can you tell me what you know about quadratic functions?"
    setCurrentQuestion(question)
    
    // Speak the question using text-to-speech
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(question)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      speechSynthesis.speak(utterance)
    }
    
    console.log('🤖 AI asked:', question)
  }

  const captureScreenshot = useCallback(async () => {
    try {
      if (editorRef.current) {
        // Get the canvas element from tldraw
        const canvas = document.querySelector('canvas')
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png')
          setLastScreenshot(dataUrl)
          console.log('📸 Screenshot captured')
          return dataUrl
        }
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error)
    }
    return null
  }, [])

  const startScreenshotCapture = () => {
    // Capture screenshot every 10 seconds
    const interval = setInterval(captureScreenshot, 10000)
    return () => clearInterval(interval)
  }

  const processSpeechWithContext = async (speech: string) => {
    try {
      // Get current screenshot
      const screenshot = await captureScreenshot()
      
      // Prepare context data
      const contextData = {
        speech: speech,
        screenshot: screenshot,
        microphoneHistory: microphoneHistory.slice(-5), // Last 5 utterances
        currentQuestion: currentQuestion,
        timestamp: new Date().toISOString()
      }
      
      console.log('🧠 Processing speech with context...', contextData)
      
      // Here you would send to Claude/AI for processing
      // For now, just log the context
      
      // Example response processing:
      setTimeout(() => {
        const responses = [
          "Great! Can you solve x² = 4?",
          "Interesting! What happens when x² = 9?",
          "Let me draw the graph of y = x²",
          "Can you tell me about the vertex of this parabola?"
        ]
        const nextQuestion = responses[Math.floor(Math.random() * responses.length)]
        setCurrentQuestion(nextQuestion)
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(nextQuestion)
          speechSynthesis.speak(utterance)
        }
      }, 2000)
      
    } catch (error) {
      console.error('Error processing speech with context:', error)
    }
  }

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
  }

  // Poll for drawing commands from Flask server (existing logic)
  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/commands')
        const commands = await response.json()
        
        if (commands.length > 0 && editorRef.current) {
          commands.forEach((command: { type: string; symbols?: Array<Array<[number, number]>>; center?: {x: number, y: number}; radius?: number }) => {
            if (command.type === 'create_shape' && command.symbols) {
              let totalDelay = 0
              command.symbols.forEach((points) => {
                for (let i = 0; i < points.length - 1; i++) {
                  const start = points[i]
                  const end = points[i + 1]
                  
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
                    }])
                  }, totalDelay * 5)
                  
                  totalDelay++
                }
              })
            } else if (command.type === 'create_circle' && command.center && command.radius) {
              editorRef.current.createShapes([{
                type: 'geo',
                x: command.center.x - command.radius,
                y: command.center.y - command.radius,
                props: {
                  geo: 'ellipse',
                  w: command.radius * 2,
                  h: command.radius * 2,
                  color: 'blue',
                  fill: 'none',
                  dash: 'solid',
                  size: 'm'
                }
              }])
            } else if (command.type === 'clear_all') {
              editorRef.current.selectAll()
              editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds())
            }
          })
          
          await fetch('http://localhost:5001/api/commands', { method: 'DELETE' })
        }
      } catch (error) {
        // Silently handle connection errors
      }
    }

    const interval = setInterval(pollCommands, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div style={{ height: '100vh' }}>
        <Tldraw 
          onMount={(editor) => {
            editorRef.current = editor
            console.log('🎨 Microphone whiteboard ready')
          }}
        />
      </div>
      
      {/* Microphone Status */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: isListening ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'white',
          animation: isListening ? 'pulse 1s infinite' : 'none'
        }} />
        {isListening ? '🎤 Listening...' : '🎤 Microphone Off'}
      </div>

      {/* Current Question Display */}
      {currentQuestion && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(33, 150, 243, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '16px',
          maxWidth: '80%',
          textAlign: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          🤖 {currentQuestion}
        </div>
      )}
      
      {/* Controls */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        ← Back
      </button>
      
      <button
        onClick={() => setShowSettings(true)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        ⚙️ Settings
      </button>

      {/* API Status */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        API: http://localhost:5001
      </div>
      
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default MicrophoneWhiteboard
