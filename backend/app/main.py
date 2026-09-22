from fastapi import FastAPI

app = FastAPI(title="Book Management System")


@app.get("/health")
def health():
    return {"status": "ok"}
