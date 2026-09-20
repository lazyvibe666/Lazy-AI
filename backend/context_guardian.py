import re
from database import engine, MemoryEntity
from sqlmodel import Session

class ContextGuardian:
    def __init__(self):
        # Enterprise data indicators
        self.patterns = {
            "IPv4_Address": r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
            "Email_Address": r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
            "URL_Endpoint": r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+',
            "System_Path": r'(?:/[a-zA-Z0-9_.-]+)+/[a-zA-Z0-9_.-]+'
        }
        self.ignore_list = {"127.0.0.1", "0.0.0.0", "255.255.255.255", "/bin/sh", "/usr/bin"}

    def extract_and_store(self, chat_id: str, raw_text: str) -> str:
        """Scans output, stores entities to SQL, returns a summary string."""
        if not raw_text:
            return ""
            
        found_entities = {}
        with Session(engine) as session:
            for entity_type, pattern in self.patterns.items():
                matches = set(re.findall(pattern, raw_text))
                valid_matches = [m for m in matches if m not in self.ignore_list and len(m) > 4]
                
                for match in valid_matches:
                    try:
                        # Store in the MemoryEntity table
                        entity = MemoryEntity(
                            chat_id=int(chat_id) if str(chat_id).isdigit() else 0, # Fallback if UUID
                            entity_type=entity_type,
                            entity_value=match,
                            context=raw_text[:150]
                        )
                        session.add(entity)
                        if entity_type not in found_entities:
                            found_entities[entity_type] = []
                        found_entities[entity_type].append(match)
                    except Exception:
                        pass
            try:
                session.commit()
            except Exception:
                session.rollback()
                
        if not found_entities:
            return ""
            
        summary = "\n[Context Guardian extracted to Memory]: "
        for k, v in found_entities.items():
            summary += f"{len(v)} {k}(s), "
        return summary.strip(", ")

context_guardian = ContextGuardian()
