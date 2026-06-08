from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.generate import router as generate_router

app = FastAPI(
    title="AI Mind-Map Generator API",
    description="Stateless AI service that turns a question into a Markdown mind map",
    version="1.0.0",
)

# CORS — allow the frontend dev server and known deployed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://localhost:3000",
        "https://localhost:5173",
        "https://livedocdemo.seismic.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)


@app.get("/health", summary="Health check")
def health():
    return {"status": "healthy"}
