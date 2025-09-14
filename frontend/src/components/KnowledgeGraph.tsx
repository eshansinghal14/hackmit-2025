import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, Button, Card, CardContent, Zoom } from '@mui/material'
import { School, ZoomIn, ZoomOut, CenterFocusStrong } from '@mui/icons-material'

interface Node {
  id: string
  label: string
  x: number
  y: number
  level: number
}

interface Edge {
  from: string
  to: string
}

interface KnowledgeGraphProps {
  onLearnTopic?: (topic: string) => void
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ onLearnTopic }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [animatingToNode, setAnimatingToNode] = useState<string | null>(null)
  const [nodeWeights, setNodeWeights] = useState<{[key: string]: number}>({})
  const [weightsLoaded, setWeightsLoaded] = useState(false)

  // Load node data and weights from JSON file
  useEffect(() => {
    const loadNodeWeights = async () => {
      try {
        setWeightsLoaded(false)
        const response = await fetch('http://localhost:5000/api/nodes')
        const data = await response.json()
        const weights: {[key: string]: number} = {}
        
        Object.entries(data[0]).forEach(([nodeId, nodeInfo]: [string, any]) => {
          weights[nodeId] = nodeInfo.weight || 1.0
        })
        
        setNodeWeights(weights)
        setWeightsLoaded(true)
        console.log('📊 Loaded node weights:', weights)
        
        // Print colors for all nodes
        console.log('🎨 Node colors:')
        Object.keys(weights).forEach(nodeId => {
          const weight = weights[nodeId]
          const color = getNodeColorForWeight(weight)
          console.log(`Node ${nodeId}: weight=${weight}, color=${color}`)
        })
      } catch (error) {
        console.error('❌ Failed to load node weights:', error)
        // Fallback to default weights
        const defaultWeights: {[key: string]: number} = {}
        for (let i = 1; i <= 12; i++) {
          defaultWeights[i.toString()] = 1.0
        }
        setNodeWeights(defaultWeights)
        setWeightsLoaded(true)
      }
    }

    loadNodeWeights()
  }, []) // Loads once on mount, will re-mount when key changes

  // Helper function to calculate color for a given weight (for logging)
  const getNodeColorForWeight = (weight: number): string => {
    // Clamp weight to range -1 to 1
    const clampedWeight = Math.min(Math.max(weight, -1.0), 1.0)
    
    // Weight range: -1.0 (mastered) to 1.0 (needs help)
    // Normalize to 0-1 where 0 = green (mastered), 1 = red (needs help)
    const ratio = (clampedWeight + 1.0) / 2.0 // Convert -1,1 range to 0,1 range
    const hue = (1 - ratio) * 120 // 120 = green, 0 = red
    const saturation = 70 + (ratio * 20) // More saturated for higher weights
    const lightness = 50 - (ratio * 10) // Darker for higher weights
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  // Data from final_consolidated_nodes_basic_calculus.json
  const nodeData = {
    "1": {"name": "Introduction to Limits", "weight": 1, "prerequisites": []},
    "2": {"name": "Basic Derivative Rules", "weight": 1, "prerequisites": ["1"]},
    "3": {"name": "Differentiation of Trigonometric Functions", "weight": 1, "prerequisites": ["2"]},
    "4": {"name": "Chain Rule and Implicit Differentiation", "weight": 1, "prerequisites": ["2", "3"]},
    "5": {"name": "Applications of Derivatives", "weight": 1, "prerequisites": ["4"]},
    "6": {"name": "Introduction to Integrals", "weight": 1, "prerequisites": ["1"]},
    "7": {"name": "Basic Integration Rules", "weight": 1, "prerequisites": ["6"]},
    "8": {"name": "Fundamental Theorem of Calculus", "weight": 1, "prerequisites": ["5", "7"]},
    "9": {"name": "Optimization Problems", "weight": 1, "prerequisites": ["5", "8"]},
    "10": {"name": "Advanced Integration Techniques", "weight": 1, "prerequisites": ["8"]},
    "11": {"name": "Parametric and Polar Functions", "weight": 1, "prerequisites": ["10"]},
    "12": {"name": "Calculus in Real-World Applications", "weight": 1, "prerequisites": ["9", "11"]}
  }

  // Create nodes with positions in a hierarchical layout
  const createNodes = (): Node[] => {
    const nodes: Node[] = []
    const levels: { [key: number]: string[] } = {}
    
    // Group nodes by level (based on dependencies)
    Object.keys(nodeData).forEach(id => {
      const level = calculateNodeLevel(id)
      if (!levels[level]) levels[level] = []
      levels[level].push(id)
    })

    // Position nodes
    Object.keys(levels).forEach(levelStr => {
      const level = parseInt(levelStr)
      const nodesInLevel = levels[level]
      const levelY = 100 + level * 150
      
      nodesInLevel.forEach((id, index) => {
        const totalWidth = 800
        const spacing = totalWidth / (nodesInLevel.length + 1)
        const x = spacing * (index + 1) + 100
        
        nodes.push({
          id,
          label: nodeData[id as keyof typeof nodeData].name,
          x,
          y: levelY,
          level: parseInt(id)
        })
      })
    })

    return nodes
  }

  const calculateNodeLevel = (nodeId: string): number => {
    // Calculate level based on prerequisites depth
    const visited = new Set<string>()
    
    const getDepth = (id: string): number => {
      if (visited.has(id)) return 0 // Avoid cycles
      visited.add(id)
      
      const node = nodeData[id as keyof typeof nodeData]
      if (!node || node.prerequisites.length === 0) return 0
      
      const maxPrereqDepth = Math.max(...node.prerequisites.map(prereqId => getDepth(prereqId)))
      return maxPrereqDepth + 1
    }
    
    return getDepth(nodeId)
  }

  const createEdges = (): Edge[] => {
    const edges: Edge[] = []
    Object.entries(nodeData).forEach(([nodeId, nodeInfo]) => {
      nodeInfo.prerequisites.forEach(prereqId => {
        edges.push({ from: prereqId, to: nodeId })
      })
    })
    return edges
  }

  const nodes = createNodes()
  const edges = createEdges()

  // Color gradient based on weight (higher weight = more help needed = redder)
  const getNodeColor = (nodeId: string): string => {
    let weight = nodeWeights[nodeId] || 0.0
    // Clamp weight to range -1 to 1
    weight = Math.min(Math.max(weight, -1.0), 1.0)
    
    // Weight range: -1.0 (mastered) to 1.0 (needs help)
    // Normalize to 0-1 where 0 = green (mastered), 1 = red (needs help)
    const ratio = (weight + 1.0) / 2.0 // Convert -1,1 range to 0,1 range
    const hue = (1 - ratio) * 120 // 120 = green, 0 = red
    const saturation = 70 + (ratio * 20) // More saturated for higher weights
    const lightness = 50 - (ratio * 10) // Darker for higher weights
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transformations
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Draw edges first
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      
      if (fromNode && toNode) {
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw arrow
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
        const arrowLength = 15
        const arrowAngle = Math.PI / 6

        ctx.beginPath()
        ctx.moveTo(
          toNode.x - arrowLength * Math.cos(angle - arrowAngle),
          toNode.y - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.lineTo(toNode.x, toNode.y)
        ctx.lineTo(
          toNode.x - arrowLength * Math.cos(angle + arrowAngle),
          toNode.y - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id
      const isAnimating = animatingToNode === node.id
      const radius = isSelected || isAnimating ? 35 : 25

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      const nodeColor = getNodeColor(node.id)
      ctx.fillStyle = nodeColor
      ctx.fill()
      
      // Node border - use a darker version of the node color or white if selected
      if (isSelected) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 4
      } else {
        // Create a darker border that complements the fill color
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.lineWidth = 2
      }
      ctx.stroke()

      // Node label (number)
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${isSelected ? '18px' : '14px'} Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.id, node.x, node.y)
    })

    ctx.restore()
  }

  const getNodeAtPosition = (x: number, y: number): Node | null => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null

    const canvasX = (x - rect.left - pan.x) / zoom
    const canvasY = (y - rect.top - pan.y) / zoom

    return nodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2)
      )
      return distance <= 25
    }) || null
  }

  const animateToNode = (node: Node) => {
    setAnimatingToNode(node.id)
    
    // Calculate target pan to center the node
    const canvas = canvasRef.current
    if (!canvas) return

    const targetPan = {
      x: canvas.width / 2 - node.x * 1.5,
      y: canvas.height / 2 - node.y * 1.5
    }

    // Animate zoom and pan
    const startZoom = zoom
    const startPan = { ...pan }
    const targetZoom = 1.5
    const duration = 800
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic

      setZoom(startZoom + (targetZoom - startZoom) * easeProgress)
      setPan({
        x: startPan.x + (targetPan.x - startPan.x) * easeProgress,
        y: startPan.y + (targetPan.y - startPan.y) * easeProgress
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setAnimatingToNode(null)
      }
    }

    requestAnimationFrame(animate)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    const node = getNodeAtPosition(e.clientX, e.clientY)
    if (node) {
      setSelectedNode(node)
      animateToNode(node)
    } else {
      setSelectedNode(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const node = getNodeAtPosition(e.clientX, e.clientY)
    if (!node) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetView = () => {
    setZoom(0.8)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Set canvas size
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    // Draw graph when component mounts or updates, but only after weights are loaded
    if (weightsLoaded) {
      drawGraph()
    }
  }, [zoom, pan, selectedNode, animatingToNode, nodeWeights, weightsLoaded])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      if (weightsLoaded) {
        drawGraph()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [weightsLoaded])

  return (
    <Box sx={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ 
        position: 'absolute', 
        top: 20, 
        left: 20, 
        zIndex: 10,
        display: 'flex',
        gap: 2
      }}>
        <Typography variant="h4" sx={{ 
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
          fontWeight: 'bold'
        }}>
          Knowledge Graph
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 20, 
        right: 20, 
        zIndex: 10,
        display: 'flex',
        gap: 1
      }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => setZoom(zoom * 1.2)}
          sx={{ minWidth: 40 }}
        >
          <ZoomIn />
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => setZoom(zoom * 0.8)}
          sx={{ minWidth: 40 }}
        >
          <ZoomOut />
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={resetView}
          sx={{ minWidth: 40 }}
        >
          <CenterFocusStrong />
        </Button>
      </Box>

      {/* Canvas */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: 'block' }}
        />
      </Box>

      {/* Node Details Panel */}
      {selectedNode && (
        <Zoom in={!!selectedNode}>
          <Card sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 300,
            maxWidth: 500,
            zIndex: 10
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Node {selectedNode.id}
              </Typography>
              <Typography variant="h6" color="primary" gutterBottom>
                {selectedNode.label}
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<School />}
                onClick={() => onLearnTopic?.(selectedNode.label)}
                sx={{ 
                  mt: 2,
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #764ba2, #667eea)',
                  }
                }}
              >
                Learn This Topic
              </Button>
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* Legend */}
      <Card sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 10,
        maxWidth: 200
      }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Difficulty Level
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%', 
              backgroundColor: 'hsl(120, 70%, 50%)' 
            }} />
            <Typography variant="caption">Easy</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              borderRadius: '50%', 
              backgroundColor: 'hsl(0, 70%, 50%)' 
            }} />
            <Typography variant="caption">Advanced</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default KnowledgeGraph
