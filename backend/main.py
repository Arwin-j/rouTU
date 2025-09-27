# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Campus Navigation API", version="1.0.0")

# Data model for request body
class RouteRequest(BaseModel):
    start: str
    destination: str

# Root route
@app.get("/")
def read_root():
    return {"message": "Welcome to the Campus Navigation API 🚀"}

# Sample route endpoint
@app.post("/route")
def get_route(data: RouteRequest):
    # In real app, you'd calculate shortest path here
    return {
        "start": data.start,
        "destination": data.destination,
        "estimated_time": "7 minutes",
        "path": [
            {"lat": 39.9812, "lng": -75.1550},  # Sample coordinates
            {"lat": 39.9815, "lng": -75.1520}
        ]
    }
