import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import queue
import re
import traceback
import fitz
import pytesseract
from PIL import Image
import io
import json
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from fastapi import Form
from fastapi.responses import Response
from pydantic import BaseModel

from database import create_db_and_tables
from schemas import ChatCompletionRequest, LoadModelRequest
from model_manager import model_manager
from browser_agent import browser_agent
from rag_engine import rag_engine
from context_guardian import context_guardian

MODEL_LOCK        = asyncio.Lock()
GENERATION_LOCK   = asyncio.Lock()
IS_LOADING_MODEL  = False

async def inactivity_monitor():
    import time
    while True:
        await asyncio.sleep(60)
        async with MODEL_LOCK:
            if model_manager.llm is not None and not IS_LOADING_MODEL:
                if time.time() - model_manager.last_activity_time > 300:
                    print("[Inactivity] Unloading model to free VRAM...")
                    model_manager.unload_model()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    asyncio.create_task(inactivity_monitor())
    try:
        global IS_LOADING_MODEL
        IS_LOADING_MODEL = True
        model_manager.load_model("GEMMA 4")
    except Exception as e:
        print(f"[Startup Warning] Model load error: {e}")
    finally:
        IS_LOADING_MODEL = False
    yield
    print("[Shutdown] Shutting down Browser Agent...")
    browser_agent.shutdown()

app = FastAPI(title="Lazy AI Master Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def build_messages(req: ChatCompletionRequest):
    messages = []
    
    agent_info = ""
    if req.deep_search:
        agent_info += "\n[MODE: DEEP SEARCH AGENT]\nYou can use browser tools. Output format MUST be:\n<action>\n{\n  \"action\": \"search\" | \"goto\" | \"click\" | \"type\" | \"extract_all\" | \"done\",\n  \"args\": {...}\n}\n</action>\nWait for user to provide action result."

    sys_prompt = f"{req.system_prompt}\n{agent_info}".strip()
    
    messages.append({"role": "system", "content": sys_prompt})

    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    return messages

async def _do_load(model_name: str):
    global IS_LOADING_MODEL
    try:
        IS_LOADING_MODEL = True
        await asyncio.to_thread(model_manager.load_model, model_name)
    finally:
        IS_LOADING_MODEL = False

@app.post("/v1/model/load")
async def load_model(req: LoadModelRequest):
    if IS_LOADING_MODEL:
        return {"status": "loading", "message": "Already loading a model"}
    asyncio.create_task(_do_load(req.model))
    return {"status": "loading", "model": req.model}

@app.get("/v1/model/status")
async def get_model_status():
    if IS_LOADING_MODEL:
        return {"status": "loading", "model": "loading"}
    if model_manager.llm:
        return {"status": "loaded", "model": model_manager.current_model_name}
    return {"status": "unloaded"}

@app.post("/v1/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        extracted_text = ""

        if file.filename.lower().endswith('.pdf'):
            doc = fitz.open(stream=contents, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text()
            
            await asyncio.to_thread(rag_engine.add_document, file.filename, extracted_text)

        elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            img = Image.open(io.BytesIO(contents))
            extracted_text = pytesseract.image_to_string(img)
            await asyncio.to_thread(rag_engine.add_document, file.filename, extracted_text)
            
        else:
            extracted_text = contents.decode('utf-8', errors='ignore')
            await asyncio.to_thread(rag_engine.add_document, file.filename, extracted_text)

        return {"status": "success", "text": extracted_text[:1500] + "..." if len(extracted_text) > 1500 else extracted_text}
    except Exception as e:
        return {"status": "error", "error": str(e)}

def parse_and_yield_stream(stream):
    buffer = ""
    in_thought = False
    
    think_starts = [re.compile(r"<think>", re.IGNORECASE), re.compile(r"<thought>", re.IGNORECASE), re.compile(r"<\|think\|>", re.IGNORECASE)]
    think_ends = [re.compile(r"</think>", re.IGNORECASE), re.compile(r"</thought>", re.IGNORECASE), re.compile(r"</\|think\|>", re.IGNORECASE)]
    
    for chunk in stream:
        buffer += chunk
        matched = True
        
        while matched:
            matched = False
            
            if not in_thought:
                for pattern in think_starts:
                    m = pattern.search(buffer)
                    if m:
                        if m.start() > 0:
                            yield {"type": "content", "delta": buffer[:m.start()]}
                        in_thought = True
                        buffer = buffer[m.end():]
                        matched = True
                        break
            else:
                for pattern in think_ends:
                    m = pattern.search(buffer)
                    if m:
                        if m.start() > 0:
                            yield {"type": "thought", "delta": buffer[:m.start()]}
                        in_thought = False
                        buffer = buffer[m.end():]
                        matched = True
                        break
                        
            if not matched and len(buffer) > 20: # Keep small buffer for tag matching
                flush_len = len(buffer) - 20
                if in_thought:
                    yield {"type": "thought", "delta": buffer[:flush_len]}
                else:
                    yield {"type": "content", "delta": buffer[:flush_len]}
                buffer = buffer[flush_len:]
                
    if buffer:
        if in_thought:
            yield {"type": "thought", "delta": buffer}
        else:
            yield {"type": "content", "delta": buffer}

@app.post("/v1/chat/completions")
async def chat_completions(req: Request):
    try:
        body = await req.json()
        chat_req = ChatCompletionRequest(**body)
    except Exception as e:
        return Response(status_code=400, content=f"Invalid request: {e}")

    async def event_generator():
        try:
            if not model_manager.llm or model_manager.current_model_name != chat_req.model:
                yield f"data: {json.dumps({'type': 'status', 'status': 'loading_model'})}\n\n"
                global IS_LOADING_MODEL
                IS_LOADING_MODEL = True
                try:
                    await asyncio.to_thread(model_manager.load_model, chat_req.model)
                finally:
                    IS_LOADING_MODEL = False
            
            yield f"data: {json.dumps({'type': 'status', 'status': 'thinking'})}\n\n"

            async with GENERATION_LOCK:
                history = build_messages(chat_req)

                if chat_req.deep_search:
                    max_agent_steps = 5
                    step = 0
                    while step < max_agent_steps:
                        stream = await asyncio.to_thread(
                            model_manager.generate_stream,
                            history,
                            chat_req.temperature,
                            0.9,
                            1024
                        )
                        
                        full_response = ""
                        for event in parse_and_yield_stream(stream):
                            full_response += event["delta"]
                            yield f"data: {json.dumps(event)}\n\n"
                            await asyncio.sleep(0)

                        action_match = re.search(r'<action>(.*?)</action>', full_response, re.DOTALL | re.IGNORECASE)
                        if action_match:
                            try:
                                action_data = json.loads(action_match.group(1))
                                if action_data.get("action") == "done":
                                    break
                                
                                action_name = action_data.get('action')
                                yield f"data: {json.dumps({'type': 'status', 'status': f'Executing {action_name}...'})}\n\n"
                                result = await asyncio.to_thread(browser_agent.execute_action, action_data)
                                history.append({"role": "assistant", "content": full_response})
                                history.append({"role": "user", "content": f"[Action Result]:\n{result}\nWhat next?"})
                                step += 1
                                yield f"data: {json.dumps({'type': 'status', 'status': 'thinking'})}\n\n"
                            except Exception as e:
                                history.append({"role": "assistant", "content": full_response})
                                history.append({"role": "user", "content": f"Action parse error: {str(e)}"})
                                step += 1
                        else:
                            break
                            
                else:
                    stream = await asyncio.to_thread(
                        model_manager.generate_stream,
                        history,
                        chat_req.temperature,
                        0.9,
                        4096
                    )

                    for event in parse_and_yield_stream(stream):
                        yield f"data: {json.dumps(event)}\n\n"
                        await asyncio.sleep(0)

        except Exception as e:
            traceback.print_exc()
            error_msg = f'\n\n[Backend Error]: {str(e)}'
            yield f"data: {json.dumps({'type': 'content', 'delta': error_msg})}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
