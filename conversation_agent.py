#!/usr/bin/env python3

import os
import sys
import json
from typing import List, Dict, Optional
from dotenv import load_dotenv
from inference import CerebrasConversationalLLM

# Load environment variables from .env file
load_dotenv()


class ConversationAgent:
    """
    A text-based conversational agent using Cerebras that maintains conversation context
    and can handle prompts with memory of previous interactions
    """
    
    def __init__(self, model: str = "llama-3.3-70b"):
        """
        Initialize the conversation agent
        
        Args:
            model: Cerebras model to use
        """
        self.model = model
        
        # Initialize Cerebras LLM
        try:
            self.llm = CerebrasConversationalLLM(model=model)
            print(f"✅ Cerebras LLM initialized with model: {model}")
            
            # Set up system message for conversation tracking
            self.llm.add_system_message(
                "You are a helpful AI assistant with excellent memory. "
                "Remember important details from our conversation and refer back to them when relevant. "
                "If the user asks you to remember something specific, acknowledge it and keep it in context. "
                "Be conversational, helpful, and maintain context throughout our discussion."
            )
            
        except Exception as e:
            print(f"❌ Failed to initialize Cerebras LLM: {e}")
            raise
        
        self.conversation_id = None
        self.turn_count = 0
    
    def chat(self, message: str, stream: bool = False) -> str:
        """
        Send a message and get a response with full conversation context
        
        Args:
            message: User message
            stream: Whether to stream the response
            
        Returns:
            AI response
        """
        try:
            response = self.llm.chat(message, stream=stream)
            self.turn_count += 1
            return response
        except Exception as e:
            error_msg = f"Error during chat: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg
    
    def add_context(self, context: str):
        """
        Add additional context to the conversation
        
        Args:
            context: Context information to add
        """
        context_message = f"[Context]: {context}"
        self.llm.conversation_history.append({
            "role": "system",
            "content": context_message
        })
        print(f"📝 Added context: {context}")
    
    def remember(self, information: str):
        """
        Explicitly ask the agent to remember specific information
        
        Args:
            information: Information to remember
        """
        memory_prompt = f"Please remember this important information: {information}"
        response = self.chat(memory_prompt)
        return response
    
    def get_conversation_summary(self) -> str:
        """
        Get a summary of the current conversation
        
        Returns:
            Summary of the conversation
        """
        if len(self.llm.conversation_history) < 2:
            return "No conversation history yet."
        
        try:
            summary_prompt = (
                "Please provide a brief summary of our conversation so far, "
                "highlighting the key topics discussed and any important information "
                "I should remember about the user or their requests."
            )
            return self.chat(summary_prompt)
        except Exception as e:
            return f"Error generating summary: {e}"
    
    def clear_conversation(self):
        """Clear conversation history but maintain system message"""
        self.llm.clear_history()
        self.llm.add_system_message(
            "You are a helpful AI assistant with excellent memory. "
            "Remember important details from our conversation and refer back to them when relevant. "
            "If the user asks you to remember something specific, acknowledge it and keep it in context. "
            "Be conversational, helpful, and maintain context throughout our discussion."
        )
        self.turn_count = 0
        print("🗑️ Conversation history cleared")
    
    def save_conversation(self, filename: str = None):
        """
        Save the conversation to a file
        
        Args:
            filename: File to save to (auto-generated if None)
        """
        if filename is None:
            filename = f"conversation_{self.turn_count}_turns.json"
        
        self.llm.save_conversation(filename)
        return filename
    
    def load_conversation(self, filename: str):
        """
        Load a previous conversation
        
        Args:
            filename: File to load from
        """
        self.llm.load_conversation(filename)
        # Update turn count based on loaded history
        self.turn_count = len([msg for msg in self.llm.conversation_history if msg['role'] == 'user'])
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get the full conversation history"""
        return self.llm.get_history()
    
    def process_prompt(self, prompt: str, add_context: str = None) -> str:
        """
        Process a prompt with optional additional context
        
        Args:
            prompt: The main prompt/question
            add_context: Optional additional context to include
            
        Returns:
            AI response
        """
        if add_context:
            self.add_context(add_context)
        
        return self.chat(prompt)


def interactive_conversation():
    """Run an interactive conversation session"""
    print("🧠 Cerebras Conversation Agent")
    print("=" * 40)
    
    # Check for API key
    if not os.environ.get("CEREBRAS_KEY"):
        print("❌ Please set your CEREBRAS_KEY in your .env file")
        print("   Add: CEREBRAS_KEY=your-api-key-here")
        return
    
    try:
        agent = ConversationAgent()
        print("✅ Agent ready for conversation!")
        
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        return
    
    print("\n💬 Start chatting! Commands available:")
    print("   /remember <info> - Ask agent to remember specific information")
    print("   /context <info> - Add context to conversation")
    print("   /summary - Get conversation summary")
    print("   /save [filename] - Save conversation")
    print("   /load <filename> - Load conversation")
    print("   /clear - Clear conversation history")
    print("   /quit - Exit")
    print("-" * 40)
    
    while True:
        try:
            user_input = input(f"\n👤 You ({agent.turn_count} turns): ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.startswith('/'):
                command_parts = user_input[1:].split(' ', 1)
                command = command_parts[0].lower()
                args = command_parts[1] if len(command_parts) > 1 else ""
                
                if command == 'quit':
                    print("👋 Goodbye!")
                    break
                
                elif command == 'remember':
                    if args:
                        response = agent.remember(args)
                        print(f"🤖 Agent: {response}")
                    else:
                        print("❓ Usage: /remember <information to remember>")
                
                elif command == 'context':
                    if args:
                        agent.add_context(args)
                    else:
                        print("❓ Usage: /context <context information>")
                
                elif command == 'summary':
                    summary = agent.get_conversation_summary()
                    print(f"📋 Summary: {summary}")
                
                elif command == 'save':
                    filename = args if args else None
                    saved_file = agent.save_conversation(filename)
                    print(f"💾 Saved to: {saved_file}")
                
                elif command == 'load':
                    if args:
                        agent.load_conversation(args)
                    else:
                        print("❓ Usage: /load <filename>")
                
                elif command == 'clear':
                    agent.clear_conversation()
                
                else:
                    print(f"❓ Unknown command: {command}")
                
                continue
            
            # Regular conversation
            response = agent.chat(user_input)
            print(f"🤖 Agent: {response}")
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


def quick_prompt(prompt: str, context: str = None, model: str = "llama-3.3-70b") -> str:
    """
    Quick single prompt with optional context (useful for scripting)
    
    Args:
        prompt: The prompt to send
        context: Optional context to include
        model: Model to use
        
    Returns:
        AI response
    """
    try:
        agent = ConversationAgent(model=model)
        return agent.process_prompt(prompt, context)
    except Exception as e:
        return f"Error: {e}"


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line mode
        prompt = " ".join(sys.argv[1:])
        response = quick_prompt(prompt)
        print(response)
    else:
        # Interactive mode
        interactive_conversation()
