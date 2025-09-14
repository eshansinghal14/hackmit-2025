#!/usr/bin/env python3

import json
import requests
import os
import asyncio
import aiohttp
from typing import List
from dotenv import load_dotenv
from llm_formatter import create_multi_agent_contexts, combine_agent_results

# Load environment variables
load_dotenv()

def load_search_results(filename: str):
    """Load the search results JSON file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading {filename}: {e}")
        return None

def load_existing_prompt(filename: str):
    """Load the existing knowledge roadmap prompt"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"❌ Error loading {filename}: {e}")
        return None

def call_cerebras_api(prompt: str, model: str = "llama-3.3-70b"):
    """Call Cerebras API directly (synchronous)"""
    
    api_key = os.getenv('CEREBRAS_KEY')
    if not api_key:
        raise Exception("CEREBRAS_KEY not found in environment variables")
    
    url = "https://api.cerebras.ai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert educational content curator who creates comprehensive, practical learning roadmaps. Focus on actionable steps, real-world applications, and progressive skill building."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "max_tokens": 4000,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        return result['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"API request failed: {e}")
    except KeyError as e:
        raise Exception(f"Unexpected API response format: {e}")

async def call_cerebras_api_async(session, prompt: str, agent_id: int, model: str):
    """Call Cerebras API asynchronously with specified model"""
    
    api_key = os.getenv('CEREBRAS_KEY')
    if not api_key:
        raise Exception("CEREBRAS_KEY not found in environment variables")
    
    url = "https://api.cerebras.ai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert educational content curator who creates comprehensive, practical learning roadmaps. Focus on actionable steps, real-world applications, and progressive skill building."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "max_tokens": 4000,
        "temperature": 0.7
    }
    
    try:
        async with session.post(url, headers=headers, json=data) as response:
            response.raise_for_status()
            result = await response.json()
            return agent_id, result['choices'][0]['message']['content']
        
    except Exception as e:
        return agent_id, f"Agent {agent_id} failed: {str(e)}"

def run_multi_agent_cerebras(search_results_file: str = None):
    """Run 5 Cerebras agents in parallel using the multi-agent context system"""
    
    print(f"🧠 Running 5 Cerebras agents for distributed knowledge extraction...")
    print("=" * 60)
    
    # Use existing agent context files
    agent_files = [f"agent_contexts/context_agent_{i}.txt" for i in range(1, 6)]
    if not all(os.path.exists(f) for f in agent_files):
        print("❌ Agent context files not found in agent_contexts/")
        return None
    else:
        print("📄 Using existing agent context files")
    
    # Extract topic from the first agent context file
    topic = "unknown_topic"
    try:
        with open(agent_files[0], 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for the topic in the context file
            if "Knowledge Nodes for:" in content:
                topic_line = [line for line in content.split('\n') if "Knowledge Nodes for:" in line][0]
                topic = topic_line.split("Knowledge Nodes for:")[-1].strip().replace(" ", "_").lower()
            elif "research topic:" in content.lower():
                topic_line = [line for line in content.split('\n') if "research topic:" in line.lower()][0]
                topic = topic_line.split(":")[-1].strip().replace(" ", "_").lower()
            
            # Clean up topic name - remove asterisks and other unwanted characters
            topic = topic.replace("*", "").replace("**", "").strip()
        print(f"📋 Detected topic: {topic}")
    except Exception as e:
        print(f"⚠️ Could not extract topic from context files, using 'unknown_topic': {e}")
    
    # Create results with extracted topic
    results = {"query": topic}
    
    # Define 5 different high-capacity models (60k+ token limits)
    models = [
        "llama-3.3-70b",           # Agent 1 - 65,536 tokens, 64k/min
        "gpt-oss-120b",            # Agent 2 - 65,536 tokens, 64k/min  
        "qwen-3-235b-a22b-instruct-2507",  # Agent 3 - 65,536 tokens, 60k/min
        "qwen-3-235b-a22b-thinking-2507",  # Agent 4 - 65,536 tokens, 60k/min
        "qwen-3-32b"               # Agent 5 - 65,536 tokens, 64k/min
    ]
    
    # Run all agents in parallel with different models
    async def run_agents_parallel():
        agent_outputs = [None] * 5  # Pre-allocate list to maintain order
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            # Create tasks for all agents with different models
            for i in range(1, 6):
                agent_file = f"agent_contexts/context_agent_{i}.txt"
                model = models[i-1]  # Get corresponding model
                
                # Load agent's context
                with open(agent_file, 'r', encoding='utf-8') as f:
                    agent_prompt = f.read()
                
                task = call_cerebras_api_async(session, agent_prompt, i, model)
                tasks.append(task)
                print(f"🤖 Agent {i} assigned model: {model}")
            
            print(f"\n🚀 Running all 5 agents in parallel with different models...")
            
            # Execute all tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in results:
                if isinstance(result, Exception):
                    print(f"❌ Agent failed with exception: {result}")
                    continue
                    
                agent_id, agent_output = result
                agent_outputs[agent_id - 1] = agent_output  # Store in correct position
                
                # Save individual agent output
                agent_output_file = f"node_outputs/agent_{agent_id}_output.txt"
                with open(agent_output_file, 'w', encoding='utf-8') as f:
                    f.write(agent_output)
                
                if agent_output.startswith("Agent") and "failed" in agent_output:
                    print(f"❌ Agent {agent_id} ({models[agent_id-1]}) failed")
                else:
                    print(f"✅ Agent {agent_id} ({models[agent_id-1]}) completed ({len(agent_output)} characters)")
        
        return agent_outputs
    
    # Run the parallel execution
    agent_outputs = asyncio.run(run_agents_parallel())
    
    # Combine all agent results
    print("\n🔄 Combining results from all 5 agents...")
    combined_roadmap = combine_agent_results(agent_outputs, results['query'])
    
    # Save the final combined roadmap
    output_file = f"cerebras_multi_agent_roadmap_{results['query'].replace(' ', '_')}.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(combined_roadmap)
    
    print(f"✅ Multi-agent roadmap generated and saved to: {output_file}")
    print(f"📊 Final roadmap length: {len(combined_roadmap)} characters")
    
    return combined_roadmap, output_file, agent_outputs

def run_final_consolidation_agent(agent_outputs: List[str], query: str):
    """Run a final agent to consolidate all nodes and remove bad ones"""
    
    print("\n🎯 Running final consolidation agent...")
    
    # Extract all nodes from agent outputs
    all_nodes = []
    for i, output in enumerate(agent_outputs, 1):
        print(f"📋 Extracting nodes from Agent {i}...")
        lines = output.split('\n')
        for line in lines:
            line = line.strip()
            # Look for numbered nodes with **bold** formatting
            if line and (line[0].isdigit() or line.startswith('**')):
                # Clean up the node text
                if line[0].isdigit():
                    # Format: "1. **Node Name**: Description"
                    node_text = line.split('.', 1)[1].strip() if '.' in line else line
                else:
                    # Format: "**Node Name**: Description" 
                    node_text = line
                
                # Extract just the node name if it has description
                if '**' in node_text and ':' in node_text:
                    # Extract text between ** markers before the colon
                    start = node_text.find('**') + 2
                    end = node_text.find('**', start)
                    if end > start:
                        node_name = node_text[start:end].strip()
                        all_nodes.append(node_name)
                elif '**' in node_text:
                    # Just extract the bold text
                    start = node_text.find('**') + 2
                    end = node_text.find('**', start)
                    if end > start:
                        node_name = node_text[start:end].strip()
                        all_nodes.append(node_name)
    
    print(f"📊 Extracted {len(all_nodes)} nodes from all agents")
    
    # Create consolidation prompt
    nodes_text = '\n'.join([f"{i+1}. {node}" for i, node in enumerate(all_nodes)])
    
    consolidation_prompt = f"""You are a final quality control agent for creating bite-sized lessons on "{query}". 

Below are ALL the knowledge nodes extracted by 5 specialized research agents. Your job is to:

## Your Task:
Create a comprehensive learning system with:

1. **Curated Lessons**: Select the best 8-12 focused lessons
2. **Prerequisites Graph**: Create adjacency list showing which lessons must be learned before others  
3. **Diagnostic Questions**: Generate 5 assessment questions to test understanding across all lessons

The graph MUST be connected (all nodes reachable) and represent logical learning progression.

Output ONLY a valid JSON array with exactly 2 elements in this format:

[
  {{
    "1": {{"name": "Lesson Name 1", "weight": 1, "prerequisites": [2, 3]}},
    "2": {{"name": "Lesson Name 2", "weight": 1, "prerequisites": [4]}},
    "3": {{"name": "Lesson Name 3", "weight": 1, "prerequisites": [4, 5]}},
    "4": {{"name": "Lesson Name 4", "weight": 1, "prerequisites": []}},
    "5": {{"name": "Lesson Name 5", "weight": 1, "prerequisites": []}}
  }},
  [
    "Do you know what a limit is in calculus? (Yes/No)",
    "Do you know how to find the derivative of a function? (Yes/No)", 
    "Do you know how to apply the chain rule? (Yes/No)",
    "Do you know how to solve optimization problems? (Yes/No)",
    "Do you know the fundamental theorem of calculus? (Yes/No)"
  ]
]

CRITICAL REQUIREMENTS:
- First dict: Node numbers (as strings) mapped to objects with "name", "weight", and "prerequisites" array (weight always 1)
- Second element: Array of exactly 5 diagnostic questions
- Graph must be connected (every node reachable from node 1)
- Focus on TEACHABLE CONCEPTS only
- Return valid JSON array only, no markdown formatting"""

    try:
        print("🤖 Running final consolidation with Cerebras...")
        final_output = call_cerebras_api(consolidation_prompt)
        
        # Save final consolidated output as JSON
        final_file = f"node_outputs/final_consolidated_nodes_{query.replace(' ', '_')}.json"
        with open(final_file, 'w', encoding='utf-8') as f:
            f.write(final_output)
        
        print(f"✅ Final consolidation completed: {final_file}")
        print(f"📊 Final output length: {len(final_output)} characters")
        
        return final_output, final_file
        
    except Exception as e:
        print(f"❌ Final consolidation failed: {e}")
        return None, None

if __name__ == "__main__":
    # Run multi-agent system from the most recent search results
    result = run_multi_agent_cerebras()
    
    if result:
        roadmap, output_file, agent_outputs = result
        print(f"\n🎉 Multi-agent learning roadmap generated successfully!")
        print(f"📄 File: {output_file}")
        print(f"🤖 Agents completed: {len([o for o in agent_outputs if not o.startswith('Agent') or 'failed' not in o])}/5")
        
        # Run final consolidation agent
        final_result = run_final_consolidation_agent(agent_outputs, roadmap.split('\n')[0].replace('# Comprehensive Knowledge Roadmap: ', '').strip().lower().replace(' ', '_'))
        
        if final_result:
            final_output, final_file = final_result
            print(f"\n🏆 Final consolidated nodes generated!")
            print(f"📄 File: {final_file}")
            print("\n" + "="*60)
            print("FINAL CURATED NODES PREVIEW:")
            print("="*60)
            print(final_output[:1500] + "..." if len(final_output) > 1500 else final_output)
        else:
            print("\n" + "="*60)
            print("MULTI-AGENT ROADMAP PREVIEW:")
            print("="*60)
            print(roadmap[:1500] + "..." if len(roadmap) > 1500 else roadmap)
    else:
        print("❌ Failed to generate multi-agent roadmap")
