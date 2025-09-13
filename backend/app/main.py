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
from .services.cerebras import cerebras_route, cerebras_tutor
from .services.claude import claude_tutor_plan, claude_knowledge_graph
from .services.audio import handle_voice_input
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
            "cerebras": bool(os.getenv("CEREBRAS_API_KEY"))
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
    
    # Create a fresh knowledge graph for each new session
    if session_id not in knowledge_graphs:
        kg = KnowledgeGraph()
        knowledge_graphs[session_id] = kg
        print(f"🧠 Created fresh knowledge graph for session: {session_id}")
    else:
        kg = knowledge_graphs[session_id]
    
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
                
            elif msg_type == "voice_input":
                # New handler for Web Speech API transcribed voice input
                await handle_voice_input_message(websocket, state, msg, kg)
                
            elif msg_type == "voice_chunk":
                # Legacy voice chunk handler (for Wispr/audio streaming)
                await handle_voice_chunk(websocket, state, msg)
                
            elif msg_type == "screenshot_analysis":
                # New handler for whiteboard screenshot analysis
                await handle_screenshot_analysis(websocket, state, msg, kg)
                
            elif msg_type == "screenshot_context":
                # Handler for voice-triggered screenshot context
                await handle_screenshot_context(websocket, state, msg, kg)
                
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
    context = await build_mcp_context(state, kg_state=kg)
    
    try:
        route_decision = await cerebras_route(context)
        
        # For canvas updates with visual content, use Claude for multimodal analysis
        if msg.get("pngBase64"):
            print(f"📸 Processing screenshot with Claude (multimodal)")
            try:
                # Add the screenshot to the context
                context["visual_state"]["canvas_screenshot"] = msg.get("pngBase64")
                context["visual_state"]["screenshot_timestamp"] = time.time()
                
                # Use Claude for visual analysis and tutoring
                tutor_response = await claude_tutor_plan(context)
                
                await ws.send_json({
                    "type": "subtitle",
                    "text": tutor_response.get("say", "I can see your work! Let me analyze it."),
                    "mode": tutor_response.get("mode", "explanation"),
                    "ttlMs": 8000
                })
                
                # Update knowledge graph based on visual analysis
                if "concepts" in tutor_response:
                    kg.update_from_interaction(tutor_response["concepts"], tutor_response.get("outcome", "neutral"))
                    
            except Exception as e:
                print(f"❌ Error in Claude visual analysis: {e}")
        
        # Check if AI should interrupt (urgent correction needed)
        elif (route_decision.get("interrupt") == "urgent" and 
            state.ai_can_interrupt and 
            not state.speaking):
            
            # Get immediate tutoring response for urgent issues
            tutor_response = await cerebras_tutor(context)
            
            await ws.send_json({
                "type": "subtitle", 
                "text": tutor_response["message"],
                "mode": "urgent",
                "ttlMs": 6000
            })
            
            # Send visual annotations if any
            if tutor_response.get("visual_annotations"):
                await ws.send_json({
                    "type": "visual_annotations",
                    "annotations": tutor_response["visual_annotations"]
                })
            
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
    
    # Build comprehensive context for AI processing
    context = await build_mcp_context(state, user_text=text, kg_state=kg)
    
    try:
        # Get real-time tutoring response from Cerebras (low-latency)
        tutor_response = await cerebras_tutor(context)
        
        # Send tutoring response to client
        await ws.send_json({
            "type": "subtitle",
            "text": tutor_response["message"],
            "mode": tutor_response["feedback_type"],
            "ttlMs": 8000
        })
        
        # Send visual annotations if any
        if tutor_response.get("visual_annotations"):
            await ws.send_json({
                "type": "visual_annotations",
                "annotations": tutor_response["visual_annotations"]
            })
        
        # Update knowledge graph based on interaction
        if "concepts" in tutor_response:
            kg.update_from_interaction(tutor_response["concepts"], "success")
        
        # Generate comprehensive knowledge graph update in background using Claude
        asyncio.create_task(update_knowledge_graph_background(context, kg, ws))
            
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
    
    # Process audio chunks (using Web Speech API on frontend)
    # For now, we'll simulate transcription
    try:
        
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

async def handle_voice_input_message(ws: WebSocket, state: SessionState, msg: dict, kg: KnowledgeGraph):
    """Handle voice input from Web Speech API (already transcribed)"""
    try:
        # Process the voice input using our new audio service
        processed_transcript = await handle_voice_input(ws, state, msg)
        
        if processed_transcript and processed_transcript.get("text"):
            # Treat the transcribed voice input as a user intent
            text = processed_transcript["text"]
            await handle_user_intent(ws, state, text, kg)
            
    except Exception as e:
        print(f"❌ Error handling voice input: {e}")
        await ws.send_json({
            "type": "subtitle",
            "text": "Sorry, there was an error processing your voice input.",
            "mode": "correction",
            "ttlMs": 3000
        })

async def handle_screenshot_context(ws: WebSocket, state: SessionState, msg: dict, kg: KnowledgeGraph):
    """Handle screenshot context messages from voice-triggered captures"""
    try:
        print(f"🎤📸 Processing voice-triggered screenshot context...")
        
        # Extract screenshot data
        image_data = msg.get("image")
        trigger = msg.get("trigger", "speech_end")
        metadata = msg.get("metadata", {})
        
        if not image_data:
            print("❌ No image data in screenshot context message")
            return
            
        # Store the screenshot in state
        state.canvas_buf.append({
            "type": "screenshot_context",
            "pngBase64": image_data,
            "trigger": trigger,
            "metadata": metadata,
            "timestamp": time.time()
        })
        state.last_activity_ts = time.time()
        
        # Build context for AI analysis
        context = await build_mcp_context(state, kg_state=kg)
        context["visual_state"]["canvas_screenshot"] = image_data
        context["visual_state"]["screenshot_timestamp"] = time.time()
        context["visual_state"]["trigger"] = trigger
        
        # Use Claude for multimodal analysis of the whiteboard
        print(f"🧠 Analyzing whiteboard screenshot with Claude...")
        tutor_response = await claude_tutor_plan(context)
        
        # Send AI response based on visual analysis
        await ws.send_json({
            "type": "subtitle",
            "text": tutor_response.get("say", "I can see your work now! Let me take a look..."),
            "mode": tutor_response.get("mode", "analysis"),
            "ttlMs": 8000
        })
        
        # Update knowledge graph based on visual analysis
        if "concepts" in tutor_response:
            kg.update_from_interaction(tutor_response["concepts"], tutor_response.get("outcome", "neutral"))
            
        print(f"✅ Screenshot context processed successfully")
            
    except Exception as e:
        print(f"❌ Error handling screenshot context: {e}")
        await ws.send_json({
            "type": "subtitle",
            "text": "I'm having trouble seeing your work right now. Could you try again?",
            "mode": "correction",
            "ttlMs": 4000
        })

async def handle_screenshot_analysis(ws: WebSocket, state: SessionState, msg: dict, kg: KnowledgeGraph):
    """Handle legacy screenshot analysis messages"""
    # Redirect to the new screenshot context handler
    await handle_screenshot_context(ws, state, msg, kg)

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

async def update_knowledge_graph_background(context: Dict[str, Any], kg: KnowledgeGraph, ws: WebSocket):
    """Update knowledge graph using Claude analysis in background"""
    try:
        # Generate comprehensive knowledge graph analysis using Claude
        kg_analysis = await claude_knowledge_graph(context)
        
        # Update the knowledge graph with Claude's analysis
        for concept in kg_analysis.get("concepts_identified", []):
            # Add concept if it doesn't exist
            if concept["id"] not in kg.nodes:
                kg.add_concept(concept["id"], concept.get("importance", 0.5))
            
            # Update mastery based on evidence
            node = kg.nodes[concept["id"]]
            node.mastery = concept["mastery_evidence"]
            node.last_updated = time.time()
        
        # Add concept relationships
        for rel in kg_analysis.get("concept_relationships", []):
            if rel["prerequisite"] not in kg.nodes:
                kg.add_concept(rel["prerequisite"], 0.5)
            if rel["dependent"] not in kg.nodes:
                kg.add_concept(rel["dependent"], 0.5)
                
            kg.add_relationship(
                rel["prerequisite"],
                rel["dependent"],
                rel["strength"],
                rel.get("relationship_type", "requires")
            )
        
        # Send updated knowledge graph to client
        await ws.send_json({
            "type": "knowledge_graph_update",
            "nodes": [
                {
                    "id": node.id,
                    "name": getattr(node, 'name', node.id),
                    "mastery": node.mastery,
                    "importance": node.importance,
                    "misconceptions": kg_analysis.get("mastery_gaps", [])
                }
                for node in kg.nodes.values()
            ],
            "edges": [
                {
                    "source": edge[0],
                    "target": edge[1],
                    "strength": strength,
                    "type": "prerequisite"
                }
                for edge, strength in kg.edges.items()
            ],
            "analysis": {
                "learning_objectives": kg_analysis.get("learning_objectives", []),
                "recommended_focus": kg_analysis.get("recommended_focus", []),
                "mastery_gaps": kg_analysis.get("mastery_gaps", [])
            }
        })
        
        print(f"✅ Knowledge graph updated with {len(kg_analysis.get('concepts_identified', []))} concepts")
        
    except Exception as e:
        print(f"❌ Error updating knowledge graph: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
