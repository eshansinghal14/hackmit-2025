import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material'
import {
  Close as CloseIcon,
  Draw as DrawIcon,
  Mic as MicIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material'

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0)
  
  const steps = [
    {
      label: 'Setup',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle2" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main',
              fontSize: '0.8125rem'
            }}>
              <MicIcon sx={{ fontSize: 16 }} />
              Enable Voice Input
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<MicIcon />}
              onClick={async () => {
                try {
                  const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                  if (result.state === 'granted') {
                    console.log('Microphone permission already granted');
                  } else if (result.state === 'prompt') {
                    // Just check permission without activating
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    console.log('Microphone permission granted');
                  }
                } catch (err) {
                  console.error('Error checking microphone permission:', err);
                }
              }}
              sx={{ 
                mt: 1.5,
                textTransform: 'none',
                fontSize: '0.75rem'
              }}
            >
              Enable Microphone
            </Button>
          </Box>
        </Box>
      )
    },
    {
      label: 'Tools',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Drawing Tools
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DrawIcon sx={{ fontSize: 16 }} /> Pen
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  P
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DrawIcon sx={{ fontSize: 16 }} /> Eraser
          </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  E
          </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} /> LaTeX
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  L
                </Typography>
              </Box>
            </Box>
          </Box>

        <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Shapes & Functions
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  Rectangle
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  R
          </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  Ellipse
          </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  O
              </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  Line
              </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  /
              </Typography>
              </Box>
            </Box>
          </Box>
          
        <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Actions
          </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  Undo / Redo
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  ⌘Z / ⌘⇧Z
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  Select All
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  ⌘A
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MicIcon sx={{ fontSize: 16 }} /> Voice Input
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'text.secondary' }}>
                  Space
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )
    },
    {
      label: 'Commands',
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Mathematical Help
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Solve this equation"
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Find the derivative of..."
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Graph this function"
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Learning Support
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Explain the concept of..."
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Show me a similar example"
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "What's the next step?"
          </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ 
              fontSize: '0.75rem', 
              color: 'text.primary', 
              fontWeight: 500,
              mb: 1
            }}>
              Drawing Commands
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Draw a coordinate plane"
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Plot points at..."
          </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                • "Clear the board"
              </Typography>
            </Box>
              </Box>
        </Box>
      )
    }
  ]
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '90%',
          maxWidth: '900px',
          height: '90%',
          maxHeight: '550px',
          m: 2,
          borderRadius: 0,
          bgcolor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          color: 'text.secondary'
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Navigation */}
        <Box sx={{
          width: 240,
          minWidth: 240,
          borderRight: '1px solid',
          borderColor: 'divider',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <Box>
            <Typography variant="h6" sx={{
              fontSize: '0.9375rem',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 0.5
            }}>
              Whiteboard
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'text.secondary',
              fontSize: '0.8125rem',
              letterSpacing: '0.01em'
            }}>
              Advanced mathematical collaboration
          </Typography>
        </Box>
      
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
                <StepLabel onClick={() => setActiveStep(index)} sx={{ cursor: 'pointer' }}>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 500,
                    fontSize: '0.8125rem'
                  }}>
                  {step.label}
                </Typography>
              </StepLabel>
              <StepContent>
                  {step.content}
              </StepContent>
            </Step>
          ))}
        </Stepper>
        </Box>

        {/* Right Panel - Preview */}
        <Box sx={{
          flex: 1,
          bgcolor: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              height: '90%'
            }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 400"
                style={{
                  overflow: 'visible'
                }}
              >
                {/* Grid lines */}
                {[...Array(15)].map((_, i) => (
                  <line
                    key={`vgrid-${i}`}
                    x1={100 + i * 50}
                    y1="50"
                    x2={100 + i * 50}
                    y2="350"
                    stroke="#f0f0f0"
                    strokeWidth="1"
                  />
                ))}
                {[...Array(7)].map((_, i) => (
                  <line
                    key={`hgrid-${i}`}
                    x1="50"
                    y1={75 + i * 50}
                    x2="750"
                    y2={75 + i * 50}
                    stroke="#f0f0f0"
                    strokeWidth="1"
                  />
                ))}

                {/* Axes */}
                <line
                  x1="50"
                  y1="200"
                  x2="750"
                  y2="200"
                  stroke="#ccc"
                  strokeWidth="1.5"
                />
                <line
                  x1="400"
                  y1="50"
                  x2="400"
                  y2="350"
                  stroke="#ccc"
                  strokeWidth="1.5"
                />

                {/* Function Set 1: Quadratic and Linear */}
                <g style={{ animation: 'sequence1 16s infinite' }}>
                  <g>
                    <path
                      d="M 100,200 Q 400,50 700,200"
                      fill="none"
                      stroke="#2196f3"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <path
                      d="M 100,350 L 700,50"
                      fill="none"
                      stroke="#9c27b0"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <text
                      x="120"
                      y="100"
                      fill="#2196f3"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      f(x) = ax² + bx + c
                    </text>
                    <text
                      x="120"
                      y="130"
                      fill="#9c27b0"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      g(x) = mx + b
                    </text>
                  </g>
                </g>

                {/* Function Set 2: Sine and Cosine */}
                <g style={{ animation: 'sequence2 16s infinite' }}>
                  <g>
                    <path
                      d="M 100,200 C 200,120 300,280 400,200 C 500,120 600,280 700,200"
                      fill="none"
                      stroke="#2196f3"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <path
                      d="M 100,280 C 200,200 300,120 400,200 C 500,280 600,120 700,200"
                      fill="none"
                      stroke="#9c27b0"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <text
                      x="120"
                      y="100"
                      fill="#2196f3"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      f(x) = sin(x)
                    </text>
                    <text
                      x="120"
                      y="130"
                      fill="#9c27b0"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      g(x) = cos(x)
                    </text>
                  </g>
                </g>

                {/* Function Set 3: Exponential and Logarithmic */}
                <g style={{ animation: 'sequence3 16s infinite' }}>
                  <g>
                    <path
                      d="M 100,350 C 250,350 400,50 700,50"
                      fill="none"
                      stroke="#2196f3"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <path
                      d="M 100,350 C 200,350 600,200 700,50"
                      fill="none"
                      stroke="#9c27b0"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <text
                      x="120"
                      y="100"
                      fill="#2196f3"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      f(x) = eˣ
                    </text>
                    <text
                      x="120"
                      y="130"
                      fill="#9c27b0"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      g(x) = ln(x)
                    </text>
                  </g>
                </g>

                {/* Function Set 4: Polynomial and its Derivative */}
                <g style={{ animation: 'sequence4 16s infinite' }}>
                  <g>
                    <path
                      d="M 100,200 C 200,350 300,50 400,200 C 500,350 600,50 700,200"
                      fill="none"
                      stroke="#2196f3"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <path
                      d="M 100,200 C 200,50 300,350 400,200 C 500,50 600,350 700,200"
                      fill="none"
                      stroke="#9c27b0"
                      strokeWidth="2.5"
                      strokeDasharray="800"
                      strokeDashoffset="800"
                      style={{
                        animation: 'drawPath 4s ease-out infinite'
                      }}
                    />
                    <text
                      x="120"
                      y="100"
                      fill="#2196f3"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      f(x) = x³ - 3x
                    </text>
                    <text
                      x="120"
                      y="130"
                      fill="#9c27b0"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        opacity: 0,
                        animation: 'showText 4s ease-out infinite'
                      }}
                    >
                      f′(x) = 3x² - 3
                    </text>
                  </g>
                </g>
              </svg>
            </Box>
            
            <style>
              {`
                @keyframes sequence1 {
                  0% {
                    visibility: visible;
                  }
                  20%, 100% {
                    visibility: hidden;
                  }
                }
                
                @keyframes sequence2 {
                  0%, 24% {
                    visibility: hidden;
                  }
                  25% {
                    visibility: visible;
                  }
                  45%, 100% {
                    visibility: hidden;
                  }
                }
                
                @keyframes sequence3 {
                  0%, 49% {
                    visibility: hidden;
                  }
                  50% {
                    visibility: visible;
                  }
                  70%, 100% {
                    visibility: hidden;
                  }
                }
                
                @keyframes sequence4 {
                  0%, 74% {
                    visibility: hidden;
                  }
                  75% {
                    visibility: visible;
                  }
                  95%, 100% {
                    visibility: hidden;
                  }
                }
                
                @keyframes drawPath {
                  0% {
                    stroke-dashoffset: 800;
                  }
                  40% {
                    stroke-dashoffset: 0;
                  }
                  80%, 100% {
                    stroke-dashoffset: 800;
                  }
                }
                
                @keyframes showText {
                  0% {
                    opacity: 0;
                  }
                  40% {
                    opacity: 1;
                  }
                  80%, 100% {
                    opacity: 0;
                  }
                }
              `}
            </style>
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid', 
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            bgcolor: 'background.paper'
          }}>
          <Button
              color="inherit"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 400,
                letterSpacing: '0.02em'
              }}
            >
              Skip
          </Button>
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(prev => prev - 1)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => activeStep === steps.length - 1 ? onClose() : setActiveStep(prev => prev + 1)}
            >
              {activeStep === steps.length - 1 ? 'Begin' : 'Next'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default WelcomeModal