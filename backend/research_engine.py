import httpx
import traceback
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from typing import List, Dict

class ResearchEngine:
    def search_web(self, query: str, max_results: int = 3) -> List[Dict[str, str]]:
        """Searches DuckDuckGo and returns URLs."""
        results = []
        try:
            with DDGS() as ddgs:
                for attempt in range(3):
                    ddgs_gen = ddgs.text(query, max_results=max_results)
                    if not ddgs_gen:
                        import time
                        time.sleep(1.5)
                        continue
                    
                    for r in ddgs_gen:
                        results.append({
                            "title": r.get('title', 'DuckDuckGo Result'),
                            "url": r.get('href', ''),
                            "snippet": r.get('body', 'Navigating to URL...')
                        })
                    
                    if results:
                        break
                        
                if not results:
                    print("[Research Engine] DDGS failed to return results after 3 attempts.")
        except Exception as e:
            print(f"[ERROR TRACE]:\n{traceback.format_exc()}")
            return [{"title": "Search Failed", "url": "error", "snippet": f"System Error: {type(e).__name__} - {str(e)}"}]
        return results

    async def scrape_page(self, url: str) -> str:
        """Fetches page content and extracts text."""
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                        script.extract()
                    text = soup.get_text(separator=' ', strip=True)
                    text = ' '.join(text.split())
                    return text[:1500]  # Limit to 1500 chars per page
        except Exception as e:
            print(f"[ERROR TRACE]:\n{traceback.format_exc()}")
            return f"System Error: {type(e).__name__} - {str(e)}"
        return ""

research_engine = ResearchEngine()