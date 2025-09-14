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
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: '#FFFFFF',
      px: 3
    }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: '560px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}>
        {/* Header */}
        <Box>
          <Typography variant="h3" sx={{ 
            fontSize: { xs: '1.75rem', sm: '2rem' },
            color: '#111827',
            fontWeight: 500,
            mb: 2,
            letterSpacing: '-0.01em'
          }}>
            Preparing Your Lesson
          </Typography>
          
          <Typography sx={{
            fontSize: '1.125rem',
            color: '#6B7280',
            fontWeight: 400
          }}>
            Topic: {topic}
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box>
          <Box sx={{ 
            width: '100%',
            height: 4,
            bgcolor: '#F3F4F6',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 3
          }}>
            <Box 
              sx={{
                height: '100%',
                width: `${overallProgress}%`,
                bgcolor: '#2563EB',
                transition: 'width 0.3s ease-out'
              }}
            />
          </Box>

          <Typography sx={{ 
            fontSize: '0.875rem',
            color: '#6B7280',
            fontWeight: 500,
            mb: 4
          }}>
            {Math.round(overallProgress)}% Complete
          </Typography>

          {/* Current Step */}
          <Typography sx={{
            fontSize: '1rem',
            color: '#111827',
            fontWeight: 500
          }}>
            {currentStep === 0 && "Analyzing content"}
            {currentStep === 1 && "Generating questions"}
            {currentStep === 2 && "Finalizing"}
          </Typography>
        </Box>

        {/* Step Indicators */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1.5 
        }}>
          {analysisSteps.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: index <= currentStep ? '#2563EB' : '#E5E7EB',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export default LoadingPage
