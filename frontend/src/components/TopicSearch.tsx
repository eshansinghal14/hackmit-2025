import React, { useState } from 'react'
import { Box, Typography, TextField, Button, InputAdornment } from '@mui/material'
import { Send, AutoAwesome } from '@mui/icons-material'
import { Highlighter } from '@/components/magicui/highlighter'

interface TopicSearchProps {
  onSearch: (topic: string) => void
}

const TopicSearch: React.FC<TopicSearchProps> = ({ onSearch }) => {
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const generateRoadmap = async (searchTopic: string) => {
    if (!searchTopic.trim() || isLoading) return
    
    // Immediately navigate to loading page
    onSearch(searchTopic.trim())
    
    // Start the API call in the background
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:5001/api/generate-roadmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: searchTopic.trim() })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status === 'success') {
        // Save roadmap data to localStorage for the LoadingPage to access
        localStorage.setItem('currentRoadmap', JSON.stringify({
          topic: searchTopic.trim(),
          roadmap: data.roadmap,
          timestamp: new Date().toISOString()
        }))
        // Roadmap data is stored in localStorage for LoadingPage to access
      } else {
        // Save error to localStorage
        localStorage.setItem('roadmapError', data.error || 'Failed to generate roadmap')
        setError(data.error || 'Failed to generate roadmap')
      }
    } catch (err) {
      console.error('Error generating roadmap:', err)
      const errorMessage = 'Failed to connect to the server. Please make sure the backend is running.'
      localStorage.setItem('roadmapError', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      // Signal that the API call is complete
      localStorage.setItem('roadmapLoading', 'false')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      // Clear any previous roadmap data
      localStorage.removeItem('currentRoadmap')
      localStorage.removeItem('roadmapError')
      localStorage.setItem('roadmapLoading', 'true')
      generateRoadmap(topic)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && topic.trim()) {
      // Clear any previous roadmap data
      localStorage.removeItem('currentRoadmap')
      localStorage.removeItem('roadmapError')
      localStorage.setItem('roadmapLoading', 'true')
      generateRoadmap(topic)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setTopic(suggestion)
    // Clear any previous roadmap data
    localStorage.removeItem('currentRoadmap')
    localStorage.removeItem('roadmapError')
    localStorage.setItem('roadmapLoading', 'true')
    generateRoadmap(suggestion)
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      px: 3,
      py: 4
    }}>
      {/* Main Content */}
      <Box sx={{ 
        maxWidth: 768,
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <AutoAwesome sx={{ 
            fontSize: 48, 
            color: '#10a37f',
            mb: 2
          }} />
          <Typography variant="h2" sx={{ 
            fontWeight: 600,
            color: '#2d333a',
            mb: 2,
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}>
            <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              AI Learning Roadmap
            </span>
          </Typography>
          <Typography variant="h6" sx={{ 
            color: '#6e6e80',
            fontWeight: 400,
            lineHeight: 1.5,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
          }}>
            Generate a{' '}
            <Highlighter action="underline" color="#10a37f" animationDuration={1000} strokeWidth={2} iterations={1} isView={true}>
              personalized learning path
            </Highlighter>{' '}
            with{' '}
            <Highlighter action="highlight" color="#e8f5e8" animationDuration={1200} strokeWidth={1} iterations={1} isView={true}>
              structured lessons and assessments
            </Highlighter>
          </Typography>
        </Box>

        {/* Search Input */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 6 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="What would you like to learn?"
            autoComplete="off"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '1rem',
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#10a37f',
                  boxShadow: '0 2px 8px rgba(16, 163, 127, 0.1)'
                },
                '&.Mui-focused': {
                  borderColor: '#10a37f',
                  boxShadow: 'none',
                  outline: 'none'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  border: '1px solid #d1d5db'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#10a37f'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#10a37f',
                  borderWidth: '1px'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!topic.trim() || isLoading}
                    sx={{
                      minWidth: 'auto',
                      borderRadius: 1.5,
                      px: 3,
                      py: 1,
                      backgroundColor: '#10a37f',
                      '&:hover': {
                        backgroundColor: '#0d8f6b'
                      },
                      '&:disabled': {
                        backgroundColor: '#f3f4f6',
                        color: '#9ca3af'
                      }
                    }}
                  >
                    {isLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            border: '2px solid #ffffff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' }
                            }
                          }}
                        />
                      </Box>
                    ) : (
                      <Send sx={{ fontSize: 18 }} />
                    )}
                  </Button>
                </InputAdornment>
              )
            }}
          />
        </Box>

        {/* Error Display */}
        {error && (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ 
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 2,
              px: 3,
              py: 2,
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Suggestions */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="body2" sx={{ 
            color: '#6e6e80',
            mb: 3,
            fontWeight: 500
          }}>
            <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Try these popular topics:
            </span>
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 2, 
            justifyContent: 'center',
            maxWidth: 800,
            mx: 'auto'
          }}>
            {[
              'Linear Algebra',
              'Calculus Fundamentals',
              'Machine Learning Basics',
              'Statistics & Probability',
              'Data Structures',
              'Differential Equations',
              'Python Programming',
              'Neural Networks'
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outlined"
                onClick={() => handleSuggestionClick(suggestion)}
                sx={{
                  borderRadius: 20,
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  px: 3,
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  '&:hover': {
                    borderColor: '#10a37f',
                    color: '#10a37f',
                    backgroundColor: '#f0fdf4'
                  }
                }}
              >
                {suggestion}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="caption" sx={{ 
            color: '#9ca3af',
            fontSize: '0.75rem'
          }}>
            <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
              Powered by{' '}
              <Highlighter action="underline" color="#10a37f" strokeWidth={1.5} animationDuration={800} iterations={1} isView={true}>
                Cerebras AI
              </Highlighter>{' '}
              and comprehensive web research
            </span>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default TopicSearch
