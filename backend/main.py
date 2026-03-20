from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import load_config
from backend.routers import projects, prompts, ai, settings, search, export

app = FastAPI(title="Super Prompt API")
app.include_router(projects.router)
app.include_router(prompts.router)
app.include_router(ai.router)
app.include_router(settings.router)
app.include_router(search.router)
app.include_router(export.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    load_config()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
