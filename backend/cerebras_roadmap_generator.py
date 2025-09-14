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
    
    # Define 5 models optimized for rate limits (tokens/min)
    models = [
        "qwen-3-coder-480b",       # Agent 1 - 150,000 tokens/min (highest throughput)
        "llama-3.3-70b",          # Agent 2 - 64,000 tokens/min, 65k context
        "qwen-3-32b",             # Agent 3 - 64,000 tokens/min, 65k context  
        "gpt-oss-120b",           # Agent 4 - 64,000 tokens/min, 65k context
        "qwen-3-235b-a22b-instruct-2507"  # Agent 5 - 60,000 tokens/min, 65k context
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
    
    # Save the final combined roadmap with fixed filename
    output_file = "cerebras_multi_agent_roadmap.md"
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
    "1": {{"name": "Lesson Name 1", "weight": 0, "prerequisites": [2, 3]}},
    "2": {{"name": "Lesson Name 2", "weight": 0, "prerequisites": [4]}},
    "3": {{"name": "Lesson Name 3", "weight": 0, "prerequisites": [4, 5]}},
    "4": {{"name": "Lesson Name 4", "weight": 0, "prerequisites": []}},
    "5": {{"name": "Lesson Name 5", "weight": 0, "prerequisites": []}}
  }},
  [
    "Do you understand [concept 1]? (Yes/No)",
    "Can you explain [concept 2]? (Yes/No)", 
    "Do you know how to [skill 3]? (Yes/No)",
    "Can you apply [concept 4]? (Yes/No)",
    "Do you understand [concept 5]? (Yes/No)"
  ]
]

CRITICAL REQUIREMENTS:
- First dict: Node numbers (as strings) mapped to objects with "name", "weight", and "prerequisites" array (weight always 0)
- Second element: Array of exactly 5 diagnostic questions
- ALL QUESTIONS MUST BE YES/NO FORMAT: Start with "Do you understand...", "Can you explain...", "Do you know how to...", etc.
- NEVER use open-ended questions or questions marked as "(Open-ended)"
- ALL questions must end with "(Yes/No)"
- Graph must be connected (every node reachable from node 1)
- Focus on TEACHABLE CONCEPTS only
- Return valid JSON array only, no markdown formatting"""

    try:
        print("🤖 Running final consolidation with Cerebras...")
        final_output = call_cerebras_api(consolidation_prompt)
        
        # Save final consolidated output as JSON with fixed filename
        final_file = "node_outputs/final_consolidated_roadmap.json"
        with open(final_file, 'w', encoding='utf-8') as f:
            f.write(final_output)
        
        print(f"✅ Final consolidation completed: {final_file}")
        print(f"📊 Final output length: {len(final_output)} characters")
        
        return final_output, final_file
        
    except Exception as e:
        print(f"❌ Final consolidation failed: {e}")
        return None, None

def analyze_diagnostic_answer(question: str, answer: bool, node_names: dict) -> dict:
    """
    Analyze a diagnostic answer and return weight adjustments for nodes.
    
    Args:
        question: The diagnostic question asked
        answer: True if user answered "Yes", False if "No"
        node_names: Dictionary of node_id -> node_name
    
    Returns:
        Dictionary of node_id -> weight_offset (-0.2 to 0.2)
    """
    
    # Create prompt for analyzing the diagnostic answer
    analysis_prompt = f"""You are an educational assessment expert. Analyze a student's diagnostic answer and determine how it affects their understanding of different calculus topics.

DIAGNOSTIC QUESTION: "{question}"
STUDENT ANSWER: {"Yes" if answer else "No"}

AVAILABLE TOPICS:
{json.dumps(node_names, indent=2)}

Based on the student's answer, provide weight adjustments for each topic from -0.2 to 0.2:

CRITICAL RULE: 
- "YES" (knows something) = ONLY NEGATIVE or ZERO adjustments (never positive)
- "NO" (doesn't know) = ONLY POSITIVE or ZERO adjustments (never negative)

IF STUDENT ANSWERED "YES" (shows knowledge):
- NEGATIVE (-0.2 to -0.1): Topics directly related to the question - reduce priority since student understands
- ZERO (0.0): Topics not related to this specific question

IF STUDENT ANSWERED "NO" (shows lack of knowledge):
- POSITIVE (0.1 to 0.2): Topics directly related to the question - increase priority since student needs help
- ZERO (0.0): Topics not related to this specific question

NEVER give positive adjustments for "YES" answers or negative adjustments for "NO" answers. Most topics should be 0.0 unless directly relevant.

Consider:
1. Direct relevance of the question to each topic
2. Prerequisites and dependencies between topics  
3. Whether "Yes" shows mastery or "No" shows gaps
4. Balance positive and negative adjustments appropriately

Return ONLY a valid JSON object with this exact format:
{{
  "1": -0.2,
  "2": 0.0,
  "3": 0.2,
  "4": 0.1,
  "5": 0.0,
  "6": -0.1,
  "7": 0.0,
  "8": 0.2,
  "9": 0.0,
  "10": 0.0,
  "11": 0.0,
  "12": 0.0
}}

Include ALL node IDs from the available topics, even if the adjustment is 0.0."""

    try:
        print(f"🧠 Analyzing diagnostic answer: '{question}' -> {'Yes' if answer else 'No'}")
        response = call_cerebras_api(analysis_prompt)
        
        # Print the LLM response for debugging
        print(f"🤖 LLM Analysis Response:")
        print(f"Question: {question}")
        print(f"Answer: {answer}")
        print(f"Raw LLM Response: {response}")
        print("-" * 50)
        
        # Parse the response to extract weight adjustments
        try:
            # Clean the response - remove markdown code blocks if present
            cleaned_response = response.strip()
            if cleaned_response.startswith('```json'):
                # Extract JSON from markdown code block
                start_idx = cleaned_response.find('{')
                end_idx = cleaned_response.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    cleaned_response = cleaned_response[start_idx:end_idx]
            elif cleaned_response.startswith('```'):
                # Handle generic code blocks
                lines = cleaned_response.split('\n')
                # Remove first and last lines (``` markers)
                if len(lines) > 2:
                    cleaned_response = '\n'.join(lines[1:-1])
            
            weight_adjustments = json.loads(cleaned_response)
            print(f"✅ Parsed weight adjustments: {weight_adjustments}")
            return weight_adjustments
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing Cerebras response: {e}")
            print(f"Raw response: {response}")
            print(f"Cleaned response: {cleaned_response}")
            # Return default adjustments if parsing fails
            return {node_id: 0.0 for node_id in node_names.keys()}
        
    except Exception as e:
        print(f"❌ Diagnostic analysis failed: {e}")
        # Return zero adjustments as fallback
        return {str(i): 0.0 for i in range(1, len(node_names) + 1)}

def update_node_weights(json_file_path: str, weight_adjustments: dict) -> bool:
    """
    Update the weights in the JSON file based on diagnostic analysis.
    
    Args:
        json_file_path: Path to the JSON file to update
        weight_adjustments: Dictionary of node_id -> weight_offset
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Load current JSON data
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Update weights in the first element (nodes dictionary)
        nodes = data[0]
        updated_count = 0
        for node_id, weight_offset in weight_adjustments.items():
            if node_id in nodes:
                current_weight = nodes[node_id].get('weight', 0.0)
                new_weight = max(-1.0, min(1.0, current_weight + weight_offset))  # Clamp between -1.0 and 1.0
                nodes[node_id]['weight'] = round(new_weight, 2)
                updated_count += 1
                print(f"📊 Node {node_id}: {current_weight} -> {new_weight} (Δ{weight_offset:+.1f})")
            else:
                print(f"⚠️ Node {node_id} not found in data")
        
        print(f"📊 Updated {updated_count} nodes out of {len(weight_adjustments)} adjustments")
        
        # Save updated JSON data with explicit write
        print(f"💾 Writing updated data to: {json_file_path}")
        print(f"💾 Data to write: {json.dumps(data, indent=2)[:200]}...")
        
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.flush()  # Force write to disk
            
        # Verify the write was successful
        with open(json_file_path, 'r', encoding='utf-8') as f:
            verify_data = json.load(f)
            verify_weights = {k: v.get('weight', 0) for k, v in verify_data[0].items()}
            print(f"✅ Verification - weights after save: {verify_weights}")
        
        print(f"✅ Updated weights saved to {json_file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update node weights: {e}")
        return False

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
