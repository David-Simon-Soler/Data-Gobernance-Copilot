from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


app = FastAPI(title="Data Governance Copilot API", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
