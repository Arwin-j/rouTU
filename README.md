# College Navigation Application

College navigation application that uses **Google Gemini** to process schedules, voices, and texts to provide users with efficient path planning to get around campus.

---

## Implement the Code

python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

---

## Install Dependencies

pip install -r requirements.txt

---

## Configure Code

1. Run the Application
Use uvicorn to start the FastAPI server:

```bash
cd backend

python -m uvicorn main:app --reload
```
