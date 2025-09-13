"""
AI Whiteboard Tutor - Main FastAPI Application
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import asyncio
import time
import json
from typing import Dict, Any, Deque, List
from collections import deque
from dataclasses import dataclass, field

from .core.session import SessionState
from .core.context import build_mcp_context
from .services.cerebras import cerebras_route
from .services.claude import claude_tutor_plan
from .services.audio import WisprClient
from .core.conversation import ConversationManager
from .core.annotations import animate_annotation, realize_tutor_plan
from .core.knowledge_graph import KnowledgeGraph

# FastAPI App
app = FastAPI(
    title="AI Whiteboard Tutor",
    description="Real-time multimodal AI tutoring system",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global session storage (in production, use Redis/database)
sessions: Dict[str, SessionState] = {}
conv_managers: Dict[str, ConversationManager] = {}
knowledge_graphs: Dict[str, KnowledgeGraph] = {}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Whiteboard Tutor Backend",
        "status": "running",
        "endpoints": {
            "websocket": "/ws/{session_id}",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    import os
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "environment": {
            "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
            "cerebras": bool(os.getenv("CEREBRAS_API_KEY")),
            "wispr": bool(os.getenv("WISPR_API_KEY")),
            "fetchai": bool(os.getenv("FETCHAI_AGENT_KEY"))
        },
        "active_sessions": len(sessions)
    }

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(session_id: str, websocket: WebSocket):
    """Main WebSocket endpoint for real-time communication"""
    await websocket.accept()
    print(f"🔌 New WebSocket connection: {session_id}")
    
    # Initialize session state
    state = sessions.setdefault(session_id, SessionState())
    conv_manager = conv_managers.setdefault(session_id, ConversationManager(state))
    kg = knowledge_graphs.setdefault(session_id, KnowledgeGraph())
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "subtitle",
            "text": "Hi! I'm your AI math tutor. Start drawing or speaking, and I'll help guide you.",
            "mode": "hint",
            "ttlMs": 5000
        })
        
        # Main message handling loop
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            
            print(f"📨 Message from {session_id}: {msg_type}")
            
            if msg_type == "canvas_update":
                await handle_canvas_update(websocket, state, msg, kg)
                
            elif msg_type == "pen_event":
                await handle_pen_event(websocket, state, msg)
                
            elif msg_type == "user_intent":
                await handle_user_intent(websocket, state, msg["text"], kg)
                
            elif msg_type == "voice_chunk":
                await handle_voice_chunk(websocket, state, msg)
                
            elif msg_type == "interrupt":
                await handle_user_interrupt(websocket, state, conv_manager)
                
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
                
            else:
                print(f"⚠️  Unknown message type: {msg_type}")
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected: {session_id}")
        # Cleanup session if needed
        if session_id in sessions and not state.persistent:
            del sessions[session_id]
            del conv_managers[session_id]
            del knowledge_graphs[session_id]
    except Exception as e:
        print(f"❌ WebSocket error for {session_id}: {e}")
        await websocket.close()

async def handle_canvas_update(ws: WebSocket, state: SessionState, msg: dict, kg: KnowledgeGraph):
    """Handle canvas screenshot updates"""
    state.canvas_buf.append({
        **msg,
        "timestamp": time.time()
    })
    state.last_activity_ts = time.time()
    
    # Quick routing decision with Cerebras
    context = build_mcp_context(state, kg_state=kg)
    
    try:
        route_decision = await cerebras_route(context)
        
        # Check if AI should interrupt (urgent correction needed)
        if (route_decision.get("interrupt") == "urgent" and 
            state.ai_can_interrupt and 
            not state.speaking):
            
            await inject_ai_intervention(ws, state, reason="urgent_issue")
            
        # Update knowledge graph based on visual analysis
        if "concepts" in route_decision:
            kg.update_from_interaction(
                route_decision["concepts"], 
                route_decision.get("outcome", "neutral")
            )
            
            # Send knowledge graph update to client
            await ws.send_json({
                "type": "knowledge_graph_update",
                "nodes": [
                    {"id": node.id, "mastery": node.mastery, "importance": node.importance}
                    for node in kg.nodes.values()
                ],
                "edges": [
                    {"source": edge[0], "target": edge[1], "strength": strength}
                    for edge, strength in kg.edges.items()
                ]
            })
            
    except Exception as e:
        print(f"❌ Error in canvas update routing: {e}")

async def handle_pen_event(ws: WebSocket, state: SessionState, msg: dict):
    """Handle real-time pen drawing events"""
    state.pen_events.append({
        **msg,
        "timestamp": time.time()
    })
    state.last_activity_ts = time.time()
    
    # For real-time collaboration, broadcast to other users
    # (In a multi-user system, you'd broadcast to other sessions)

async def handle_user_intent(ws: WebSocket, state: SessionState, text: str, kg: KnowledgeGraph):
    """Handle explicit user text/speech input"""
    state.user_intents.append({
        "text": text,
        "timestamp": time.time()
    })
    
    # Build comprehensive context for Claude
    context = build_mcp_context(state, user_text=text, kg_state=kg)
    
    try:
        # Get tutoring plan from Claude
        plan = await claude_tutor_plan(context)
        
        # Execute the tutoring plan
        await realize_tutor_plan(ws, state, plan)
        
        # Update knowledge graph based on interaction
        if "concepts" in plan:
            kg.update_from_interaction(plan["concepts"], plan.get("outcome", "success"))
            
    except Exception as e:
        print(f"❌ Error handling user intent: {e}")
        await ws.send_json({
            "type": "toast",
            "text": "Sorry, I had trouble processing that. Could you try again?",
            "kind": "warn"
        })

async def handle_voice_chunk(ws: WebSocket, state: SessionState, msg: dict):
    """Handle voice audio chunks for transcription"""
    # Store audio chunk
    state.audio_chunks.append({
        "data": msg.get("audioBytes"),
        "timestamp": time.time()
    })
    
    # In a real implementation, you'd stream this to Wispr
    # For now, we'll simulate transcription
    try:
        # Placeholder for Wispr integration
        # wispr = WisprClient(api_key=os.getenv("WISPR_API_KEY"))
        # transcript = await wispr.transcribe_chunk(msg["audioBytes"])
        
        # Simulated response
        if len(state.audio_chunks) > 10:  # Process every 10 chunks
            await ws.send_json({
                "type": "subtitle",
                "text": "[Voice transcription would appear here]",
                "mode": "speak",
                "ttlMs": 3000
            })
            state.audio_chunks.clear()
            
    except Exception as e:
        print(f"❌ Error processing voice chunk: {e}")

async def handle_user_interrupt(ws: WebSocket, state: SessionState, conv_manager: ConversationManager):
    """Handle user interruption of AI speech"""
    conv_manager.user_interrupt()
    
    await ws.send_json({
        "type": "subtitle",
        "text": "I'm listening...",
        "mode": "hint",
        "ttlMs": 2000
    })

async def inject_ai_intervention(ws: WebSocket, state: SessionState, reason: str):
    """Inject urgent AI correction/intervention"""
    # Map reasons to interventions
    interventions = {
        "urgent_issue": "Hold on - let me point out something important here.",
        "critical_error": "I notice a critical error that we should fix right away.",
        "misconception": "I want to address a key concept before you continue."
    }
    
    message = interventions.get(reason, "Let me help you with something.")
    
    await ws.send_json({
        "type": "subtitle",
        "text": message,
        "mode": "urgent",
        "ttlMs": 4000
    })
    
    # Mark AI as speaking
    state.speaking = True
    
    # After intervention, return control
    await asyncio.sleep(1.5)
    state.speaking = False

# Additional utility endpoints
@app.get("/api/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Get session status and stats"""
    if session_id not in sessions:
        return {"error": "Session not found"}
    
    state = sessions[session_id]
    kg = knowledge_graphs.get(session_id, KnowledgeGraph())
    
    return {
        "session_id": session_id,
        "active": True,
        "last_activity": state.last_activity_ts,
        "canvas_updates": len(state.canvas_buf),
        "user_intents": len(state.user_intents),
        "speaking": state.speaking,
        "knowledge_nodes": len(kg.nodes),
        "weak_concepts": kg.weak_concepts()
    }

@app.post("/api/session/{session_id}/reset")
async def reset_session(session_id: str):
    """Reset a session state"""
    if session_id in sessions:
        del sessions[session_id]
    if session_id in conv_managers:
        del conv_managers[session_id]
    if session_id in knowledge_graphs:
        del knowledge_graphs[session_id]
    
    return {"message": f"Session {session_id} reset successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
