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
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material'
import {
  Settings,
  Close,
  Palette,
  Mic,
  Draw,
  Psychology,
  Accessibility,
  VolumeUp,
  VolumeOff,
  Brightness4,
  Brightness7,
  RestoreRounded
} from '@mui/icons-material'
import { useAppStore } from '@/store/appStore'
import type { AppSettings } from '@/types'

interface SettingsPanelProps {
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
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0)
  const { settings, updateSettings } = useAppStore()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }
  
  const handleSettingChange = (category: keyof AppSettings, key: string, value: any) => {
    const newSettings = {
      [category]: {
        ...settings[category],
        [key]: value
      }
    }
    updateSettings(newSettings)
    setHasUnsavedChanges(true)
  }
  
  const handleSave = () => {
    setHasUnsavedChanges(false)
    onClose()
  }
  
  const resetToDefaults = () => {
    // Reset all settings to defaults
    const defaultSettings: AppSettings = {
      theme: {
        mode: 'light',
        primaryColor: '#1976d2',
        accentColor: '#9c27b0',
        backgroundColor: '#fafafa',
        textColor: '#212121',
        borderRadius: 12,
        spacing: 8
      },
      voice: {
        enabled: true,
        continuousMode: true,
        pushToTalk: false,
        threshold: 0.01,
        language: 'en-US',
        sampleRate: 16000
      },
      canvas: {
        grid: false,
        snapToGrid: false,
        autoSave: true,
        showRuler: false
      },
      ai: {
        interruptionMode: 'medium',
        hintFrequency: 'medium',
        showConfidence: true,
        animateAnnotations: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        screenReader: false
      }
    }
    
    updateSettings(defaultSettings)
    setHasUnsavedChanges(true)
  }
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md" 
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
            <Settings color="primary" />
            <Typography variant="h6">Settings</Typography>
          </Box>
          <Box>
            <Tooltip title="Reset to Defaults">
              <IconButton onClick={resetToDefaults} size="small" sx={{ mr: 1 }}>
                <RestoreRounded />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        {hasUnsavedChanges && (
          <Alert severity="info" sx={{ m: 2, mb: 0 }}>
            You have unsaved changes. Don't forget to save!
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<Palette />} label="Theme" />
            <Tab icon={<Mic />} label="Voice" />
            <Tab icon={<Draw />} label="Canvas" />
            <Tab icon={<Psychology />} label="AI Tutor" />
            <Tab icon={<Accessibility />} label="Accessibility" />
          </Tabs>
        </Box>
        
        <Box sx={{ px: 3, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          <TabPanel value={activeTab} index={0}>
            <Typography variant="h6" gutterBottom>
              <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
              Theme & Appearance
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Color Theme
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.theme.mode === 'dark'}
                          onChange={(e) => 
                            handleSettingChange('theme', 'mode', e.target.checked ? 'dark' : 'light')
                          }
                          icon={<Brightness7 />}
                          checkedIcon={<Brightness4 />}
                        />
                      }
                      label="Dark Mode"
                    />
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>Primary Color</Typography>
                      <TextField
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={(e) => handleSettingChange('theme', 'primaryColor', e.target.value)}
                        size="small"
                        sx={{ width: 60 }}
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>Accent Color</Typography>
                      <TextField
                        type="color"
                        value={settings.theme.accentColor}
                        onChange={(e) => handleSettingChange('theme', 'accentColor', e.target.value)}
                        size="small"
                        sx={{ width: 60 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Interface
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Border Radius: {settings.theme.borderRadius}px
                      </Typography>
                      <Slider
                        value={settings.theme.borderRadius}
                        onChange={(_, value) => handleSettingChange('theme', 'borderRadius', value)}
                        min={0}
                        max={24}
                        step={2}
                        marks
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Spacing: {settings.theme.spacing}px
                      </Typography>
                      <Slider
                        value={settings.theme.spacing}
                        onChange={(_, value) => handleSettingChange('theme', 'spacing', value)}
                        min={4}
                        max={16}
                        step={2}
                        marks
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom>
              <Mic sx={{ mr: 1, verticalAlign: 'middle' }} />
              Voice Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Voice Input
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.voice.enabled}
                          onChange={(e) => handleSettingChange('voice', 'enabled', e.target.checked)}
                          icon={<VolumeOff />}
                          checkedIcon={<VolumeUp />}
                        />
                      }
                      label="Enable Voice Input"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.voice.continuousMode}
                          onChange={(e) => handleSettingChange('voice', 'continuousMode', e.target.checked)}
                          disabled={!settings.voice.enabled}
                        />
                      }
                      label="Continuous Listening Mode"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.voice.pushToTalk}
                          onChange={(e) => handleSettingChange('voice', 'pushToTalk', e.target.checked)}
                          disabled={!settings.voice.enabled}
                        />
                      }
                      label="Push to Talk (Space key)"
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Audio Settings
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Voice Sensitivity: {(settings.voice.threshold * 100).toFixed(1)}%
                      </Typography>
                      <Slider
                        value={settings.voice.threshold}
                        onChange={(_, value) => handleSettingChange('voice', 'threshold', value)}
                        min={0.005}
                        max={0.1}
                        step={0.005}
                        disabled={!settings.voice.enabled}
                      />
                    </Box>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={settings.voice.language}
                        onChange={(e) => handleSettingChange('voice', 'language', e.target.value)}
                        disabled={!settings.voice.enabled}
                      >
                        <MenuItem value="en-US">English (US)</MenuItem>
                        <MenuItem value="en-GB">English (UK)</MenuItem>
                        <MenuItem value="es-ES">Spanish</MenuItem>
                        <MenuItem value="fr-FR">French</MenuItem>
                        <MenuItem value="de-DE">German</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              <Draw sx={{ mr: 1, verticalAlign: 'middle' }} />
              Canvas Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Drawing Options
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.canvas.grid}
                              onChange={(e) => handleSettingChange('canvas', 'grid', e.target.checked)}
                            />
                          }
                          label="Show Grid"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.canvas.snapToGrid}
                              onChange={(e) => handleSettingChange('canvas', 'snapToGrid', e.target.checked)}
                              disabled={!settings.canvas.grid}
                            />
                          }
                          label="Snap to Grid"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.canvas.autoSave}
                              onChange={(e) => handleSettingChange('canvas', 'autoSave', e.target.checked)}
                            />
                          }
                          label="Auto Save"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.canvas.showRuler}
                              onChange={(e) => handleSettingChange('canvas', 'showRuler', e.target.checked)}
                            />
                          }
                          label="Show Rulers"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom>
              <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI Tutor Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Interaction Style
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Interruption Mode</InputLabel>
                      <Select
                        value={settings.ai.interruptionMode}
                        onChange={(e) => handleSettingChange('ai', 'interruptionMode', e.target.value)}
                      >
                        <MenuItem value="never">Never Interrupt</MenuItem>
                        <MenuItem value="gentle">Gentle Hints</MenuItem>
                        <MenuItem value="medium">Balanced</MenuItem>
                        <MenuItem value="aggressive">Active Guidance</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth>
                      <InputLabel>Hint Frequency</InputLabel>
                      <Select
                        value={settings.ai.hintFrequency}
                        onChange={(e) => handleSettingChange('ai', 'hintFrequency', e.target.value)}
                      >
                        <MenuItem value="low">Minimal Hints</MenuItem>
                        <MenuItem value="medium">Moderate Hints</MenuItem>
                        <MenuItem value="high">Frequent Hints</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Visual Features
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.ai.showConfidence}
                          onChange={(e) => handleSettingChange('ai', 'showConfidence', e.target.checked)}
                        />
                      }
                      label="Show AI Confidence Levels"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.ai.animateAnnotations}
                          onChange={(e) => handleSettingChange('ai', 'animateAnnotations', e.target.checked)}
                        />
                      }
                      label="Animated Visual Annotations"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={activeTab} index={4}>
            <Typography variant="h6" gutterBottom>
              <Accessibility sx={{ mr: 1, verticalAlign: 'middle' }} />
              Accessibility
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Visual Accessibility
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.accessibility.highContrast}
                              onChange={(e) => handleSettingChange('accessibility', 'highContrast', e.target.checked)}
                            />
                          }
                          label="High Contrast Mode"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.accessibility.largeText}
                              onChange={(e) => handleSettingChange('accessibility', 'largeText', e.target.checked)}
                            />
                          }
                          label="Large Text"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.accessibility.reduceMotion}
                              onChange={(e) => handleSettingChange('accessibility', 'reduceMotion', e.target.checked)}
                            />
                          }
                          label="Reduce Motion"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.accessibility.screenReader}
                              onChange={(e) => handleSettingChange('accessibility', 'screenReader', e.target.checked)}
                            />
                          }
                          label="Screen Reader Support"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!hasUnsavedChanges}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsPanel
