import React, { useEffect, useRef, useState } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import TopicSearch from './components/TopicSearch'
import LoadingPage from './components/LoadingPage'
import DiagnosticTest from './components/DiagnosticTest'
import KnowledgeGraph from './components/KnowledgeGraph'
import MicrophoneWhiteboard from './components/MicrophoneWhiteboard'

type AppState = 'search' | 'loading' | 'diagnostic' | 'graph' | 'whiteboard'

const App: React.FC = () => {
  const editorRef = useRef<any>(null)
  const [appState, setAppState] = useState<AppState>('search')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [graphKey, setGraphKey] = useState(0)
  const [currentLearningTopic, setCurrentLearningTopic] = useState('')

  const handleTopicSearch = (topic: string) => {
    setSelectedTopic(topic)
    setAppState('loading')
  }

  const handleLoadingComplete = () => {
    // Questions are now loaded dynamically by DiagnosticTest
    setAppState('diagnostic')
  }

  const handleDiagnosticComplete = (answers: boolean[]) => {
    console.log('Diagnostic results for', selectedTopic, ':', answers)
    const yesCount = answers.filter(Boolean).length
    console.log(`Student answered "Yes" to ${yesCount}/${answers.length} questions`)
    setAppState('graph')
  }

  const handleWeightUpdate = () => {
    // Force KnowledgeGraph to reload with updated weights after each diagnostic answer
    setGraphKey(prev => prev + 1)
  }

  const handleDiagnosticClose = () => {
    setAppState('search')
  }
  
  // Poll for drawing commands from Flask server
  useEffect(() => {
    const pollCommands = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/commands')
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
  

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {appState === 'search' && (
        <TopicSearch onSearch={handleTopicSearch} />
      )}
      
      {appState === 'loading' && (
        <LoadingPage topic={selectedTopic} onComplete={handleLoadingComplete} />
      )}
      
      {appState === 'diagnostic' && (
        <DiagnosticTest 
          onComplete={handleDiagnosticComplete}
          onClose={handleDiagnosticClose}
          onWeightUpdate={handleWeightUpdate}
        />
      )}
      
      {appState === 'graph' && (
        <div style={{ height: '100vh', position: 'relative' }}>
          <KnowledgeGraph 
            key={graphKey} 
            onLearnTopic={(topic) => {
              console.log('Learning:', topic)
              setCurrentLearningTopic(topic)
              setAppState('whiteboard')
            }} 
          />
          <button
            onClick={() => setAppState('search')}
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
            ← Back to Search
          </button>
        </div>
      )}
      
      {appState === 'whiteboard' && (
        <MicrophoneWhiteboard 
          onBack={() => setAppState('search')} 
          selectedTopic={currentLearningTopic || selectedTopic}
        />
      )}
    </div>
  )
}

export default App
