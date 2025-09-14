import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material'
import {
  AccountTree,
  Close,
  Construction
} from '@mui/icons-material'

interface KnowledgeGraphPanelProps {
  open: boolean
  onClose: () => void
}

// Knowledge Graph functionality temporarily disabled

const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({ open, onClose }) => {
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '80vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTree color="primary" />
            <Typography variant="h6">
              Knowledge Graph
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            textAlign: 'center',
            gap: 3
          }}
        >
          <Construction sx={{ fontSize: 80, color: 'text.secondary' }} />
          <Typography variant="h5" color="text.secondary">
            Knowledge Graph Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '500px' }}>
            We're working on building an intelligent knowledge graph that will track your learning progress, 
            identify knowledge gaps, and provide personalized recommendations.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This feature will be available in a future update.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default KnowledgeGraphPanel
