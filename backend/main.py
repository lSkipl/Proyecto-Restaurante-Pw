from fastapi import FastAPI
from routers import Reservas, alter, Menu, Trabajadores

app = FastAPI(title="Backend Restaurante")

app.include_router(Reservas.router)
app.include_router(Trabajadores.router)
app.include_router(Menu.router)
app.include_router(alter.router)


@app.get("/")
def inicio():
    return {
        "mensaje": "Backend Restaurante funcionando correctamente"
    }
