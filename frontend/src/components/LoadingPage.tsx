import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress, Card, CardContent, Container, LinearProgress } from '@mui/material'
import { Psychology, AutoAwesome, QuestionAnswer } from '@mui/icons-material'

interface LoadingPageProps {
  topic: string
  onComplete: (questions: string[]) => void
}

const LoadingPage: React.FC<LoadingPageProps> = ({ topic, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  // Use predefined diagnostic questions from the calculus roadmap
  const getDiagnosticQuestions = (): string[] => {
    const rawQuestions = [
      "Do you understand the concept of a limit in calculus? (Yes/No)",
      "Can you apply basic derivative rules to find the derivative of a function? (Yes/No)",
      "Do you know how to use the chain rule for differentiation? (Yes/No)",
      "Can you evaluate a definite integral using the fundamental theorem of calculus? (Yes/No)",
      "Do you know how to apply calculus to solve optimization problems? (Yes/No)"
    ]
    
    // Crop questions to remove (Yes/No) suffix, keep only text until question mark
    return rawQuestions.map(question => {
      const questionMarkIndex = question.indexOf('?')
      return questionMarkIndex !== -1 ? question.substring(0, questionMarkIndex + 1) : question
    })
  }

  const analysisSteps = [
    {
      icon: <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Analyzing Topic',
      description: `Understanding "${topic}" and its key concepts...`,
      duration: 2000
    },
    {
      icon: <AutoAwesome sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Generating Questions',
      description: 'Creating personalized diagnostic questions...',
      duration: 2500
    },
    {
      icon: <QuestionAnswer sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Preparing Assessment',
      description: 'Setting up your learning experience...',
      duration: 1500
    }
  ]

  useEffect(() => {
    let stepTimer: NodeJS.Timeout
    let progressTimer: NodeJS.Timeout

    const startStep = (stepIndex: number) => {
      if (stepIndex >= analysisSteps.length) {
        // All steps complete - get diagnostic questions and pass them
        const questions = getDiagnosticQuestions()
        setTimeout(() => {
          onComplete(questions)
        }, 500)
        return
      }

      setCurrentStep(stepIndex)
      setProgress(0)

      // Animate progress for current step
      const stepDuration = analysisSteps[stepIndex].duration
      const progressInterval = 50 // Update every 50ms
      const progressIncrement = 100 / (stepDuration / progressInterval)

      progressTimer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + progressIncrement
          if (newProgress >= 100) {
            clearInterval(progressTimer)
            return 100
          }
          return newProgress
        })
      }, progressInterval)

      // Move to next step after duration
      stepTimer = setTimeout(() => {
        startStep(stepIndex + 1)
      }, stepDuration)
    }

    // Start the first step
    startStep(0)

    return () => {
      if (stepTimer) clearTimeout(stepTimer)
      if (progressTimer) clearInterval(progressTimer)
    }
  }, [topic, onComplete])

  const overallProgress = ((currentStep + (progress / 100)) / analysisSteps.length) * 100

  return (
    <Container maxWidth="md" sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4
    }}>
      <Card sx={{ 
        width: '100%', 
        maxWidth: 600, 
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        borderRadius: 3
      }}>
        <CardContent sx={{ p: 6, textAlign: 'center' }}>
          {/* Header */}
          <Typography variant="h4" gutterBottom sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}>
            Preparing Your Lesson
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Topic: {topic}
          </Typography>

          {/* Overall Progress */}
          <Box sx={{ mb: 4 }}>
            <LinearProgress 
              variant="determinate" 
              value={overallProgress} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: 4
                }
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(overallProgress)}% Complete
            </Typography>
          </Box>

          {/* Current Step */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ mb: 3 }}>
              {analysisSteps[currentStep]?.icon}
            </Box>
            
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
              {analysisSteps[currentStep]?.title}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {analysisSteps[currentStep]?.description}
            </Typography>

            {/* Step Progress */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <CircularProgress 
                variant="determinate" 
                value={progress}
                size={24}
                sx={{
                  color: 'primary.main'
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
          </Box>

          {/* Step Indicators */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            {analysisSteps.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: index <= currentStep ? 'primary.main' : 'grey.300',
                  transition: 'all 0.3s ease',
                  ...(index === currentStep && {
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                      '50%': {
                        transform: 'scale(1.2)',
                        opacity: 0.7,
                      },
                      '100%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                    }
                  })
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

export default LoadingPage
