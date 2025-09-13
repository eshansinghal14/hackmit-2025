import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material'
import {
  School,
  Mic,
  Draw,
  AutoAwesome,
  AccountTree,
  Keyboard,
  VolumeUp,
  Gesture,
  Info,
  CheckCircle
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0)
  const { setVoiceEnabled } = useAppStore()
  
  const steps = [
    {
      label: 'Welcome to AI Whiteboard Tutor',
      content: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <School sx={{ fontSize: 80, color: 'primary.main' }} />
            </motion.div>
          </Box>
          
          <Typography variant="h6" gutterBottom align="center">
            Your AI-Powered Math Learning Companion
          </Typography>
          
          <Typography variant="body1" paragraph>
            Welcome to an interactive learning experience where AI meets mathematics! 
            This intelligent whiteboard provides real-time tutoring with voice interaction, 
            visual feedback, and personalized guidance.
          </Typography>
          
          <Card variant="outlined" sx={{ mt: 2, bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                🎯 What makes this special:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><AutoAwesome color="primary" /></ListItemIcon>
                  <ListItemText primary="AI tutor that observes your work and provides intelligent hints" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><VolumeUp color="primary" /></ListItemIcon>
                  <ListItemText primary="Voice interaction - just speak naturally" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Gesture color="primary" /></ListItemIcon>
                  <ListItemText primary="Interactive annotations and visual guidance" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      )
    },
    {
      label: 'Drawing & Interaction',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            <Draw sx={{ mr: 1, verticalAlign: 'middle' }} />
            Interactive Whiteboard
          </Typography>
          
          <Typography variant="body1" paragraph>
            Use the whiteboard just like a real one! Draw mathematical expressions, 
            diagrams, and work through problems step by step.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Drawing Tools
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Pen" 
                      secondary="Precise drawing (E key)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Brush" 
                      secondary="Thicker strokes (B key)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Highlighter" 
                      secondary="Emphasize content (H key)" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Quick Actions
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Undo/Redo" 
                      secondary="Ctrl+Z / Ctrl+Y" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Clear Canvas" 
                      secondary="Ctrl+Shift+C" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Zoom Controls" 
                      secondary="Mouse wheel or toolbar" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )
    },
    {
      label: 'Voice Interaction',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            <Mic sx={{ mr: 1, verticalAlign: 'middle' }} />
            Talk to Your AI Tutor
          </Typography>
          
          <Typography variant="body1" paragraph>
            Enable voice to have natural conversations with your AI tutor. 
            Ask questions, request help, or simply think out loud!
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2, bgcolor: 'info.50' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                📢 What you can say:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="How do I solve this?" size="small" />
                <Chip label="I'm stuck on this step" size="small" />
                <Chip label="Can you explain derivatives?" size="small" />
                <Chip label="Is this correct?" size="small" />
                <Chip label="I need a hint" size="small" />
              </Box>
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
            <Info color="warning" />
            <Box>
              <Typography variant="subtitle2">
                Press <strong>Space</strong> to toggle voice recording
              </Typography>
              <Typography variant="caption" color="text.secondary">
                The AI listens continuously and responds when appropriate
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Mic />}
              onClick={() => setVoiceEnabled(true)}
            >
              Enable Voice Now
            </Button>
          </Box>
        </Box>
      )
    },
    {
      label: 'AI Features & Knowledge',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
            Intelligent Tutoring Features
          </Typography>
          
          <Typography variant="body1" paragraph>
            Your AI tutor uses advanced reasoning to provide personalized guidance 
            and tracks your learning progress.
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
            <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="success.dark" gutterBottom>
                  <AccountTree sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Knowledge Graph
                </Typography>
                <Typography variant="body2">
                  View your learning progress and concept mastery in an interactive graph. 
                  Access it via <strong>Ctrl+G</strong> or the toolbar.
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary.dark" gutterBottom>
                  <AutoAwesome sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Smart Interventions
                </Typography>
                <Typography variant="body2">
                  The AI observes your work and intervenes only when needed - 
                  offering hints, corrections, or encouragement at the right moment.
                </Typography>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="info.dark" gutterBottom>
                  <Gesture sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Visual Annotations
                </Typography>
                <Typography variant="body2">
                  Watch as the AI cursor highlights important parts, 
                  draws arrows, and adds visual explanations to your work.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )
    },
    {
      label: 'Ready to Learn!',
      content: (
        <Box textAlign="center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          </motion.div>
          
          <Typography variant="h6" gutterBottom>
            You're All Set!
          </Typography>
          
          <Typography variant="body1" paragraph>
            Start by drawing a math problem or asking a question. 
            Your AI tutor is ready to help you learn and explore mathematics!
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                💡 Quick Reminder - Keyboard Shortcuts:
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, mt: 1 }}>
                <Typography variant="caption"><Keyboard sx={{ fontSize: 14, mr: 0.5 }} />Space: Toggle Voice</Typography>
                <Typography variant="caption"><Keyboard sx={{ fontSize: 14, mr: 0.5 }} />Ctrl+G: Knowledge Graph</Typography>
                <Typography variant="caption"><Keyboard sx={{ fontSize: 14, mr: 0.5 }} />F11: Fullscreen</Typography>
                <Typography variant="caption"><Keyboard sx={{ fontSize: 14, mr: 0.5 }} />Ctrl+S: Settings</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )
    }
  ]
  
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
  }
  
  const handleClose = () => {
    onClose()
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 600
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School color="primary" />
          <Typography variant="h6">
            AI Whiteboard Tutor - Quick Start
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="subtitle1" fontWeight={600}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Box sx={{ mt: 2, mb: 2 }}>
                  {step.content}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button 
          onClick={handleClose} 
          color="inherit"
        >
          Skip Tutorial
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleClose}
              startIcon={<CheckCircle />}
            >
              Start Learning!
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}

export default WelcomeModal
