import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import SettingsPanel from './SettingsPanel'

interface MicrophoneWhiteboardProps {
  onBack: () => void
  selectedTopic?: string
}

const MicrophoneWhiteboard: React.FC<MicrophoneWhiteboardProps> = ({ onBack, selectedTopic }) => {
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
      // Draw initial content based on selected topic
      const topicContent = selectedTopic ? `Let's learn ${selectedTopic}!` : 'x²'
      
      const response = await fetch('http://localhost:5001/api/process-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Basic Calculus',
          annotations: [
            {
              type: 'text',
              position: { x: 400, y: 300 },
              content: topicContent,
              color: '#000000'
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

  const askInitialQuestion = async () => {
    try {
      // Get initial screenshot for context
      const screenshot = await captureScreenshot()
      
      // Send initial tutoring request to get adaptive first question
      const initialData = {
        speech: `Starting lesson on ${selectedTopic || 'learning'}`,
        screenshot: screenshot,
        topic: selectedTopic || 'General Learning',
        conversationHistory: [],
        currentQuestion: '',
        isInitial: true
      }
      
      const response = await fetch('http://localhost:5001/api/process-tutoring-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData)
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.status === 'success') {
          const initialResponse = result.response
          setCurrentQuestion(initialResponse.next_question || initialResponse.speech_response)
          
          // Speak the initial question
          if ('speechSynthesis' in window && initialResponse.speech_response) {
            const utterance = new SpeechSynthesisUtterance(initialResponse.speech_response)
            utterance.rate = 0.9
            utterance.pitch = 1.0
            speechSynthesis.speak(utterance)
          }
          
          console.log('🤖 AI adaptive initial question:', initialResponse.speech_response)
          return
        }
      }
    } catch (error) {
      console.error('Error getting initial question from LLM:', error)
    }
    
    // Fallback to simple question if LLM fails
    const fallbackQuestion = selectedTopic 
      ? `Hi! Let's explore ${selectedTopic}. What would you like to know about this topic?`
      : "Hi! I see we have some content on the board. What would you like to learn?"
    
    setCurrentQuestion(fallbackQuestion)
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(fallbackQuestion)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      speechSynthesis.speak(utterance)
    }
    
    console.log('🤖 AI fallback question:', fallbackQuestion)
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
      
      // Prepare tutoring session data
      const tutorData = {
        speech: speech,
        screenshot: screenshot,
        topic: selectedTopic || 'General Learning',
        conversationHistory: microphoneHistory.slice(-5), // Last 5 utterances
        currentQuestion: currentQuestion,
        timestamp: new Date().toISOString()
      }
      
      console.log('🧠 Processing speech with LLM tutoring system...', {
        speech: speech,
        topic: tutorData.topic,
        hasScreenshot: !!screenshot
      })
      
      // Send to LLM tutoring API
      const response = await fetch('http://localhost:5001/api/process-tutoring-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tutorData)
      })
      
      if (!response.ok) {
        throw new Error(`Tutoring API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.status === 'success') {
        const tutorResponse = result.response
        
        // Use speech_response for BOTH TTS and display to avoid mismatch
        setCurrentQuestion(tutorResponse.speech_response)
        
        // Speak the AI's response (same as displayed)
        if ('speechSynthesis' in window && tutorResponse.speech_response) {
          const utterance = new SpeechSynthesisUtterance(tutorResponse.speech_response)
          utterance.rate = 0.9
          utterance.pitch = 1.0
          speechSynthesis.speak(utterance)
        }
        
        // Log teaching progress
        if (tutorResponse.teaching_notes) {
          console.log('📚 Teaching Notes:', tutorResponse.teaching_notes)
        }
        
        console.log('✅ LLM tutoring response processed successfully')
        
        // Note: Annotations are automatically processed by the backend
        if (result.annotations_processed) {
          console.log('🎨 Whiteboard annotations were drawn by the AI tutor')
        }
        
      } else {
        throw new Error(result.error || 'Tutoring session failed')
      }
      
    } catch (error) {
      console.error('Error in LLM tutoring session:', error)
      
      // Fallback to encourage continued interaction
      const fallbackQuestion = `I'm having trouble processing that. Could you tell me more about ${selectedTopic || 'what you\'re thinking'}?`
      setCurrentQuestion(fallbackQuestion)
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(fallbackQuestion)
        speechSynthesis.speak(utterance)
      }
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

  // Add manual clear function
  const clearWhiteboard = async () => {
    try {
      // Clear via API
      await fetch('http://localhost:5001/api/clear', { method: 'POST' })
      
      // Also clear locally in tldraw
      if (editorRef.current) {
        editorRef.current.selectAll()
        editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds())
      }
      
      console.log('🧹 Cleared whiteboard manually')
    } catch (error) {
      console.error('Error clearing whiteboard:', error)
    }
  }

  // Poll for drawing commands from Flask server (existing logic)
  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/commands')
        const commands = await response.json()
        
        if (commands.length > 0 && editorRef.current) {
          commands.forEach((command: { 
          type: string; 
          symbols?: Array<Array<[number, number]>>; 
          center?: {x: number, y: number}; 
          radius?: number;
          text?: string;
          x?: number;
          y?: number;
          color?: string;
          size?: string;
        }) => {
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
                  }, totalDelay * 1)
                  
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
        onClick={clearWhiteboard}
        style={{
          position: 'absolute',
          top: '10px',
          right: '80px',
          background: 'rgba(220, 53, 69, 0.8)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        🧹 Clear
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
