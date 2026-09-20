import os
import chromadb
from typing import Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

class LocalRAGEngine:
    def __init__(self, persist_directory: str = "rag_storage"):
        self.persist_directory = persist_directory
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection = self.client.get_or_create_collection(name="document_knowledge_base")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def add_document(self, doc_id: str, text: str, metadata: Dict[str, Any] = None) -> int:
        if not text.strip():
            return 0
        chunks = self.text_splitter.split_text(text)
        if not chunks:
            return 0

        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [metadata or {"source": doc_id} for _ in chunks]

        self.collection.upsert(documents=chunks, ids=ids, metadatas=metadatas)
        return len(chunks)

    def search(self, query: str, top_k: int = 3) -> str:
        try:
            results = self.collection.query(query_texts=[query], n_results=top_k)
            documents = results.get("documents", [[]])[0]
            if not documents:
                return "No relevant context found in local knowledge base."
            
            formatted_chunks = [f"[Document Excerpt {i}]:\n{doc}" for i, doc in enumerate(documents, start=1)]
            return "\n\n".join(formatted_chunks)
        except Exception as e:
            return f"RAG Search Error: {str(e)}"

rag_engine = LocalRAGEngine()
