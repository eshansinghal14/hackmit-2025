import React, { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'

const AppDebug: React.FC = () => {
  const [count, setCount] = useState(0)

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    }}>
      <Typography variant="h4">
        🎨 AI Whiteboard Tutor - Debug Mode
      </Typography>
      <Typography variant="body1">
        If you can see this, React is working!
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => setCount(count + 1)}
      >
        Clicks: {count}
      </Button>
      <Typography variant="body2" color="text.secondary">
        Frontend: ✅ Running | Backend: 🔄 Check console
      </Typography>
    </Box>
  )
}

export default AppDebug
