from fastapi import APIRouter, HTTPException, status
from database import get_db
from pydantic import BaseModel
from typing import List
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/Horarios", tags=["Horarios"])


class HorarioItem(BaseModel):
    dia: str
    hora_inicio: str
    hora_termino: str


class GuardarHorariosIn(BaseModel):
    id_usuario: str
    horarios: List[HorarioItem]


def item_to_dict(item: HorarioItem) -> dict:
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return item.dict()


# --- 1. Listar trabajadores para el selector desplegable ---
@router.get("/Trabajadores")
def listar_trabajadores():
    db = get_db()
    try:
        # Consulta en la colección 'trabajador'
        trabajadores = db.trabajador.find()

        resultado = []
        for t in trabajadores:
            nombre_completo = f"{t.get('nombre', '')} {t.get('apellido', '')}".strip()
            cargo = t.get("trabajador", {}).get("cargo", "Personal")
            resultado.append({
                "id": str(t["_id"]),
                "nombre": f"{nombre_completo} ({cargo})"
            })
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar trabajadores: {str(e)}"
        )


# --- 2. Obtener los turnos guardados de un trabajador ---
@router.get("/Obtener/{id_usuario}")
def obtener_horarios(id_usuario: str):
    db = get_db()
    try:
        try:
            oid = ObjectId(id_usuario)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de ID de trabajador inválido."
            )

        # Consulta en la colección 'trabajador'
        trabajador = db.trabajador.find_one({"_id": oid})
        if not trabajador or "trabajador" not in trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trabajador no encontrado."
            )

        return trabajador["trabajador"].get("horarios", [])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener horarios: {str(e)}"
        )


# --- 3. Guardar / Actualizar los turnos en el documento de MongoDB ---
@router.put("/Guardar")
def guardar_horarios(datos: GuardarHorariosIn):
    db = get_db()
    try:
        try:
            oid = ObjectId(datos.id_usuario)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de ID de trabajador inválido."
            )

        horarios_dict = [item_to_dict(h) for h in datos.horarios]

        # Actualiza el documento en la colección 'trabajador'
        resultado = db.trabajador.update_one(
            {"_id": oid},
            {"$set": {"trabajador.horarios": horarios_dict}}
        )

        if resultado.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró el trabajador especificado."
            )

        return {"mensaje": "Horarios actualizados exitosamente en MongoDB."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar horarios: {str(e)}"
        )