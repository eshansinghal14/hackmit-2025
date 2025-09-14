import React, { useEffect, useRef, useState } from 'react'
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
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [lectureSegments, setLectureSegments] = useState<any[]>([])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)
  const [isLectureMode, setIsLectureMode] = useState(false)

  // Initialize and start lecture
  useEffect(() => {
    if (selectedTopic) {
      startLecture()
    }
  }, [selectedTopic])



  const startLecture = async () => {
    try {
      console.log('🎓 Starting lecture for topic:', selectedTopic)
      
      const response = await fetch('http://localhost:5001/api/generate-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Basic Mathematics'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📚 Lecture generated:', data)
        
        if (data.lecture && data.lecture.lecture_segments) {
          setLectureSegments(data.lecture.lecture_segments)
          setIsLectureMode(true)
          setCurrentSegmentIndex(0)
          
          // Start presenting the first segment
          presentSegment(data.lecture.lecture_segments[0], 0)
        }
      } else {
        console.error('Failed to generate lecture')
        setCurrentQuestion('Failed to generate lecture. Please try again.')
      }
    } catch (error) {
      console.error('Error starting lecture:', error)
      setCurrentQuestion('Error starting lecture. Please try again.')
    }
  }
  
  
  const presentSegment = async (segment: any, index: number) => {
    console.log(`📖 Presenting segment ${index + 1}:`, segment)
    
    if (segment.type === 'context') {
      // Display context as text and speak it
      setCurrentQuestion(segment.content)
      
      // Draw context as text on whiteboard
      await drawTextToWhiteboard(segment.content, { x: 100, y: 100 + (index * 80) })
      
      // Speak the context using text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(segment.content)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        
        utterance.onend = () => {
          // Move to next segment after speech finishes
          const nextIndex = index + 1
          if (nextIndex < lectureSegments.length) {
            setCurrentSegmentIndex(nextIndex)
            presentSegment(lectureSegments[nextIndex], nextIndex)
          } else {
            // Lecture finished
            setIsLectureMode(false)
            setCurrentQuestion('Lecture completed! Click anywhere to continue exploring.')
          }
        }
        
        utterance.onerror = () => {
          // Fallback if speech fails - continue after delay
          setTimeout(() => {
            const nextIndex = index + 1
            if (nextIndex < lectureSegments.length) {
              setCurrentSegmentIndex(nextIndex)
              presentSegment(lectureSegments[nextIndex], nextIndex)
            } else {
              setIsLectureMode(false)
              setCurrentQuestion('Lecture completed! Click anywhere to continue exploring.')
            }
          }, 2000)
        }
        
        speechSynthesis.speak(utterance)
      } else {
        // No speech synthesis available - use delay
        setTimeout(() => {
          const nextIndex = index + 1
          if (nextIndex < lectureSegments.length) {
            setCurrentSegmentIndex(nextIndex)
            presentSegment(lectureSegments[nextIndex], nextIndex)
          } else {
            setIsLectureMode(false)
            setCurrentQuestion('Lecture completed! Click anywhere to continue exploring.')
          }
        }, 3000)
      }
    } else if (segment.type === 'action') {
      // Display action as LaTeX using existing drawing function
      await drawLatexToWhiteboard(segment.content, { x: 400, y: 150 + (index * 80) })
      
      // Move to next segment after a delay (no speech for LaTeX)
      setTimeout(() => {
        const nextIndex = index + 1
        if (nextIndex < lectureSegments.length) {
          setCurrentSegmentIndex(nextIndex)
          presentSegment(lectureSegments[nextIndex], nextIndex)
        } else {
          // Lecture finished
          setIsLectureMode(false)
          setCurrentQuestion('Lecture completed! You can now explore the whiteboard.')
        }
      }, 2000)
    }
  }
  
  const drawTextToWhiteboard = async (text: string, position: {x: number, y: number}) => {
    try {
      const response = await fetch('http://localhost:5001/api/process-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Basic Mathematics',
          annotations: [
            {
              type: 'text',
              position: position,
              content: text,
              color: '#2563eb',
              fontSize: 16
            }
          ]
        })
      })
      
      if (response.ok) {
        console.log('✅ Drew text to whiteboard:', text)
      }
    } catch (error) {
      console.error('Error drawing text:', error)
    }
  }
  
  const drawLatexToWhiteboard = async (latex: string, position: {x: number, y: number}) => {
    try {
      const response = await fetch('http://localhost:5001/api/process-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Basic Mathematics',
          annotations: [
            {
              type: 'latex',
              position: position,
              content: latex,
              color: '#dc2626'
            }
          ]
        })
      })
      
      if (response.ok) {
        console.log('✅ Drew LaTeX to whiteboard:', latex)
      }
    } catch (error) {
      console.error('Error drawing LaTeX:', error)
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
      
      {/* Lecture Status */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: isLectureMode ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)',
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
          animation: isLectureMode ? 'pulse 1s infinite' : 'none'
        }} />
        {isLectureMode ? `📚 Lecture in Progress (${currentSegmentIndex + 1}/${lectureSegments.length})` : '📚 Lecture Ready'}
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
          📚 {currentQuestion}
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
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '10px',
          right: '60px',
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
        📊 Graph
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
