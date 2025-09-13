import React from 'react'
import { Box, Chip, Tooltip, IconButton } from '@mui/material'
import { 
  Wifi, 
  WifiOff, 
  Sync, 
  Error as ErrorIcon,
  SignalWifi1Bar,
  SignalWifi2Bar,
  SignalWifi3Bar,
  SignalWifi4Bar 
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAppStore, useSessionActions } from '@/store/appStore'

const ConnectionStatus: React.FC = () => {
  const { connectionState, isConnected, sessionId } = useAppStore()
  const { reconnect } = useSessionActions()
  
  const getStatusConfig = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return {
          icon: <Wifi />,
          label: 'Connected',
          color: 'success' as const,
          tooltip: `Connected to AI Tutor Server\nSession: ${sessionId.slice(-8)}`
        }
      case 'CONNECTING':
        return {
          icon: <Sync className="animate-spin" />,
          label: 'Connecting',
          color: 'info' as const,
          tooltip: 'Connecting to AI Tutor Server...'
        }
      case 'RECONNECTING':
        return {
          icon: <Sync className="animate-spin" />,
          label: 'Reconnecting',
          color: 'warning' as const,
          tooltip: 'Reconnecting to AI Tutor Server...'
        }
      case 'ERROR':
        return {
          icon: <ErrorIcon />,
          label: 'Error',
          color: 'error' as const,
          tooltip: 'Connection error. Click to retry.'
        }
      default: // DISCONNECTED
        return {
          icon: <WifiOff />,
          label: 'Disconnected',
          color: 'default' as const,
          tooltip: 'Disconnected from server. Click to reconnect.'
        }
    }
  }
  
  const config = getStatusConfig()
  const isClickable = connectionState === 'ERROR' || connectionState === 'DISCONNECTED'
  
  const handleClick = () => {
    if (isClickable) {
      reconnect()
    }
  }
  
  return (
    <Box sx={{ ml: 2 }}>
      <Tooltip title={config.tooltip} arrow placement="bottom">
        <div>
          <Chip
            icon={
              <motion.div
                animate={connectionState === 'CONNECTING' || connectionState === 'RECONNECTING' 
                  ? { rotate: 360 } 
                  : {}
                }
                transition={{ 
                  duration: 1, 
                  repeat: connectionState === 'CONNECTING' || connectionState === 'RECONNECTING' ? Infinity : 0,
                  ease: "linear" 
                }}
              >
                {config.icon}
              </motion.div>
            }
            label={config.label}
            color={config.color}
            size="small"
            onClick={isClickable ? handleClick : undefined}
            sx={{
              cursor: isClickable ? 'pointer' : 'default',
              '& .MuiChip-icon': {
                fontSize: '16px'
              },
              '& .animate-spin': {
                animation: 'spin 1s linear infinite'
              },
              '@keyframes spin': {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' }
              }
            }}
          />
        </div>
      </Tooltip>
    </Box>
  )
}

export default ConnectionStatus
