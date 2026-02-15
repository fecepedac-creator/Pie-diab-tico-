from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import json
import os
import jwt
import uuid
from datetime import datetime, timedelta

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
JWT_SECRET = os.environ.get("JWT_SECRET", "change_me_dev_secret")
DATA_FILE = "/app/backend/data.json"

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "Médico Diabetología"

class StateData(BaseModel):
    patients: List[Any] = []
    episodes: List[Any] = []
    visits: List[Any] = []
    referrals: List[Any] = []

# Helpers
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"users": [], "appState": {"patients": [], "episodes": [], "visits": [], "referrals": []}}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def create_token(user_id: str, email: str, role: str):
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token requerido")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Token inválido")

# Routes
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pie-diabetico-api"}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    data = load_data()
    
    # Check if user exists
    for user in data.get("users", []):
        if user["email"] == req.email:
            raise HTTPException(status_code=400, detail="Usuario ya existe")
    
    # Create user
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": req.email,
        "password": req.password,
        "role": req.role
    }
    
    if "users" not in data:
        data["users"] = []
    data["users"].append(new_user)
    save_data(data)
    
    return {"ok": True}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    data = load_data()
    
    for user in data.get("users", []):
        if user["email"] == req.email and user["password"] == req.password:
            token = create_token(user["id"], user["email"], user["role"])
            return {
                "token": token,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "role": user["role"]
                }
            }
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@app.get("/api/state")
def get_state(payload: dict = Depends(verify_token)):
    data = load_data()
    return data.get("appState", {"patients": [], "episodes": [], "visits": [], "referrals": []})

@app.post("/api/state")
def save_state(state: StateData, payload: dict = Depends(verify_token)):
    data = load_data()
    data["appState"] = {
        "patients": state.patients,
        "episodes": state.episodes,
        "visits": state.visits,
        "referrals": state.referrals
    }
    save_data(data)
    return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
