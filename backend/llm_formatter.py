#!/usr/bin/env python3

import json
import os
from typing import Dict, List
from math import ceil

def split_results_into_chunks(results: Dict, num_chunks: int = 5) -> List[Dict]:
    """
    Split search results into equal chunks for multiple agents
    
    Args:
        results: Results from search_and_get_content function
        num_chunks: Number of chunks to create (default 5)
        
    Returns:
        List of result dictionaries, one for each chunk
    """
    
    if 'error' in results or not results.get('scraped_content'):
        return [results] * num_chunks
    
    # Get successful sites
    sites = [r for r in results['scraped_content'] if r.get('status') == 'success']
    
    if not sites:
        return [results] * num_chunks
    
    # Calculate chunk size
    chunk_size = ceil(len(sites) / num_chunks)
    
    chunks = []
    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = min((i + 1) * chunk_size, len(sites))
        
        chunk_sites = sites[start_idx:end_idx]
        
        # Create chunk result
        chunk_result = {
            'query': results['query'],
            'scraped_content': chunk_sites,
            'successful_scrapes': len(chunk_sites),
            'method': results.get('method', 'exa_search_content'),
            'chunk_info': {
                'chunk_number': i + 1,
                'total_chunks': num_chunks,
                'sites_in_chunk': len(chunk_sites),
                'total_sites': len(sites)
            }
        }
        
        chunks.append(chunk_result)
    
    return chunks

def format_chunk_for_agent(chunk_results: Dict, agent_number: int) -> str:
    """
    Format a chunk of search results for a specific Cerebras agent
    
    Args:
        chunk_results: Chunk of results for this agent
        agent_number: Agent number (1-5)
        
    Returns:
        Formatted string for agent context
    """
    
    if 'error' in chunk_results or not chunk_results.get('scraped_content'):
        return f"# Agent {agent_number} Context\n\nNo search results available for this agent."
    
    chunk_info = chunk_results.get('chunk_info', {})
    sites = chunk_results.get('scraped_content', [])
    
    formatted_text = f"""# Agent {agent_number} Research Context

## Assignment
You are Agent {agent_number} of {chunk_info.get('total_chunks', 5)} specialized research agents analyzing: "{chunk_results['query']}"

## Your Data Subset
- Agent ID: {agent_number}/{chunk_info.get('total_chunks', 5)}
- Sites Assigned: {len(sites)}
- Total Sites Across All Agents: {chunk_info.get('total_sites', 'Unknown')}
- Your Coverage: Sites {((agent_number-1) * len(sites)) + 1} to {agent_number * len(sites)}

## Your Research Sources

"""
    
    for i, site in enumerate(sites, 1):
        site_number = ((agent_number-1) * len(sites)) + i
        
        formatted_text += f"""### Source {site_number}: {site.get('title', 'Unknown Title')}

"""
        
        # Add content if available
        if site.get('content'):
            content = site['content']
            # Truncate very long content to keep context manageable
            if len(content) > 3000:
                content = content[:3000] + "... [Content truncated for context window]"
            
            formatted_text += f"**Content:**\n{content}\n\n"
        elif site.get('matches'):
            formatted_text += "**Key Excerpts:**\n"
            for j, match in enumerate(site['matches'][:3], 1):
                formatted_text += f"\n**Excerpt {j}:**\n"
                for context_line in match['highlighted_context']:
                    clean_line = context_line.replace('>>> ', '').replace(' <<<', '')
                    formatted_text += f"  {clean_line}\n"
        
        formatted_text += "\n---\n\n"
    
    return formatted_text

def create_agent_system_prompt(chunk_results: Dict, agent_number: int) -> str:
    """
    Create a system prompt for a specific Cerebras agent
    
    Args:
        chunk_results: Chunk of results for this agent
        agent_number: Agent number (1-5)
        
    Returns:
        Complete system prompt with research context for this agent
    """
    
    research_context = format_chunk_for_agent(chunk_results, agent_number)
    chunk_info = chunk_results.get('chunk_info', {})
    
    system_prompt = f"""You are Agent {agent_number} of {chunk_info.get('total_chunks', 5)}, a specialized research expert analyzing "{chunk_results.get('query', 'this topic')}". You are part of a distributed team where each agent analyzes a subset of research data to generate comprehensive knowledge nodes.

{research_context}

## Your Mission as Agent {agent_number}:
1. Analyze ONLY the research sources assigned to you above
2. Extract 3-5 key knowledge nodes from YOUR assigned sources
3. Each node should be a distinct concept, technique, or methodology
4. Base nodes strictly on the content provided in your sources
5. Focus on the most important and well-supported concepts
6. Ensure nodes are specific and actionable
7. Include both foundational and advanced concepts if present

## Agent Coordination:
- You are Agent {agent_number} of {chunk_info.get('total_chunks', 5)} total agents
- Each agent analyzes different sources to avoid duplication
- Your findings will be combined with other agents' results
- Focus on quality over quantity from your assigned sources

## Output Format:
Generate your knowledge nodes in this exact format:

**Agent {agent_number} Knowledge Nodes for: {chunk_results.get('query', 'Unknown').title()}**

1. [Node Name]
2. [Node Name]
3. [Node Name]
4. [Node Name]
5. [Node Name]

**Source Summary:**
- Sources Analyzed: {len(chunk_results.get('scraped_content', []))}
- Agent Coverage: {chunk_info.get('sites_in_chunk', 0)} of {chunk_info.get('total_sites', 0)} total sources

Generate your specialized knowledge nodes now based strictly on your assigned research sources above."""

    return system_prompt

def create_multi_agent_contexts(results: Dict, output_dir: str = "agent_contexts") -> List[str]:
    """
    Create 5 different context.txt files for 5 Cerebras agents
    
    Args:
        results: Results from search_and_get_content function
        output_dir: Directory to save context files
        
    Returns:
        List of created file paths
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Split results into 5 chunks
    chunks = split_results_into_chunks(results, num_chunks=5)
    
    created_files = []
    
    for i, chunk in enumerate(chunks, 1):
        # Create system prompt for this agent
        system_prompt = create_agent_system_prompt(chunk, i)
        
        # Save to context file
        filename = f"context_agent_{i}.txt"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(system_prompt)
        
        created_files.append(filepath)
        
        # Print stats for this agent
        sites_count = len(chunk.get('scraped_content', []))
        token_estimate = len(system_prompt) // 4
        
        print(f"📄 Agent {i} context created")
        print(f"   📁 File: {filepath}")
        print(f"   🌐 Sources: {sites_count}")
        print(f"   📊 Estimated tokens: {token_estimate:,}")
        print()
    
    return created_files

def estimate_token_count(text: str) -> int:
    """
    Rough estimate of token count (1 token ≈ 4 characters)
    
    Args:
        text: Text to estimate
        
    Returns:
        Estimated token count
    """
    return len(text) // 4

def combine_agent_results(agent_outputs: List[str], original_query: str) -> str:
    """
    Combine results from all 5 agents into a final knowledge roadmap
    
    Args:
        agent_outputs: List of outputs from each agent
        original_query: Original search query
        
    Returns:
        Combined knowledge roadmap
    """
    
    combined_roadmap = f"""# Comprehensive Knowledge Roadmap: {original_query.title()}

## Generated by 5 Specialized Cerebras Agents

This knowledge roadmap was created by analyzing research data across 5 specialized agents, each focusing on different sources to ensure comprehensive coverage.

## Combined Knowledge Nodes

"""
    
    all_nodes = []
    
    for i, output in enumerate(agent_outputs, 1):
        combined_roadmap += f"### Agent {i} Contributions\n"
        combined_roadmap += output + "\n\n"
        
        # Extract nodes for deduplication (basic)
        lines = output.split('\n')
        for line in lines:
            if line.strip().startswith(('1.', '2.', '3.', '4.', '5.')):
                node = line.strip()[3:].strip()  # Remove number and clean
                if node and node not in all_nodes:
                    all_nodes.append(node)
    
    combined_roadmap += f"""## Consolidated Node List ({len(all_nodes)} Total Nodes)

"""
    
    for i, node in enumerate(all_nodes, 1):
        combined_roadmap += f"{i}. {node}\n"
    
    combined_roadmap += f"""
## Summary
- Original Query: "{original_query}"
- Agents Deployed: 5
- Total Unique Nodes: {len(all_nodes)}
- Coverage: Comprehensive multi-agent analysis
"""
    
    return combined_roadmap

# Example usage
if __name__ == "__main__":
    # Look for any existing search results files or use research.py directly
    json_files = [f for f in os.listdir('.') if f.startswith('keyword_results_') and f.endswith('.json')]
    
    if not json_files:
        print("🔍 No existing search results found. Running new search...")
        try:
            from research import search_and_get_content
            
            # Run a sample search
            query = input("Enter search query (or press Enter for 'machine learning fundamentals'): ").strip()
            if not query:
                query = "machine learning fundamentals"
            
            print(f"🔍 Searching for: {query}")
            results = search_and_get_content(query, num_results=50)
            
        except ImportError:
            print("❌ Could not import research module. Please run a search first.")
            print("   Expected files like: keyword_results_*.json")
            exit(1)
    else:
        # Use the first available results file
        results_file = json_files[0]
        print(f"📁 Using existing results file: {results_file}")
        
        try:
            with open(results_file, 'r') as f:
                results = json.load(f)
        except Exception as e:
            print(f"❌ Error loading results: {e}")
            exit(1)
    
    if 'error' in results:
        print(f"❌ Search error: {results['error']}")
        exit(1)
    
    # Create multi-agent context files
    print(f"🤖 Creating context files for 5 Cerebras agents...")
    print(f"🎯 Topic: {results.get('query', 'Unknown')}")
    print(f"🌐 Total sources: {results.get('successful_scrapes', 0)}")
    print()
    
    try:
        created_files = create_multi_agent_contexts(results)
        
        print(f"✅ Successfully created {len(created_files)} agent context files:")
        for filepath in created_files:
            print(f"   📁 {filepath}")
        
        print(f"\n🚀 Ready to deploy to 5 Cerebras agents!")
        print(f"📋 Each agent will analyze ~{results.get('successful_scrapes', 0) // 5} sources")
        
    except Exception as e:
        print(f"❌ Error creating agent contexts: {e}")
