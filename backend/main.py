from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from fastapi.staticfiles import StaticFiles

from facility_routes import router as facility_router
from prediction_routes import router as prediction_router
load_dotenv()

app = FastAPI(title="PFFP 메인")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/routers")
def list_routes():
        routes=[route.path for route in app.routes]
        print("등록된 라우트 목록:", routes)
        return routes

app.include_router(facility_router, prefix="/facility")
app.include_router(prediction_router, prefix="/prediction")