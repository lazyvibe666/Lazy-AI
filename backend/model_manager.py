import gc
import os
import time
from typing import Iterator, Optional, List, Dict, Any
from llama_cpp import Llama

MODEL_PATHS = {
    "GEMMA 4":  r"C:\AI\Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M.gguf",
    "QWEN 3.8": r"C:\AI\Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-IQ4_XS.gguf"
}

REPEAT_PENALTY     = 1.15
TOP_K = 40
MIN_P = 0.05

class ModelManager:
    def __init__(self):
        self.current_model_name: Optional[str] = None
        self.llm: Optional[Llama] = None
        self.last_activity_time: float = time.time()
        self._generation_count: int = 0

    def load_model(self, model_name: str, n_ctx: int = 8192):
        target_name = model_name.upper()
        if "QWEN" in target_name:
            target_name = "QWEN 3.8"
        else:
            target_name = "GEMMA 4"

        if self.current_model_name == target_name and self.llm is not None:
            return

        if self.llm is not None:
            self.unload_model()

        file_path = MODEL_PATHS[target_name]
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Model not found: {file_path}")

        layers = 28 if target_name == "QWEN 3.8" else 35
        format_override = "chatml" if "QWEN" in target_name.upper() else "gemma"

        self.llm = Llama(
            model_path=file_path,
            n_ctx=max(8192, n_ctx),
            n_gpu_layers=layers,
            n_threads=8,
            n_batch=2048,
            n_ubatch=512,
            flash_attn=True,
            chat_format=format_override,
            verbose=False,
        )
        self.current_model_name = target_name
        self.last_activity_time = time.time()
        self._generation_count = 0
        print(f"[Backend] {target_name} loaded successfully (FlashAttention ON).")

    def unload_model(self):
        if self.llm is not None:
            print(f"[Backend] Offloading {self.current_model_name} from VRAM...")
            del self.llm
            self.llm = None
            self.current_model_name = None
            gc.collect()

    def generate_stream(
        self,
        messages: List[Dict[str, Any]],
        temperature: float = 0.7,
        top_p: float = 0.9,
        max_tokens: int = 4096,
    ) -> Iterator[str]:
        self.last_activity_time = time.time()
        self._generation_count += 1

        if not self.llm:
            raise RuntimeError("No LLM loaded.")

        temperature = max(0.01, min(temperature, 2.0))

        stream = self.llm.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=TOP_K,
            min_p=MIN_P,
            repeat_penalty=REPEAT_PENALTY,
            stream=True,
            stop=["<end_of_turn>", "<|end_of_turn|>", "<eos>", "<|im_end|>", "USER:", "user hi", "<start_of_turn>user"],
        )

        tokens_generated = 0
        for output in stream:
            delta = output["choices"][0].get("delta", {})
            if "content" in delta and delta["content"]:
                token = delta["content"]
                yield token
                tokens_generated += 1

            finish_reason = output["choices"][0].get("finish_reason")
            if finish_reason in ("stop", "length", "eos"):
                break

        print(f"[Backend] Generation complete. Tokens: {tokens_generated} | Model: {self.current_model_name}")

model_manager = ModelManager()
