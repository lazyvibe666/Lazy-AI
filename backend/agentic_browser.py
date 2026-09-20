import requests
from bs4 import BeautifulSoup
from googlesearch import search
import concurrent.futures

def fetch_and_scrape(url, max_chars=1500):
    """Fetches a URL and extracts readable text."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
            script.extract()
            
        text = soup.get_text(separator=' ', strip=True)
        # Clean up whitespace
        text = ' '.join(text.split())
        return f"Source: {url}\nContent: {text[:max_chars]}...\n"
    except Exception as e:
        return f"Source: {url}\nContent: Failed to fetch ({str(e)})\n"

def search_web(query, num_results=3, max_chars_per_page=1500):
    """
    Performs a Google search for the query, scrapes the top results concurrently,
    and returns a combined context string.
    """
    print(f"[Agentic Browser] Searching the web for: '{query}'")
    context_blocks = []
    
    try:
        # Perform Google Search
        urls = list(search(query, num=num_results, stop=num_results, pause=2.0))
        if not urls:
            return "No web results found."
            
        print(f"[Agentic Browser] Found {len(urls)} URLs. Scraping...")
        
        # Concurrently fetch and scrape the URLs
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_results) as executor:
            future_to_url = {executor.submit(fetch_and_scrape, url, max_chars_per_page): url for url in urls}
            for future in concurrent.futures.as_completed(future_to_url):
                try:
                    result = future.result()
                    context_blocks.append(result)
                except Exception as exc:
                    pass
                    
        print(f"[Agentic Browser] Scraping complete.")
        
    except Exception as e:
        print(f"[Agentic Browser] Search failed: {e}")
        return f"Web Search Failed: {e}"
        
    return "\n---\n".join(context_blocks)
