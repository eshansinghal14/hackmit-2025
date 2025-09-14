import React, { useState } from 'react'
import { Box, Typography, Button, Card, CardContent, LinearProgress } from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import KnowledgeGraph from './KnowledgeGraph'

interface DiagnosticTestProps {
  questions: string[]
  onComplete?: (answers: boolean[]) => void
  onClose?: () => void
  onWeightUpdate?: () => void
}

const DiagnosticTest: React.FC<DiagnosticTestProps> = ({ 
  questions, 
  onComplete,
  onClose,
  onWeightUpdate
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [graphKey, setGraphKey] = useState(0)

  const handleAnswer = async (answer: boolean) => {
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // Send diagnostic answer to backend for analysis
    try {
      const response = await fetch('http://localhost:5000/api/diagnostic/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questions[currentQuestionIndex],
          answer: answer,
          json_file_path: 'node_outputs/final_consolidated_nodes_basic_calculus.json'
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
    } catch (error) {
      console.error('❌ Error calling diagnostic API:', error)
    }

    if (currentQuestionIndex < questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Test complete
      setIsComplete(true)
      onComplete?.(newAnswers)
    }
  }

  const resetTest = () => {
    setCurrentQuestionIndex(0)
    setAnswers([])
    setIsComplete(false)
  }

  const progress = ((currentQuestionIndex + (isComplete ? 1 : 0)) / questions.length) * 100

  if (questions.length === 0) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            No questions provided
          </Typography>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </CardContent>
      </Card>
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
                Question {isComplete ? questions.length : currentQuestionIndex + 1} of {questions.length}
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
                <Box sx={{ mb: 4, minHeight: 120 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 3, 
                      textAlign: 'center',
                      fontSize: '1.2rem',
                      lineHeight: 1.4
                    }}
                  >
                    {questions[currentQuestionIndex]}
                  </Typography>
                </Box>

                {/* Answer Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 3, 
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={() => handleAnswer(true)}
                    sx={{
                      backgroundColor: '#4caf50',
                      '&:hover': {
                        backgroundColor: '#45a049'
                      },
                      py: 2,
                      px: 4,
                      fontSize: '1.1rem'
                    }}
                  >
                    Yes
                  </Button>
                  
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Cancel />}
                    onClick={() => handleAnswer(false)}
                    sx={{
                      backgroundColor: '#f44336',
                      '&:hover': {
                        backgroundColor: '#da190b'
                      },
                      py: 2,
                      px: 4,
                      fontSize: '1.1rem'
                    }}
                  >
                    No
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
                    {questions.map((question, index) => (
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
                      sx={{ px: 3 }}
                    >
                      Retake Test
                    </Button>
                    <Button
                      variant="contained"
                      onClick={onClose}
                      sx={{ px: 3 }}
                    >
                      Continue
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