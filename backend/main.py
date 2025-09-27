# main.py
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer
from jose import jwt
from pydantic import BaseModel
from dotenv import load_dotenv
import os, requests

# Load environment variables
load_dotenv()
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
API_AUDIENCE = os.getenv("API_AUDIENCE")
ALGORITHMS = [os.getenv("ALGORITHMS", "RS256")]

app = FastAPI(title="Campus Navigation API", version="1.0.0")

# HTTP Bearer Security
security = HTTPBearer()

# === Fetch JWKS keys once ===
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
jwks = requests.get(JWKS_URL).json()

def verify_jwt(token: str = Security(security)):
    try:
        # Get unverified header
        unverified_header = jwt.get_unverified_header(token.credentials)

        # Find public key that matches the kid
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
        if not rsa_key:
            raise HTTPException(status_code=401, detail="Public key not found.")

        # Decode token
        payload = jwt.decode(
            token.credentials,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=API_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ==== Data Model ====
class RouteRequest(BaseModel):
    start: str
    destination: str

# ==== Routes ====
@app.get("/")
def read_root():
    return {"message": "Welcome to the Campus Navigation API 🚀"}

@app.post("/route")
def get_route(data: RouteRequest, user=Depends(verify_jwt)):
    """
    This endpoint now requires a valid Auth0 Access Token.
    """
    return {
        "start": data.start,
        "destination": data.destination,
        "estimated_time": "7 minutes",
        "path": [
            {"lat": 39.9812, "lng": -75.1550},
            {"lat": 39.9815, "lng": -75.1520}
        ],
        "user": user  # Returns decoded token payload for debugging
    }
