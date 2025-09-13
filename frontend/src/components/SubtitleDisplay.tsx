import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { School, Lightbulb, CheckCircle, Warning, Error } from '@mui/icons-material'

interface SubtitleDisplayProps {
  text: string
  mode?: 'speak' | 'hint' | 'affirm' | 'correction' | 'urgent'
  duration?: number
  position?: 'top' | 'bottom' | 'center'
}

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ 
  text, 
  mode = 'speak',
  duration = 5000,
  position = 'bottom'
}) => {
  const getModeConfig = (mode: string) => {
    switch (mode) {
      case 'hint':
        return {
          icon: <Lightbulb sx={{ fontSize: 20 }} />,
          color: 'info.main',
          bgColor: 'rgba(33, 150, 243, 0.1)',
          borderColor: 'info.main'
        }
      case 'affirm':
        return {
          icon: <CheckCircle sx={{ fontSize: 20 }} />,
          color: 'success.main',
          bgColor: 'rgba(76, 175, 80, 0.1)',
          borderColor: 'success.main'
        }
      case 'correction':
        return {
          icon: <Warning sx={{ fontSize: 20 }} />,
          color: 'warning.main',
          bgColor: 'rgba(255, 152, 0, 0.1)',
          borderColor: 'warning.main'
        }
      case 'urgent':
        return {
          icon: <Error sx={{ fontSize: 20 }} />,
          color: 'error.main',
          bgColor: 'rgba(244, 67, 54, 0.1)',
          borderColor: 'error.main'
        }
      default: // speak
        return {
          icon: <School sx={{ fontSize: 20 }} />,
          color: 'primary.main',
          bgColor: 'rgba(25, 118, 210, 0.1)',
          borderColor: 'primary.main'
        }
    }
  }
  
  const modeConfig = getModeConfig(mode)
  
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return {
          position: 'fixed' as const,
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000
        }
      case 'center':
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000
        }
      default: // bottom
        return {
          position: 'fixed' as const,
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000
        }
    }
  }
  
  return (
    <Box sx={getPositionStyles()}>
      <motion.div
        initial={{ 
          opacity: 0, 
          y: position === 'top' ? -20 : position === 'bottom' ? 20 : 0,
          scale: 0.95
        }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: 1
        }}
        exit={{ 
          opacity: 0, 
          y: position === 'top' ? -20 : position === 'bottom' ? 20 : 0,
          scale: 0.95
        }}
        transition={{ 
          duration: 0.3,
          ease: "easeOut"
        }}
      >
        <Paper
          elevation={8}
          sx={{
            px: 3,
            py: 2,
            maxWidth: 600,
            minWidth: 200,
            backgroundColor: modeConfig.bgColor,
            border: `1px solid ${modeConfig.borderColor}`,
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              backgroundColor: modeConfig.borderColor,
              opacity: 0.6
            }}
          />
          
          {/* Icon */}
          <Box sx={{ color: modeConfig.color, flexShrink: 0 }}>
            {modeConfig.icon}
          </Box>
          
          {/* Text */}
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'text.primary',
              fontWeight: mode === 'urgent' ? 600 : mode === 'affirm' ? 500 : 400,
              lineHeight: 1.4,
              wordBreak: 'break-word'
            }}
          >
            {text}
          </Typography>
          
          {/* Pulse animation for urgent messages */}
          {mode === 'urgent' && (
            <motion.div
              animate={{
                scale: [1, 1.02, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: `2px solid ${modeConfig.borderColor}`,
                borderRadius: 12,
                pointerEvents: 'none'
              }}
            />
          )}
          
          {/* Sparkle animation for affirmations */}
          {mode === 'affirm' && (
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                ease: "easeInOut"
              }}
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: 10,
                height: 10,
                backgroundColor: modeConfig.borderColor,
                borderRadius: '50%',
                opacity: 0.7
              }}
            />
          )}
        </Paper>
      </motion.div>
    </Box>
  )
}

export default SubtitleDisplay
