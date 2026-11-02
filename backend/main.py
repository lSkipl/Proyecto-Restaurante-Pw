import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import Reservas, Menu, Trabajadores, Transaccion, Horarios

app = FastAPI(title="Backend Restaurante")

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Routers de la API (DEBEN IR ANTES DE MONTAR LOS ARCHIVOS ESTÁTICOS)
app.include_router(Reservas.router)
app.include_router(Trabajadores.router)
app.include_router(Horarios.router)
app.include_router(Menu.router)
app.include_router(Transaccion.router)
#app.include_router(alter.router)

# 3. Ruta a la carpeta Front-End
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIR = os.path.join(BASE_DIR, "Front-End")

# 4. Servir todo el Front-End en la raíz (HTML, CSS, JS, imágenes)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")