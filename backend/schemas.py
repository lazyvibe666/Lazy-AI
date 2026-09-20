from pydantic import BaseModel
from typing import List, Optional, Union, Dict, Any

class ChatAttachment(BaseModel):
    name: str
    type: str
    url: Optional[str] = None
    textContext: str

class Message(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]
    attachments: Optional[List[ChatAttachment]] = None

class ChatCompletionRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = "GEMMA 4"
    system_prompt: Optional[str] = ""
    deep_search: bool = False
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 4096
    stream: bool = True

class LoadModelRequest(BaseModel):
    model: str