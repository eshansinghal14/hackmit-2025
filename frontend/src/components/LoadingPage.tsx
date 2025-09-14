import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress, Card, CardContent, Container, LinearProgress } from '@mui/material'
import { Psychology, AutoAwesome, QuestionAnswer } from '@mui/icons-material'

interface LoadingPageProps {
  topic: string
  onComplete: () => void
}

const LoadingPage: React.FC<LoadingPageProps> = ({ topic, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const analysisSteps = [
    {
      icon: <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Researching Topic',
      description: `Gathering information about "${topic}"...`,
      duration: 3000
    },
    {
      icon: <AutoAwesome sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Analyzing with AI Agents',
      description: 'Running 5 specialized AI agents in parallel...',
      duration: 0 // Will be determined by actual API response
    },
    {
      icon: <QuestionAnswer sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Finalizing Roadmap',
      description: 'Consolidating results and preparing assessment...',
      duration: 2000
    }
  ]

  useEffect(() => {
    let stepTimer: NodeJS.Timeout
    let progressTimer: NodeJS.Timeout
    let pollTimer: NodeJS.Timeout | undefined

    const generateRoadmap = async () => {
      try {
        setIsGenerating(true)
        setCurrentStep(1) // Move to "Analyzing with AI Agents" step
        setProgress(0)

        const response = await fetch('http://localhost:5001/api/generate-roadmap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Roadmap generation completed:', result)
          
          // Move to final step
          setCurrentStep(2)
          setProgress(0)
          
          // Animate final step
          const finalStepDuration = analysisSteps[2].duration
          const progressInterval = 50
          const progressIncrement = 100 / (finalStepDuration / progressInterval)

          progressTimer = setInterval(() => {
            setProgress(prev => {
              const newProgress = prev + progressIncrement
              if (newProgress >= 100) {
                clearInterval(progressTimer)
                setTimeout(() => onComplete(), 500)
                return 100
              }
              return newProgress
            })
          }, progressInterval)
        } else {
          console.error('Roadmap generation failed:', response.statusText)
          // Still proceed to diagnostic for now
          setTimeout(() => onComplete(), 1000)
        }
      } catch (error) {
        console.error('Error generating roadmap:', error)
        // Still proceed to diagnostic for now
        setTimeout(() => onComplete(), 1000)
      } finally {
        setIsGenerating(false)
      }
    }

    const startStep = (stepIndex: number) => {
      if (stepIndex === 1) {
        // Start actual roadmap generation
        generateRoadmap()
        return
      }

      if (stepIndex >= analysisSteps.length) {
        return
      }

      setCurrentStep(stepIndex)
      setProgress(0)

      // Animate progress for current step
      const stepDuration = analysisSteps[stepIndex].duration
      const progressInterval = 50
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
      if (pollTimer) clearTimeout(pollTimer)
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
          maxWidth: '440px',
          textAlign: 'center'
        }}>
          {/* Header */}
          <Typography variant="h1" sx={{ 
            fontSize: { xs: '2rem', sm: '2.25rem' },
            color: '#111827',
            fontWeight: 600,
            mb: 1.5,
            letterSpacing: '-0.025em'
          }}>
            Preparing Your Lesson
          </Typography>
          
          <Typography sx={{
            fontSize: '1.125rem',
            color: '#6B7280',
            fontWeight: 400,
            mb: 8,
            letterSpacing: '-0.01em'
          }}>
            Topic: {topic}
          </Typography>

          {/* Progress Section */}
          <Box sx={{ mb: 8 }}>
            {/* Progress Bar */}
            <Box sx={{ 
              width: '100%',
              height: 2,
              bgcolor: '#F3F4F6',
              borderRadius: 1,
              overflow: 'hidden',
              mb: 4
            }}>
              <Box 
                sx={{
                  height: '100%',
                  width: `${overallProgress}%`,
                  bgcolor: '#000000',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </Box>

            {/* Progress Text */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography sx={{ 
                fontSize: '1rem',
                color: '#111827',
                fontWeight: 500
              }}>
                {Math.round(overallProgress)}% Complete
              </Typography>

              <Typography sx={{
                fontSize: '0.875rem',
                color: '#6B7280',
                fontWeight: 400
              }}>
                Step {currentStep + 1} of {analysisSteps.length}
              </Typography>
            </Box>

            {/* Current Step */}
            <Typography sx={{
              fontSize: '0.875rem',
              color: '#4B5563',
              fontWeight: 400,
              fontStyle: 'italic'
            }}>
              {currentStep === 0 && "Researching topic..."}
              {currentStep === 1 && (isGenerating ? "AI agents analyzing..." : "Preparing agents...")}
              {currentStep === 2 && "Consolidating results..."}
            </Typography>
          </Box>

          {/* Step Indicators */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 2
          }}>
            {analysisSteps.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: index <= currentStep ? '#111827' : '#E5E7EB'
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
  )
}

export default LoadingPage
