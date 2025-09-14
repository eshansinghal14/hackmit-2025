#!/usr/bin/env python3
"""
Cerebras Roadmap Generator Test Script
Tests the complete 6-agent system for knowledge extraction and roadmap generation
"""

import os
import sys
import time
import json
from typing import Dict, List, Optional

# Import the modules we're testing
from research import search_and_get_content
from llm_formatter import create_multi_agent_contexts, split_results_into_chunks
from cerebras_roadmap_generator import (
    call_cerebras_api, 
    run_multi_agent_cerebras, 
    run_final_consolidation_agent
)

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"🧪 {title}")
    print("=" * 60)

def print_step(step: str, status: str = ""):
    """Print a test step"""
    if status == "success":
        print(f"✅ {step}")
    elif status == "error":
        print(f"❌ {step}")
    elif status == "warning":
        print(f"⚠️ {step}")
    else:
        print(f"🔄 {step}")

def test_environment():
    """Test if environment is properly set up"""
    print_header("Environment Setup Test")
    
    # Check CEREBRAS_KEY
    cerebras_key = os.getenv('CEREBRAS_KEY')
    if cerebras_key:
        print_step("CEREBRAS_KEY environment variable is set", "success")
    else:
        print_step("CEREBRAS_KEY environment variable is missing", "error")
        return False
    
    # Check required directories
    os.makedirs("agent_contexts", exist_ok=True)
    os.makedirs("node_outputs", exist_ok=True)
    print_step("Required directories created", "success")
    
    return True

def test_basic_cerebras_api():
    """Test basic Cerebras API connectivity"""
    print_header("Basic Cerebras API Test")
    
    try:
        print_step("Testing basic API call...")
        response = call_cerebras_api("Respond with exactly: API_TEST_SUCCESS")
        
        if "API_TEST_SUCCESS" in response:
            print_step("Cerebras API is working correctly", "success")
            print(f"   Response: {response[:100]}...")
            return True
        else:
            print_step("Cerebras API response unexpected", "warning")
            print(f"   Response: {response[:100]}...")
            return False
            
    except Exception as e:
        print_step(f"Cerebras API test failed: {e}", "error")
        return False

def test_research_system(topic: str = "linear_algebra", num_sources: int = 10):
    """Test the Exa research system"""
    print_header(f"Research System Test - Topic: {topic}")
    
    try:
        print_step(f"Searching for {num_sources} sources on '{topic}'...")
        results = search_and_get_content(topic, num_sources)
        
        if 'error' in results:
            print_step(f"Research failed: {results['error']}", "error")
            return None
        
        scraped_content = results.get('scraped_content', [])
        successful_scrapes = len([r for r in scraped_content if r.get('status') == 'success'])
        
        print_step(f"Found {successful_scrapes} successful sources out of {len(scraped_content)} total", "success")
        
        if successful_scrapes >= 5:
            print_step("Research system working well", "success")
            return results
        else:
            print_step("Research system working but with limited results", "warning")
            return results
            
    except Exception as e:
        print_step(f"Research system test failed: {e}", "error")
        return None

def test_context_generation(results: Dict, topic: str):
    """Test agent context generation"""
    print_header("Agent Context Generation Test")
    
    try:
        print_step("Creating multi-agent contexts...")
        context_files = create_multi_agent_contexts(results, topic)
        
        if len(context_files) == 5:
            print_step("Created 5 agent context files", "success")
            
            # Check file sizes
            for i, file_path in enumerate(context_files, 1):
                if os.path.exists(file_path):
                    file_size = os.path.getsize(file_path)
                    print_step(f"Agent {i} context: {file_size:,} bytes", "success")
                else:
                    print_step(f"Agent {i} context file missing", "error")
                    return False
            
            return True
        else:
            print_step(f"Expected 5 context files, got {len(context_files)}", "error")
            return False
            
    except Exception as e:
        print_step(f"Context generation test failed: {e}", "error")
        return False

def test_multi_agent_system():
    """Test the multi-agent Cerebras system"""
    print_header("Multi-Agent Cerebras System Test")
    
    try:
        print_step("Running 5 Cerebras agents in parallel...")
        start_time = time.time()
        
        result = run_multi_agent_cerebras()
        
        if result:
            roadmap, output_file, agent_outputs = result
            duration = time.time() - start_time
            
            print_step(f"Multi-agent system completed in {duration:.1f} seconds", "success")
            print_step(f"Generated roadmap: {len(roadmap):,} characters", "success")
            print_step(f"Output file: {output_file}", "success")
            
            # Check individual agent outputs
            successful_agents = len([o for o in agent_outputs if o and not o.startswith('Agent') and 'failed' not in o])
            print_step(f"Successful agents: {successful_agents}/5", "success" if successful_agents == 5 else "warning")
            
            return roadmap, output_file, agent_outputs
        else:
            print_step("Multi-agent system failed", "error")
            return None
            
    except Exception as e:
        print_step(f"Multi-agent system test failed: {e}", "error")
        return None

def test_final_consolidation(agent_outputs: List[str], topic: str):
    """Test the final consolidation agent"""
    print_header("Final Consolidation Agent Test")
    
    try:
        print_step("Running final consolidation agent...")
        final_result = run_final_consolidation_agent(agent_outputs, topic)
        
        if final_result:
            final_output, final_file = final_result
            print_step(f"Consolidation completed: {final_file}", "success")
            
            # Try to parse as JSON (strip markdown code blocks if present)
            try:
                clean_output = final_output.strip()
                if clean_output.startswith('```json'):
                    clean_output = clean_output.replace('```json', '').replace('```', '').strip()
                json_data = json.loads(clean_output)
                
                # Handle new array format: [combined_dict, questions_array]
                if isinstance(json_data, list) and len(json_data) == 2:
                    combined_dict, questions = json_data
                    
                    # Extract lesson names from the combined format
                    if isinstance(list(combined_dict.values())[0], dict):
                        # New combined format: {"1": {"name": "Lesson Name", "weight": 1, "prerequisites": [...]}}
                        lessons = [lesson_obj["name"] for lesson_obj in combined_dict.values()]
                        print_step("Using new combined format with name, weight, and prerequisites", "success")
                    else:
                        # Old format: {"1": "Lesson Name"}
                        lessons = list(combined_dict.values())
                        print_step("Using legacy format", "warning")
                    
                    print_step(f"Generated {len(lessons)} curated lessons", "success")
                    print_step(f"Combined graph with {len(combined_dict)} nodes", "success")
                    print_step(f"Generated {len(questions)} diagnostic questions", "success")
                    
                    # Show first few lessons
                    print("\n📚 Sample Lessons:")
                    for i, lesson in enumerate(lessons[:3], 1):
                        print(f"   {i}. {lesson}")
                    if len(lessons) > 3:
                        print(f"   ... and {len(lessons) - 3} more")
                    
                    # Show sample questions
                    print("\n❓ Sample Questions:")
                    for i, question in enumerate(questions[:2], 1):
                        print(f"   {i}. {question}")
                    if len(questions) > 2:
                        print(f"   ... and {len(questions) - 2} more")
                elif isinstance(json_data, list) and len(json_data) == 3:
                    # Legacy 3-element format
                    lessons_dict, adjacency_dict, questions = json_data
                    
                    # Extract lesson names from the old format
                    if isinstance(list(lessons_dict.values())[0], dict):
                        lessons = [lesson_obj["name"] for lesson_obj in lessons_dict.values()]
                    else:
                        lessons = list(lessons_dict.values())
                    
                    print_step(f"Generated {len(lessons)} curated lessons", "success")
                    print_step(f"Created adjacency graph with {len(adjacency_dict)} nodes", "success")
                    print_step(f"Generated {len(questions)} diagnostic questions", "success")
                    print_step("Using legacy 3-element format", "warning")
                    
                    # Show first few lessons
                    print("\n📚 Sample Lessons:")
                    for i, lesson in enumerate(lessons[:3], 1):
                        print(f"   {i}. {lesson}")
                    if len(lessons) > 3:
                        print(f"   ... and {len(lessons) - 3} more")
                    
                    # Show sample questions
                    print("\n❓ Sample Questions:")
                    for i, question in enumerate(questions[:2], 1):
                        print(f"   {i}. {question}")
                    if len(questions) > 2:
                        print(f"   ... and {len(questions) - 2} more")
                else:
                    # Fallback for old format
                    lessons = json_data.get('lessons', [])
                    print_step(f"Generated {len(lessons)} curated lessons", "success")
                    print_step(f"Topic: {json_data.get('topic', 'Unknown')}", "success")
                
                return True
            except json.JSONDecodeError:
                print_step("Final output is not valid JSON", "warning")
                print(f"   Output preview: {final_output[:200]}...")
                return False
        else:
            print_step("Final consolidation failed", "error")
            return False
            
    except Exception as e:
        print_step(f"Final consolidation test failed: {e}", "error")
        return False

def run_complete_test(topic: str = "linear_algebra", num_sources: int = 15):
    """Run the complete end-to-end test"""
    print_header(f"COMPLETE END-TO-END TEST: {topic.upper()}")
    
    start_time = time.time()
    
    # Step 1: Environment
    if not test_environment():
        print_step("Environment test failed - aborting", "error")
        return False
    
    # Step 2: Basic API
    if not test_basic_cerebras_api():
        print_step("Basic API test failed - aborting", "error")
        return False
    
    # Step 3: Research
    results = test_research_system(topic, num_sources)
    if not results:
        print_step("Research test failed - aborting", "error")
        return False
    
    # Step 4: Context Generation
    if not test_context_generation(results, topic):
        print_step("Context generation test failed - aborting", "error")
        return False
    
    # Step 5: Multi-Agent System
    multi_result = test_multi_agent_system()
    if not multi_result:
        print_step("Multi-agent test failed - aborting", "error")
        return False
    
    roadmap, output_file, agent_outputs = multi_result
    
    # Step 6: Final Consolidation
    if not test_final_consolidation(agent_outputs, topic):
        print_step("Final consolidation test failed", "error")
        return False
    
    # Success!
    total_time = time.time() - start_time
    print_header("🎉 COMPLETE TEST SUCCESS!")
    print(f"✅ Total execution time: {total_time:.1f} seconds")
    print(f"✅ Topic: {topic}")
    print(f"✅ Sources researched: {num_sources}")
    print(f"✅ Roadmap file: {output_file}")
    print(f"✅ JSON file: node_outputs/final_consolidated_nodes_{topic}.json")
    
    return True

def run_quick_test():
    """Run a quick test with minimal sources"""
    print_header("QUICK TEST MODE")
    return run_complete_test("basic_calculus", 8)

def run_full_test():
    """Run a comprehensive test"""
    print_header("FULL TEST MODE")
    return run_complete_test("machine_learning_fundamentals", 25)

if __name__ == "__main__":
    print("🚀 Cerebras Roadmap Generator Test Suite")
    print("Choose test mode:")
    print("1. Quick Test (8 sources, basic_calculus)")
    print("2. Full Test (25 sources, machine_learning_fundamentals)")
    print("3. Custom Test")
    print("4. Environment Check Only")
    
    try:
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            success = run_quick_test()
        elif choice == "2":
            success = run_full_test()
        elif choice == "3":
            topic = input("Enter topic: ").strip().replace(" ", "_")
            num_sources = int(input("Enter number of sources (5-50): "))
            success = run_complete_test(topic, num_sources)
        elif choice == "4":
            success = test_environment()
        else:
            print("Invalid choice")
            sys.exit(1)
        
        if success:
            print("\n🎉 All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n👋 Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite error: {e}")
        sys.exit(1)
