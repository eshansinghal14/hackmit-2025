import React, { useState } from 'react'
import { Box, Typography, TextField, Button, Card, CardContent, Container } from '@mui/material'
import { Search, ArrowForward } from '@mui/icons-material'

interface TopicSearchProps {
  onSearch: (topic: string) => void
}

const TopicSearch: React.FC<TopicSearchProps> = ({ onSearch }) => {
  const [topic, setTopic] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (topic.trim()) {
      onSearch(topic.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && topic.trim()) {
      onSearch(topic.trim())
    }
  }

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
        <CardContent sx={{ p: 6 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Search sx={{ 
              fontSize: 64, 
              color: 'primary.main', 
              mb: 2 
            }} />
            <Typography variant="h3" gutterBottom sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}>
              AI Math Tutor
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              What would you like to learn today?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter any math topic and we'll create a personalized learning experience
            </Typography>
          </Box>

          {/* Search Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="e.g., quadratic equations, derivatives, trigonometry..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.1rem',
                  padding: '4px',
                  '& fieldset': {
                    borderWidth: 2,
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '16px 14px',
                }
              }}
              InputProps={{
                startAdornment: (
                  <Search sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
            />
            
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={!topic.trim()}
              endIcon={<ArrowForward />}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                  boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: 'grey.300',
                  color: 'grey.500',
                  boxShadow: 'none',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Start Learning
            </Button>
          </Box>

          {/* Example Topics */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Popular topics:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {[
                'Algebra',
                'Calculus', 
                'Geometry',
                'Trigonometry',
                'Statistics',
                'Linear Equations'
              ].map((exampleTopic) => (
                <Button
                  key={exampleTopic}
                  variant="outlined"
                  size="small"
                  onClick={() => setTopic(exampleTopic)}
                  sx={{
                    borderRadius: 20,
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    }
                  }}
                >
                  {exampleTopic}
                </Button>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}

export default TopicSearch
