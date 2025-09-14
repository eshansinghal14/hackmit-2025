import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, Card, CardContent, LinearProgress, CircularProgress } from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import KnowledgeGraph from './KnowledgeGraph'

interface DiagnosticTestProps {
  onComplete?: (answers: boolean[]) => void
  onClose?: () => void
  onWeightUpdate?: () => void
}

const DiagnosticTest: React.FC<DiagnosticTestProps> = ({ 
  onComplete,
  onClose,
  onWeightUpdate
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [graphKey, setGraphKey] = useState(0)
  const [questions, setQuestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false) // New state for tracking answer processing

  // Load questions from roadmap data
  const loadQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5001/api/nodes')
      const data = await response.json()
      
      // Use only the predefined questions from the second array
      if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        const questionsToUse = data[1].map((q: string) => {
          // Clean up questions by removing (Yes/No) suffix
          const questionMarkIndex = q.indexOf('?')
          return questionMarkIndex !== -1 ? q.substring(0, questionMarkIndex + 1) : q
        })
        
        setQuestions(questionsToUse)
        setError(null)
        console.log(`✅ Loaded ${questionsToUse.length} diagnostic questions`)
      } else {
        throw new Error('No predefined questions found in roadmap data')
      }
    } catch (err) {
      console.error('❌ Failed to load questions:', err)
      setError('Failed to load diagnostic questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  const handleAnswer = async (answer: boolean) => {
    if (isProcessingAnswer) return // Prevent multiple clicks while processing

    setIsProcessingAnswer(true) // Disable buttons
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    try {
      // Send diagnostic answer to backend for analysis
      const response = await fetch('http://localhost:5001/api/diagnostic/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questions[currentQuestionIndex],
          answer: answer,
          json_file_path: 'node_outputs/final_consolidated_roadmap.json'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Weight adjustments:', result.weight_adjustments)
        // Force KnowledgeGraph to reload with updated weights after each question
        setGraphKey(prev => prev + 1)
        onWeightUpdate?.()
      } else {
        console.error('❌ Failed to update weights:', result.error)
      }

      // Add bounds checking to prevent crashes
      if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      } else {
        // Test complete
        setIsComplete(true)
        onComplete?.(newAnswers)
      }
    } catch (error) {
      console.error('❌ Error calling diagnostic API:', error)
    } finally {
      setIsProcessingAnswer(false) // Re-enable buttons
    }
  }

  const resetTest = () => {
    setCurrentQuestionIndex(0)
    setAnswers([])
    setIsComplete(false)
    setGraphKey(prev => prev + 1)
  }

  const progress = ((currentQuestionIndex + (isComplete ? 1 : 0)) / questions.length) * 100

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ maxWidth: 400, mx: 'auto', textAlign: 'center' }}>
          <CardContent>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Loading Diagnostic Questions...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fetching questions from your learning roadmap
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (error || questions.length === 0) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ maxWidth: 600, mx: 'auto' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="error">
              {error || 'No questions available'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {error ? 'Please check your connection and try again.' : 'No diagnostic questions could be generated from the roadmap data.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  borderColor: '#d1d5db',
                  color: '#6e6e80',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f8fafc'
                  }
                }}
              >
                ← Back to Search
              </Button>
              {error && (
                <Button 
                  variant="contained" 
                  onClick={loadQuestions}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: '#2d333a',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#1f2329'
                    }
                  }}
                >
                  Retry
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Left Side - Knowledge Graph */}
      <Box sx={{ width: '60%', height: '100%' }}>
        <KnowledgeGraph key={graphKey} onLearnTopic={(topic) => console.log('Learning:', topic)} />
      </Box>

      {/* Right Side - Diagnostic Test */}
      <Box sx={{ 
        width: '40%', 
        height: '100%', 
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Card sx={{ width: '100%', maxWidth: 500 }}>
          <CardContent>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Diagnostic Assessment
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Question {isComplete ? questions.length : Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </Box>

            {!isComplete ? (
              <>
                {/* Current Question */}
                <Box sx={{ 
                  mb: 4, 
                  p: 4,
                  backgroundColor: '#ffffff',
                  borderRadius: 3,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      textAlign: 'center',
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                      color: '#374151',
                      fontWeight: 400
                    }}
                  >
                    {questions[currentQuestionIndex] || 'Question not available'}
                  </Typography>
                </Box>

                {/* Answer Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'center',
                  flexDirection: 'row',
                  maxWidth: 400,
                  margin: '0 auto'
                }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={isProcessingAnswer ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                    onClick={() => handleAnswer(true)}
                    disabled={isProcessingAnswer}
                    sx={{
                      flex: 1,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      borderRadius: 2,
                      py: 2.5,
                      px: 4,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                      textTransform: 'none',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      '&:hover': {
                        backgroundColor: '#059669',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                        transform: 'translateY(-1px)'
                      },
                      '&:disabled': {
                        backgroundColor: '#10b981',
                        opacity: 0.7,
                        cursor: 'not-allowed'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {isProcessingAnswer ? 'Processing...' : 'Yes, I know this'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={isProcessingAnswer ? <CircularProgress size={20} /> : <Cancel />}
                    onClick={() => handleAnswer(false)}
                    disabled={isProcessingAnswer}
                    sx={{
                      flex: 1,
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      backgroundColor: '#ffffff',
                      borderRadius: 2,
                      py: 2.5,
                      px: 4,
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                      textTransform: 'none',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        backgroundColor: '#f9fafb',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        transform: 'translateY(-1px)'
                      },
                      '&:disabled': {
                        borderColor: '#d1d5db',
                        color: '#9ca3af',
                        cursor: 'not-allowed'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {isProcessingAnswer ? 'Processing...' : 'No, I need to learn'}
                  </Button>
                </Box>
              </>
            ) : (
              <>
                {/* Completion Screen */}
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Assessment Complete!
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    You answered {answers.filter(Boolean).length} out of {questions.length} questions with "Yes"
                  </Typography>

                  {/* Results Summary */}
                  <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    backgroundColor: 'grey.100', 
                    borderRadius: 2,
                    maxHeight: 200,
                    overflowY: 'auto'
                  }}>
                    <Typography variant="h6" gutterBottom>
                      Your Responses:
                    </Typography>
                    {questions.slice(0, answers.length).map((question, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1,
                        textAlign: 'left'
                      }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: answers[index] ? 'success.main' : 'error.main',
                          mr: 2,
                          flexShrink: 0
                        }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {question}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            ml: 2, 
                            fontWeight: 'bold',
                            color: answers[index] ? 'success.main' : 'error.main'
                          }}
                        >
                          {answers[index] ? 'Yes' : 'No'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexDirection: 'column' }}>
                    <Button
                      variant="outlined"
                      onClick={resetTest}
                      sx={{ 
                        px: 3,
                        borderRadius: 2,
                        borderColor: '#d1d5db',
                        color: '#6e6e80',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          backgroundColor: '#f8fafc'
                        }
                      }}
                    >
                      Retake Test
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onClose}
                      sx={{ 
                        px: 3,
                        borderRadius: 2,
                        backgroundColor: '#2d333a',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#1f2329'
                        }
                      }}
                    >
                      ← Back to Search
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default DiagnosticTest