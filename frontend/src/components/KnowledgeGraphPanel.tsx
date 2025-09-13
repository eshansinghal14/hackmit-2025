import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper
} from '@mui/material'
import {
  AccountTree,
  Close,
  TrendingUp,
  TrendingDown,
  Psychology,
  CheckCircle,
  Warning,
  Info,
  Refresh
} from '@mui/icons-material'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
// import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import type { KnowledgeGraphData } from '@/types'

interface KnowledgeGraphPanelProps {
  open: boolean
  onClose: () => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  )
}

const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0)
  const { knowledgeGraph } = useAppStore()
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }
  
  // Mock data if no knowledge graph available
  const mockData: KnowledgeGraphData = {
    nodes: [
      { id: 'algebra', mastery: 0.8, importance: 0.9, color: '#4caf50', size: 20 },
      { id: 'calculus', mastery: 0.3, importance: 0.8, color: '#f44336', size: 18 },
      { id: 'geometry', mastery: 0.6, importance: 0.7, color: '#ff9800', size: 16 },
      { id: 'trigonometry', mastery: 0.4, importance: 0.6, color: '#ff9800', size: 14 },
      { id: 'statistics', mastery: 0.2, importance: 0.5, color: '#f44336', size: 12 }
    ],
    edges: [
      { source: 'algebra', target: 'calculus', strength: 0.8 },
      { source: 'geometry', target: 'trigonometry', strength: 0.7 },
      { source: 'algebra', target: 'geometry', strength: 0.6 }
    ],
    stats: {
      totalConcepts: 5,
      weakConcepts: 2,
      strongConcepts: 1,
      averageMastery: 0.46,
      masteryDistribution: { low: 2, medium: 2, high: 1 }
    }
  }
  
  const data = knowledgeGraph || mockData
  
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.7) return '#4caf50' // Green
    if (mastery >= 0.4) return '#ff9800' // Orange  
    return '#f44336' // Red
  }
  
  const getMasteryLabel = (mastery: number) => {
    if (mastery >= 0.7) return 'Strong'
    if (mastery >= 0.4) return 'Developing'
    return 'Needs Work'
  }
  
  const getMasteryIcon = (mastery: number) => {
    if (mastery >= 0.7) return <CheckCircle sx={{ color: '#4caf50' }} />
    if (mastery >= 0.4) return <Warning sx={{ color: '#ff9800' }} />
    return <Info sx={{ color: '#f44336' }} />
  }
  
  // Prepare chart data
  const pieData = [
    { name: 'Strong', value: data.stats.masteryDistribution.high, color: '#4caf50' },
    { name: 'Developing', value: data.stats.masteryDistribution.medium, color: '#ff9800' },
    { name: 'Needs Work', value: data.stats.masteryDistribution.low, color: '#f44336' }
  ]
  
  const barData = data.nodes.map(node => ({
    name: node.id.charAt(0).toUpperCase() + node.id.slice(1),
    mastery: Math.round(node.mastery * 100),
    importance: Math.round(node.importance * 100)
  }))
  
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
            <Chip 
              label={`${data.stats.totalConcepts} concepts`} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Concepts" />
            <Tab label="Progress" />
            <Tab label="Recommendations" />
          </Tabs>
        </Box>
        
        <Box sx={{ height: 'calc(100% - 48px)', p: 3 }}>
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
              {/* Stats Cards */}
              <Grid item xs={12} md={8}>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {data.stats.totalConcepts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Concepts
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {data.stats.strongConcepts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mastered
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {data.stats.masteryDistribution.medium}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          In Progress
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="error.main">
                          {data.stats.weakConcepts}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Need Focus
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {/* Mastery Distribution Chart */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Mastery Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Overall Progress
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Average Mastery</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {Math.round(data.stats.averageMastery * 100)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={data.stats.averageMastery * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Quick Actions
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button 
                        size="small" 
                        startIcon={<TrendingUp />}
                        color="success"
                        variant="outlined"
                      >
                        Focus on Strong Areas
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<TrendingDown />}
                        color="error"
                        variant="outlined"
                      >
                        Work on Weak Areas
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<Psychology />}
                        color="primary"
                        variant="outlined"
                      >
                        Practice Recommendations
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400, overflow: 'auto' }}>
                  <Typography variant="h6" gutterBottom>
                    Concept Details
                  </Typography>
                  <List>
                    {data.nodes.map((node) => (
                      <ListItem key={node.id} divider>
                        <Box sx={{ mr: 2 }}>
                          {getMasteryIcon(node.mastery)}
                        </Box>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                              {node.id}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="caption">Mastery</Typography>
                                <Typography variant="caption">
                                  {Math.round(node.mastery * 100)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={node.mastery * 100}
                                sx={{ 
                                  mt: 0.5,
                                  height: 4,
                                  backgroundColor: 'grey.300',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getMasteryColor(node.mastery)
                                  }
                                }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip 
                            label={getMasteryLabel(node.mastery)} 
                            size="small"
                            sx={{ 
                              backgroundColor: getMasteryColor(node.mastery),
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 400 }}>
                  <Typography variant="h6" gutterBottom>
                    Mastery vs Importance
                  </Typography>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Bar dataKey="mastery" fill="#2196f3" name="Mastery %" />
                      <Bar dataKey="importance" fill="#ff9800" name="Importance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Learning Progress
            </Typography>
            <Typography variant="body1">
              Progress tracking and learning analytics will be displayed here.
            </Typography>
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Recommendations
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom color="error.main">
                      <TrendingDown sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Priority Areas
                    </Typography>
                    <List dense>
                      {data.nodes
                        .filter(node => node.mastery < 0.4)
                        .map((node) => (
                          <ListItem key={node.id}>
                            <ListItemText
                              primary={node.id.charAt(0).toUpperCase() + node.id.slice(1)}
                              secondary={`${Math.round(node.mastery * 100)}% mastery - needs immediate attention`}
                            />
                          </ListItem>
                        ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom color="success.main">
                      <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Strengths to Build On
                    </Typography>
                    <List dense>
                      {data.nodes
                        .filter(node => node.mastery >= 0.7)
                        .map((node) => (
                          <ListItem key={node.id}>
                            <ListItemText
                              primary={node.id.charAt(0).toUpperCase() + node.id.slice(1)}
                              secondary={`${Math.round(node.mastery * 100)}% mastery - expand to advanced topics`}
                            />
                          </ListItem>
                        ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button variant="contained" startIcon={<Refresh />}>
          Refresh Data
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default KnowledgeGraphPanel
