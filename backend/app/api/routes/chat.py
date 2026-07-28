import os
from dotenv import load_dotenv
load_dotenv()
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Any, Optional
import asyncio
from groq import Groq
from app.core.settings import settings

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[Any] = []
    image: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = """You are KrishiCore AI, a friendly and expert agricultural assistant for Indian farmers.

LANGUAGE RULE:
- Always reply in the SAME language the user writes in.
- If user writes in Hindi, reply in Hindi.
- If user writes in English, reply in English (Pure English, no Hinglish).
- If user writes in Hinglish (mixed Hindi-English), reply in Hinglish.
- If user writes in any regional language (Tamil, Telugu, Marathi, Punjabi etc.), reply in that language.

VOICE RULE:
- Your replies will be read aloud to farmers, so write in a conversational, natural tone.
- Avoid bullet points, markdown, or symbols like *, #, or -.
- Use short simple sentences that sound natural when spoken.
- Keep every reply under 60 words.

EXPERTISE:
- Crop selection based on soil, season, and location
- Plant disease identification and treatment
- Soil health, pH, and nutrient management
- Fertilizer recommendations (organic and chemical)
- Irrigation scheduling and water management
- Pest control and prevention
- Weather-based farming advice"""

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    api_key = settings.groq_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in settings")

    for attempt in range(2):
        try:
            client = Groq(api_key=api_key)

            messages = []
            extra_params = {}
            
            # Use vision model if image is present
            if request.image:
                model = "qwen/qwen3.6-27b" 
                messages.append({
                    "role": "system",
                    "content": "You are a helpful agricultural assistant that always outputs responses in raw JSON format as requested."
                })
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": request.message},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{request.image}",
                            },
                        },
                    ],
                })
                extra_params["response_format"] = {"type": "json_object"}
                extra_params["reasoning_format"] = "hidden"
            else:
                model = "llama-3.3-70b-versatile"
                messages.append({"role": "system", "content": SYSTEM_PROMPT})
                for msg in request.history:
                    if isinstance(msg, dict) and "role" in msg and "content" in msg:
                        messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": request.message})

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=2048 if request.image else 300,
                temperature=0.0,
                **extra_params
            )
            reply = response.choices[0].message.content
            if reply:
                import re
                # Try to extract valid JSON directly first for JSON assistant outputs
                if request.image or (extra_params.get("response_format") and extra_params["response_format"].get("type") == "json_object"):
                    json_match = re.search(r'\{[\s\S]*\}', reply)
                    if json_match:
                        try:
                            json.loads(json_match.group(0))
                            reply = json_match.group(0)
                        except Exception:
                            pass
                
                if reply and not (reply.startswith("{") and reply.endswith("}")):
                    # Strip <think>...</think> block if present (common in reasoning models like Qwen)
                    reply = re.sub(r'<think>.*?</think>', '', reply, flags=re.DOTALL)
                    reply = re.sub(r'<think>.*', '', reply, flags=re.DOTALL).strip()
            return ChatResponse(reply=reply)

        except Exception as e:
            error_str = str(e)
            is_rate_limit = "rate_limit_exceeded" in error_str.lower() or "429" in error_str
            
            if is_rate_limit and attempt == 0:
                await asyncio.sleep(2)
                continue
                
            if is_rate_limit:
                raise HTTPException(status_code=429, detail="AI Rate Limit Reached. Please try again in a few minutes.")
            raise HTTPException(status_code=500, detail=error_str)

@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest):
    api_key = settings.groq_api_key
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in settings")

    try:
        client = Groq(api_key=api_key)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in request.history:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": request.message})

        def generate():
            try:
                stream = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    max_tokens=300,
                    stream=True
                )
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))