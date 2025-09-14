#!/usr/bin/env python3

import json
import os
from dotenv import load_dotenv
from typing import Dict, List

# Load environment variables
load_dotenv()

try:
    from exa_py import Exa
    EXA_AVAILABLE = True
except ImportError:
    EXA_AVAILABLE = False
    print("⚠️ Exa not available. Install with: pip install exa_py")


def search_and_get_content(query: str, num_results: int = 10) -> Dict:
    """
    Search using Exa API and get content from results
    """
    print(f"🔍 Starting Exa search for: '{query}'")
    
    if not EXA_AVAILABLE:
        print("❌ Exa not available")
        return {"error": "Exa not available"}
    
    try:
        exa_api_key = os.getenv('EXA_KEY')
        if not exa_api_key:
            print("❌ EXA_KEY not found in environment variables")
            return {"error": "EXA_KEY not found"}
        
        exa = Exa(api_key=exa_api_key)
        
        # Search and get content in one call
        print(f"🔍 Searching for {num_results} results with content...")
        search_results = exa.search_and_contents(
            query=query,
            num_results=num_results,
            text=True,
            type="auto"
        )
        
        if not search_results.results:
            print("❌ No search results found")
            return {"error": "No search results found"}
        
        print(f"✅ Found {len(search_results.results)} search results with content")
        
        # Format results to match expected structure
        scraped_content = []
        successful_scrapes = 0
        
        for i, result in enumerate(search_results.results, 1):
            # Get content from the result
            content_text = getattr(result, 'text', '') or ''
            
            if content_text:
                successful_scrapes += 1
                status = 'success'
                # Create highlighted context from content
                content_preview = content_text[:500] + '...' if len(content_text) > 500 else content_text
                matches = [{
                    'highlighted_context': [content_preview]
                }]
                total_matches = 1
            else:
                status = 'error'
                matches = []
                total_matches = 0
            
            scraped_content.append({
                'url': result.url,
                'title': result.title or f'Search Result {i}',
                'status': status,
                'total_matches': total_matches,
                'matches': matches,
                'search_rank': i,
                'content': content_text
            })
        
        print(f"✅ Successfully retrieved content from {successful_scrapes}/{len(search_results.results)} sources")
        
        return {
            'query': query,
            'scraped_content': scraped_content,
            'successful_scrapes': successful_scrapes,
            'method': 'exa_search_content'
        }
        
    except Exception as e:
        print(f"❌ Exa search error: {e}")
        return {"error": f"Exa search failed: {str(e)}"}


def deep_research_with_mcp(query: str) -> Dict:
    """
    Main research function using Exa API
    """
    return search_and_get_content(query, num_results=10)

def print_deep_research_results(results: Dict):
    """
    Print research results in a readable format
    
    Args:
        results: Results from deep_research_with_mcp function
    """
    print(f"\n🎯 Research Query: '{results.get('query', 'Unknown')}'")
    
    if 'error' in results:
        print(f"❌ Error: {results['error']}")
        return
    
    scraped_content = results.get('scraped_content', [])
    if scraped_content:
        successful = results.get('successful_scrapes', 0)
        print(f"\n✅ Successfully processed {successful}/{len(scraped_content)} sources")
        print(f"📈 Success rate: {successful}/{len(scraped_content)} sources")
        
        print(f"\n🔗 Top Sources:")
        for i, source in enumerate(scraped_content[:5], 1):
            print(f"\n{i}. {source.get('title', 'No title')}")
            print(f"   URL: {source.get('url', 'No URL')}")
            print(f"   Status: {source.get('status', 'unknown')}")
            
            if source.get('content'):
                content = source['content']
                preview = content[:200] + '...' if len(content) > 200 else content
                print(f"   Preview: {preview}")
    else:
        print("\n❌ No content retrieved")

def search_web(query: str, num_results: int = 10) -> List[Dict]:
    """
    Web search using Exa API with full content
    """
    if not EXA_AVAILABLE:
        return []
    
    try:
        exa_api_key = os.getenv('EXA_KEY')
        if not exa_api_key:
            return []
        
        exa = Exa(api_key=exa_api_key)
        
        results = exa.search_and_contents(
            query=query,
            num_results=num_results,
            text=True,
            type="auto"
        )
        
        formatted_results = []
        for i, result in enumerate(results.results, 1):
            content_text = getattr(result, 'text', '') or ''
            formatted_results.append({
                'rank': i,
                'url': result.url,
                'title': result.title or 'No title',
                'snippet': content_text[:200] + '...' if len(content_text) > 200 else content_text,
                'content': content_text
            })
        
        return formatted_results
        
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []

