from sqlmodel import Field, Session, SQLModel, create_engine
from typing import Optional
from datetime import datetime

sqlite_file_name = "lazy_ai.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, echo=False)

class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    model_used: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: int = Field(foreign_key="chatsession.id")
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    action: str
    details: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MemoryEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chat_id: int = Field(foreign_key="chatsession.id")
    entity_type: str  # e.g., "URL", "IP", "Filepath", "Target"
    entity_value: str
    context: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)