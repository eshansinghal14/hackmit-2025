import { useEffect, useCallback, useRef } from 'react'
import { useAppStore, useAIActions, useErrorActions } from '@/store/appStore'
import {
  WebSocketMessage,
  SubtitleMessage,
  AICursorMoveMessage,
  AnnotationMessage,
  KnowledgeGraphUpdateMessage,
  ToastMessage,
  AIDrawingActionMessage,
  DrawingCommandMessage
} from '@/types'

interface UseWebSocketReturn {
  connect: (sessionId: string) => void
  disconnect: () => void
  sendMessage: (message: WebSocketMessage) => void
  reconnect: () => void
  isConnected: boolean
}

export const useWebSocket = (): UseWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const reconnectDelay = 1000
  
  const { 
    setConnectionState, 
    isConnected,
    sessionId 
  } = useAppStore()
  
  const { showSubtitle, moveAICursor, updateKnowledge } = useAIActions()
  const { reportError } = useErrorActions()
  
  const getWebSocketUrl = useCallback((sessionId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development'
    const host = isDev ? 'localhost:8000' : window.location.host
    return `${protocol}//${host}/ws/${sessionId}`
  }, [])
  
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('📨 WebSocket message:', message.type, message)
      
      switch (message.type) {
        case 'subtitle':
          const subtitleMsg = message as SubtitleMessage
          showSubtitle(subtitleMsg)
          
          // Auto-hide subtitle after TTL
          setTimeout(() => {
            showSubtitle(null)
          }, subtitleMsg.ttlMs || 5000)
          break
          
        case 'cursor_move':
          const cursorMsg = message as AICursorMoveMessage
          moveAICursor({ x: cursorMsg.x, y: cursorMsg.y })
          
          // Hide cursor after animation
          setTimeout(() => {
            moveAICursor(null)
          }, cursorMsg.duration || 1000)
          break
          
        case 'annotation':
          const annotationMsg = message as AnnotationMessage
          // Handle annotation display
          console.log('🎨 AI annotation:', annotationMsg)
          break
          
        case 'knowledge_graph_update':
          const kgMsg = message as KnowledgeGraphUpdateMessage
          updateKnowledge({
            nodes: kgMsg.nodes,
            edges: kgMsg.edges,
            stats: {
              totalConcepts: kgMsg.nodes.length,
              weakConcepts: kgMsg.nodes.filter(n => n.mastery < 0.4).length,
              strongConcepts: kgMsg.nodes.filter(n => n.mastery >= 0.7).length,
              averageMastery: kgMsg.nodes.reduce((sum, n) => sum + n.mastery, 0) / kgMsg.nodes.length,
              masteryDistribution: {
                low: kgMsg.nodes.filter(n => n.mastery < 0.4).length,
                medium: kgMsg.nodes.filter(n => n.mastery >= 0.4 && n.mastery < 0.7).length,
                high: kgMsg.nodes.filter(n => n.mastery >= 0.7).length
              }
            }
          })
          break
          
        case 'toast':
          const toastMsg = message as ToastMessage
          // Handle toast notifications
          console.log(`📢 ${toastMsg.kind}: ${toastMsg.text}`)
          break
          
        case 'ai_drawing_action':
          const aiDrawingMsg = message as AIDrawingActionMessage
          console.log(`🎨 AI Drawing Action:`, aiDrawingMsg.actions)
          // Process each drawing action
          aiDrawingMsg.actions?.forEach(action => {
            console.log(`🎯 Drawing ${action.action_type} at [${action.position[0]}, ${action.position[1]}]`)
            // The backend will handle the actual drawing via API calls
            // This is just for logging/debugging
          })
          break
          
        case 'drawing_command':
          const drawingMsg = message as DrawingCommandMessage
          console.log(`🖊️ Drawing Command:`, drawingMsg.command)
          // Trigger drawing execution by setting a flag that the polling system can pick up
          // Store the command in window object for App.tsx to consume
          if (typeof window !== 'undefined') {
            const win = window as any
            if (!win.pendingDrawingCommands) {
              win.pendingDrawingCommands = []
            }
            win.pendingDrawingCommands.push(drawingMsg.command)
          }
          break
          
        case 'pong':
          // Heartbeat response
          break
          
        default:
          console.warn('❓ Unknown WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error)
      reportError('WEBSOCKET_PARSE_ERROR', 'Failed to parse WebSocket message', { error })
    }
  }, [showSubtitle, moveAICursor, updateKnowledge, reportError])
  
  const handleOpen = useCallback(() => {
    console.log('🔗 WebSocket connected successfully!')
    console.log(`🔗 WebSocket readyState: ${wsRef.current?.readyState}`)
    setConnectionState('CONNECTED')
    reconnectAttemptsRef.current = 0
    
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Send initial ping - use direct WebSocket send to avoid recursion
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const pingMessage = { type: 'ping', timestamp: Date.now() }
      wsRef.current.send(JSON.stringify(pingMessage))
      console.log('📤 Sent initial ping message')
    }
  }, [setConnectionState])
  
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('🔌 WebSocket disconnected:', event.code, event.reason)
    setConnectionState('DISCONNECTED')
    wsRef.current = null
    
    // Attempt reconnection if not manually closed
    if (event.code !== 1000 && event.code !== 1001) { // Not normal closure
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`)
        setConnectionState('RECONNECTING')
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1
          if (sessionId) {
            connect(sessionId)
          }
        }, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current)) // Exponential backoff
      } else {
        reportError(
          'WEBSOCKET_MAX_RECONNECT_ATTEMPTS',
          'Failed to reconnect after maximum attempts',
          { attempts: maxReconnectAttempts },
          'high'
        )
      }
    }
  }, [setConnectionState, sessionId, reportError])
  
  const handleError = useCallback((error: Event) => {
    console.error('❌ WebSocket error:', error)
    reportError(
      'WEBSOCKET_CONNECTION_ERROR', 
      'WebSocket connection error',
      { error },
      'medium'
    )
  }, [reportError])
  
  const connect = useCallback((sessionId: string) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    try {
      const url = getWebSocketUrl(sessionId)
      console.log(`🔌 Connecting to WebSocket: ${url}`)
      
      setConnectionState('CONNECTING')
      
      const ws = new WebSocket(url)
      
      ws.onopen = handleOpen
      ws.onmessage = handleMessage
      ws.onclose = handleClose
      ws.onerror = handleError
      
      wsRef.current = ws
      
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error)
      reportError(
        'WEBSOCKET_CONNECT_ERROR',
        'Failed to establish WebSocket connection',
        { error, sessionId },
        'high'
      )
      setConnectionState('ERROR')
    }
  }, [getWebSocketUrl, setConnectionState, handleOpen, handleMessage, handleClose, handleError, reportError])
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      // Use code 1000 for normal closure to prevent reconnection
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    
    setConnectionState('DISCONNECTED')
    reconnectAttemptsRef.current = 0
  }, [setConnectionState])
  
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const wsState = wsRef.current?.readyState
    const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']
    
    console.log(`📡 WebSocket state: ${stateNames[wsState ?? 3]} (${wsState}), isConnected: ${isConnected}`)
    console.log(`📡 WebSocket exists: ${!!wsRef.current}, readyState: ${wsState}`)
    
    // Only sync state if we actually have a WebSocket reference
    if (wsRef.current && typeof wsState === 'number' && wsState !== WebSocket.OPEN && isConnected) {
      console.log('🔄 Syncing store state - WebSocket is not open but store shows connected')
      setConnectionState('DISCONNECTED')
      
      // Trigger reconnection if we have a session ID
      if (sessionId && wsState === WebSocket.CLOSED) {
        console.log('🔄 Triggering reconnection due to state mismatch')
        setTimeout(() => connect(sessionId), 100)
      }
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: message.timestamp || Date.now()
        }
        
        wsRef.current.send(JSON.stringify(messageWithTimestamp))
        console.log('📤 Sent WebSocket message:', messageWithTimestamp.type)
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error)
        reportError(
          'WEBSOCKET_SEND_ERROR',
          'Failed to send WebSocket message',
          { error, message },
          'medium'
        )
      }
    } else {
      console.warn(`⚠️ WebSocket not ready for sending. State: ${stateNames[wsState ?? 3]}, message:`, message.type)
      
      // If we're connecting, wait a bit and try again
      if (wsState === WebSocket.CONNECTING) {
        console.log('🔄 WebSocket is connecting, will retry sending message in 500ms')
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('🔄 Retrying message send after connection established')
            sendMessage(message)
          } else {
            console.warn('🔄 Retry failed - WebSocket still not ready')
          }
        }, 500)
      } else if (!wsRef.current && sessionId) {
        console.log('🔄 No WebSocket reference, attempting to reconnect')
        connect(sessionId)
        // Queue the message to be sent after reconnection
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            sendMessage(message)
          }
        }, 1000)
      }
    }
  }, [reportError, isConnected, setConnectionState, sessionId, connect])
  
  const reconnect = useCallback(() => {
    if (sessionId) {
      reconnectAttemptsRef.current = 0
      connect(sessionId)
    }
  }, [sessionId, connect])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000)
      }
    }
  }, [])
  
  // Heartbeat to keep connection alive and check health
  useEffect(() => {
    if (!isConnected) return
    
    const heartbeatInterval = setInterval(() => {
      const wsState = wsRef.current?.readyState
      
      if (wsRef.current && wsState === WebSocket.OPEN) {
        sendMessage({ type: 'ping', timestamp: Date.now() })
      } else if (wsState === WebSocket.CLOSED && sessionId) {
        console.log('💓 Heartbeat detected closed connection, reconnecting...')
        connect(sessionId)
      }
    }, 10000) // Every 10 seconds for more frequent checks
    
    return () => clearInterval(heartbeatInterval)
  }, [isConnected, sendMessage, sessionId, connect])
  
  return {
    connect,
    disconnect,
    sendMessage,
    reconnect,
    isConnected
  }
}

// Utility hooks for specific WebSocket operations
export const useCanvasWebSocket = () => {
  const { sendMessage } = useWebSocket()
  
  const sendCanvasUpdate = useCallback((pngBase64: string, width: number, height: number) => {
    sendMessage({
      type: 'canvas_update',
      pngBase64,
      width,
      height,
      timestamp: Date.now()
    })
  }, [sendMessage])
  
  const sendPenEvent = useCallback((
    eventType: 'down' | 'move' | 'up',
    points: { x: number; y: number }[],
    color: string,
    width: number,
    pressure?: number
  ) => {
    sendMessage({
      type: 'pen_event',
      eventType,
      points,
      color,
      width,
      pressure,
      timestamp: Date.now()
    })
  }, [sendMessage])
  
  return {
    sendCanvasUpdate,
    sendPenEvent
  }
}

export const useVoiceWebSocket = () => {
  const { sendMessage } = useWebSocket()
  
  const sendVoiceChunk = useCallback((audioBytes: ArrayBuffer) => {
    sendMessage({
      type: 'voice_chunk',
      audioBytes,
      timestamp: Date.now()
    })
  }, [sendMessage])
  
  const sendUserIntent = useCallback((text: string) => {
    sendMessage({
      type: 'user_intent',
      text,
      timestamp: Date.now()
    })
  }, [sendMessage])
  
  const sendInterrupt = useCallback((who: 'user' | 'ai' = 'user') => {
    sendMessage({
      type: 'interrupt',
      who,
      timestamp: Date.now()
    })
  }, [sendMessage])
  
  return {
    sendVoiceChunk,
    sendUserIntent,
    sendInterrupt
  }
}
