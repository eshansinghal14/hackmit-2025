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
        console.log('🔍 Lecture segments:', data.lecture?.lecture_segments)
        console.log('📊 Segments length:', data.lecture?.lecture_segments?.length)
        
        if (data.lecture && data.lecture.lecture_segments) {
          const segments = data.lecture.lecture_segments
          console.log('✅ Setting lecture segments:', segments)
          setLectureSegments(segments)
          setIsLectureMode(true)
          setCurrentSegmentIndex(0)
          
          // Start presenting the first segment with segments array passed directly
          presentLectureSegments(segments)
        } else {
          console.error('❌ No lecture segments found in response:', data)
          setCurrentQuestion('No lecture content generated. Please try again.')
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
  
  
  const presentLectureSegments = async (segments: any[]) => {
    console.log(`🎓 Starting lecture with ${segments.length} segments`)
    
    let latexYPosition = 100 // Starting Y position for LaTeX equations
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      console.log(`📖 Presenting segment ${i + 1}/${segments.length}:`, segment)
      
      setCurrentSegmentIndex(i)
      
      try {
        if (segment.type === 'context') {
          // Context: Show text only, no TTS
          setCurrentQuestion(segment.content)
          console.log(`📝 Displaying context text: "${segment.content}"`)
          
          // Calculate delay based on text length
          const textLength = segment.content.length
          const delay = textLength * 50
          console.log(`⏱️ Text length: ${textLength} chars, delay: ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } else if (segment.type === 'action') {
          // Action: Write LaTeX to whiteboard and show description
          console.log(`🖊️ Writing LaTeX to whiteboard: "${segment.content}" at position y=${latexYPosition}`)
          
          // Show description as current question first
          setCurrentQuestion(segment.description || segment.content)
          console.log(`📝 Displaying action description: "${segment.description || segment.content}"`)
          
          try {
            // Draw LaTeX synchronously and wait for completion
            console.log(`🎯 Drawing LaTeX at position: x=100, y=${latexYPosition}`)
            await drawLatexToWhiteboardSync(segment.content, { x: 100, y: latexYPosition })
            console.log(`✅ Successfully drew LaTeX: "${segment.content}" at y=${latexYPosition}`)
            
            // Increment Y position for next LaTeX equation (spacing of 80 pixels)
            latexYPosition += 80
            console.log(`📏 Next LaTeX will be at y=${latexYPosition}`)
          } catch (error) {
            console.error(`❌ Error drawing LaTeX "${segment.content}":`, error)
          }
        } else if (segment.type === 'question') {
          // Question: Ask student to write answer on whiteboard
          console.log(`❓ Asking question: "${segment.content}"`)
          setCurrentQuestion(segment.content)
          
          // Wait for user to write answer (pause lecture)
          console.log(`⏸️ Pausing lecture for student response...`)
          await waitForStudentAnswer(segment.expected_answer)
        }
      } catch (error) {
        console.error(`❌ Error in segment ${i + 1}:`, error)
        // Continue to next segment after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Lecture finished
    console.log(`✅ Lecture completed`)
    setIsLectureMode(false)
    setCurrentQuestion('Lecture completed! Click anywhere to continue exploring.')
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
  
  const waitForStudentAnswer = async (expectedAnswer: string) => {
    return new Promise<void>((resolve) => {
      console.log(`⏳ Waiting for student to write answer on whiteboard...`)
      console.log(`📝 Expected answer format: ${expectedAnswer}`)
      
      let inactivityTimer: NodeJS.Timeout
      let lastActivity = Date.now()
      let hasStartedWriting = false
      
      const checkInactivity = () => {
        if (!hasStartedWriting) {
          // Keep checking until user starts writing
          inactivityTimer = setTimeout(checkInactivity, 100)
          return
        }
        
        const timeSinceLastActivity = Date.now() - lastActivity
        if (timeSinceLastActivity >= 3000) { // 3 seconds of inactivity after writing starts
          console.log(`📸 Taking screenshot after 3 seconds of inactivity`)
          takeScreenshotAndValidate(expectedAnswer, resolve)
        } else {
          inactivityTimer = setTimeout(checkInactivity, 100)
        }
      }
      
      // Monitor drawing activity
      const handleActivity = () => {
        if (!hasStartedWriting) {
          hasStartedWriting = true
          console.log(`✏️ Student started writing - beginning inactivity timer`)
        }
        lastActivity = Date.now()
        clearTimeout(inactivityTimer)
        inactivityTimer = setTimeout(checkInactivity, 100)
      }
      
      // Start monitoring
      if (editorRef.current) {
        editorRef.current.on('change', handleActivity)
      }
      
      // Initial timer (will wait until writing starts)
      inactivityTimer = setTimeout(checkInactivity, 100)
    })
  }

  const takeScreenshotAndValidate = async (expectedAnswer: string, resolve: () => void) => {
    try {
      console.log(`📸 Taking screenshot for answer validation`)
      
      // Take screenshot of the whiteboard
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        console.error('❌ No canvas found for screenshot')
        resolve()
        return
      }
      
      const dataURL = canvas.toDataURL('image/png')
      
      // Send to backend for validation
      const response = await fetch('http://localhost:5001/api/validate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot: dataURL,
          expected_answer: expectedAnswer
        })
      })
      
      const result = await response.json()
      
      if (result.correct) {
        setCurrentQuestion(`✅ Good job! ${result.feedback || 'Your answer is correct.'}`)
        console.log(`✅ Student answer is correct`)
      } else {
        setCurrentQuestion(`❌ ${result.feedback || 'That\'s not quite right. Let me explain...'} ${result.explanation || ''}`)
        console.log(`❌ Student answer is incorrect`)
      }
      
      // Wait a moment to show feedback, then end lecture
      setTimeout(() => {
        setCurrentQuestion('Lecture completed!')
        resolve()
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error validating answer:', error)
      setCurrentQuestion('Lecture completed!')
      resolve()
    }
  }

  const drawLatexToWhiteboardSync = async (latex: string, position: {x: number, y: number}) => {
    try {
      console.log(`🎨 Starting synchronous LaTeX drawing: "${latex}" at position (${position.x}, ${position.y})`)
      
      // Call the direct LaTeX drawing endpoint
      console.log(`📡 Making request to: http://localhost:5001/api/draw-latex`)
      console.log(`📦 Request body:`, { latex, x: position.x, y: position.y })
      
      const response = await fetch('http://localhost:5001/api/draw-latex', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          latex: latex,
          x: position.x,
          y: position.y
        })
      }).catch(error => {
        console.error('🚨 Fetch error details:', error)
        throw error
      })
      
      if (response.ok) {
        console.log(`✅ LaTeX drawing request sent successfully`)
        
        // Wait a moment for the drawing to be processed
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Poll for drawing commands
        const commandsResponse = await fetch('http://localhost:5001/api/commands')
        const commands = await commandsResponse.json()
        
        if (commands.length > 0) {
          console.log(`📋 Found ${commands.length} drawing commands, processing...`)
          
          // Process all drawing commands
          if (editorRef.current) {
            commands.forEach((command: { type: string; symbols?: Array<Array<[number, number]>> }) => {
              if (command.type === 'create_shape') {
                console.log(`🖊️ Drawing LaTeX with progressive animation`)
                
                // Calculate total delay counter for consistent timing
                let totalDelay = 0;
                
                command.symbols?.forEach((points) => {
                  // Draw lines between consecutive point pairs with consistent delays
                  for (let i = 0; i < points.length - 1; i++) {
                    const start = points[i];
                    const end = points[i + 1];
                    
                    setTimeout(() => {
                      if (editorRef.current) {
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
                      }
                    }, totalDelay * 1); // 5ms delay between each line
                    
                    totalDelay++; // Increment for next line
                  }
                })
              } else if (command.type === 'clear_all') {
                editorRef.current.selectAll()
                editorRef.current.deleteShapes(editorRef.current.getSelectedShapeIds())
              }
            })
          }
          // Clear the processed commands
          await fetch('http://localhost:5001/api/commands', { method: 'DELETE' })
          console.log(`✅ LaTeX drawing completed and commands cleared`)
        } else {
          console.log(`⚠️ No drawing commands found`)
        }
      } else {
        console.error(`❌ LaTeX drawing request failed: ${response.status}`)
      }
      
      
    } catch (error) {
      console.error('❌ Error in synchronous LaTeX drawing:', error)
    }
  }


  // Disabled polling since we're using synchronous LaTeX drawing
  // useEffect(() => {
  //   // Polling disabled - LaTeX drawing is now synchronous
  // }, [])

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
