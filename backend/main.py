from fastapi import FastAPI, UploadFile, File, Form
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 모든 접속 허용 설정 (매우 중요!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
def read_root():
    return {"status": "online", "message": "AI Japanese Backend is running!"}

@app.post("/api/chat/audio")
async def process_audio_chat(
    audio: UploadFile = File(...), 
    jlpt_level: str = Form(...),
    scenario: str = Form(...)
):
    # 1. STT: Whisper로 사용자 오디오를 일본어 텍스트로 변환
    stt_response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(audio.filename, await audio.read()),
        language="ja"
    )
    user_text_ja = stt_response.text

    # 2. LLM: System Prompt와 대화 컨텍스트 전달
    prompt = f"""
    You are an expert Japanese language tutor...
    Level: {jlpt_level}
    Scenario: {scenario}
    (위에서 정의한 프롬프트 전문 삽입)
    """
    
    llmer_response = await client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system", 
                "content": """너는 친절한 일본어 선생님이야. 
                반드시 JSON 형식으로 응답하고, 아래의 키(Key) 명칭을 엄격히 지켜줘:
                {
                    "assistant_reply_jp": "일본어 답변 내용",
                    "assistant_reply_ko": "한국어 번역 내용",
                    "correction": "사용자의 일본어 문법 교정이 필요한 경우의 설명 혹은 교정된 문장 (없으면 빈 문자열)",
                    "tokens": [
                        {"word": "일본어 단어", "reading": "히라가나 독음", "meaning": "한국어 뜻"}
                    ]
                }
                단, tokens 배열에는 assistant_reply_jp 문장을 구성하는 모든 단어들이 순서대로 빠짐없이 포함되어야 해.
                """
            },
            {"role": "user", "content": user_text_ja}
        ]
    )
    
    result = json.loads(llmer_response.choices[0].message.content)

    # 3. TTS: AI의 일본어 답변을 음성으로 변환
    tts_response = await client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=result["assistant_reply_jp"]
    )
    
    timestamp = int(time.time() * 1000)
    audio_filename = f"tts_{timestamp}.mp3"
    audio_filepath = os.path.join("static", audio_filename)
    
    # HTTPX 응답 Content 바이너리 파일로 쓰기 (동기 I/O)
    with open(audio_filepath, "wb") as f:
        f.write(tts_response.content)
        
    # 실제 노출될 URL 경로
    real_audio_url = f"/static/{audio_filename}"
    
    return {
        "user_text_recognized": user_text_ja,
        "assistant_reply_jp": result.get("assistant_reply_jp", ""),
        "assistant_reply_ko": result.get("assistant_reply_ko", ""),
        "correction": result.get("correction", ""),
        "tokens": result.get("tokens", []),
        "audio_url": real_audio_url
    }

# 포트 설정 (Render는 환경 변수 PORT를 사용함)
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
