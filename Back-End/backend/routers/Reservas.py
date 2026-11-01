from fastapi import APIRouter, HTTPException, status
from database import get_db
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/Reservas", tags=["Reservas"])


class EstadoUpdate(BaseModel):
    Estado: str  # 'aprobada', 'rechazada' o 'pendiente'


# --- 1. Listar todas las reservas para la interfaz web ---
@router.get("/Listar")
def listar_reservas():
    db = get_db()
    try:
        reservas = list(db.reservas.find())

        # Crear mapa de usuarios consultando tanto 'usuarios' como 'trabajador'
        usuarios_totales = list(db.usuarios.find()) + list(db.trabajador.find())
        mapa_usuarios = {}
        for u in usuarios_totales:
            rut = u.get("id_usuario") or u.get("identificador")
            if rut:
                nombre = u.get("nombre", "")
                apellido = u.get("apellido", "")
                contacto = u.get("contacto", "Sin contacto")
                mapa_usuarios[rut] = {
                    "nombre_completo": f"{nombre} {apellido}".strip(),
                    "contacto": contacto
                }

        resultado = []
        for r in reservas:
            id_u = r.get("id_usuario") or r.get("usuario_id")
            cliente_info = mapa_usuarios.get(id_u, {
                "nombre_completo": "Cliente Álamos",
                "contacto": "Sin contacto"
            })

            # Lectura directa de fecha y hora
            fecha_str = r.get("fecha", "-")
            hora_str = r.get("hora", "-")

            # Normalización del estado
            est = r.get("estado")
            if est == 1 or str(est).lower() in ["1", "aprobada", "confirmada"]:
                estado_texto = "Aprobada"
            elif est == 0 or str(est).lower() in ["0", "rechazada", "cancelada"]:
                estado_texto = "Rechazada"
            else:
                estado_texto = str(est).capitalize()

            platos = r.get("platos") or r.get("plato", {}).get("nombre", "Sin plato")

            resultado.append({
                # Claves en inglés esperadas por la plantilla actual
                "code": str(r["_id"]),
                "client": cliente_info["nombre_completo"],
                "date": fecha_str,
                "time": hora_str,
                "table": r.get("lugar", "Mesa asignada"),
                "status": estado_texto,
                "guests": 2,
                "phone": cliente_info["contacto"],
                "notes": f"Platos: {platos}",

                # Claves en español por retrocompatibilidad
                "Codigo": str(r.get("id_reserva", r["_id"])),
                "Cliente": cliente_info["nombre_completo"],
                "Fecha": fecha_str,
                "Hora": hora_str,
                "Lugar": r.get("lugar", "Mesa asignada"),
                "Estado": estado_texto,
                "Platos": platos
            })

        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar reservas en MongoDB: {str(e)}"
        )


# --- 2. Actualizar el estado de la reserva (Aprobada / Rechazada) ---
@router.put("/Estado/{id_reserva}")
def actualizar_estado(id_reserva: str, datos: EstadoUpdate):
    db = get_db()
    try:
        try:
            filtro = {"_id": ObjectId(id_reserva)}
        except InvalidId:
            filtro = {"id_reserva": int(id_reserva)} if id_reserva.isdigit() else {"_id": id_reserva}

        resultado = db.reservas.update_one(
            filtro,
            {"$set": {"estado": datos.Estado.lower()}}
        )

        if resultado.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada."
            )

        return {"mensaje": f"Reserva actualizada a {datos.Estado}."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar estado en MongoDB: {str(e)}"
        )


# --- 3. Eliminar reserva ---
@router.delete("/Delete/{id_reserva}")
def eliminar_reserva(id_reserva: str):
    db = get_db()
    try:
        try:
            filtro = {"_id": ObjectId(id_reserva)}
        except InvalidId:
            filtro = {"id_reserva": int(id_reserva)} if id_reserva.isdigit() else {"_id": id_reserva}

        resultado = db.reservas.delete_one(filtro)

        if resultado.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada."
            )

        return {"mensaje": "Reserva eliminada de MongoDB exitosamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar reserva de MongoDB: {str(e)}"
        )