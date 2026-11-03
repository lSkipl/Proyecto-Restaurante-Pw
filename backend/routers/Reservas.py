import re
import unicodedata
from datetime import datetime
from typing import Optional
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/Reservas", tags=["Reservas"])


class EstadoUpdate(BaseModel):
    Estado: str


class CrearReservaIn(BaseModel):
    nombre: str
    apellido: str
    identificador: str
    telefono: str
    fecha: str
    hora: str
    plato: Optional[str] = "Sin plato"
    lugar: str


class ConsultarReservaIn(BaseModel):
    codigo: Optional[str] = None
    identificador: str


class PagoSimuladoIn(BaseModel):
    codigo: str


def normalizar_cadena(cadena: str) -> str:
    """Convierte a minusculas, quita tildes, enes y espacios redundantes."""
    if not cadena:
        return ""
    texto = unicodedata.normalize('NFKD', str(cadena)).encode('ASCII', 'ignore').decode('utf-8')
    return texto.strip().lower()


def obtener_precio_plato(db, nombre_plato: str) -> str:
    """Busca el plato en la coleccion de MongoDB sin importar mayusculas ni acentos."""
    if not nombre_plato or str(nombre_plato).strip() in ["Sin plato", "None", ""]:
        return "$0"

    colecciones = db.list_collection_names()
    col_menu = db["menu"] if "menu" in colecciones else db["menus"]

    plato_buscado = normalizar_cadena(nombre_plato)

    for plato_doc in col_menu.find():
        nombre_bd = (
            plato_doc.get("Platos") or
            plato_doc.get("Plato") or
            plato_doc.get("nombre") or
            plato_doc.get("Nombre") or
            ""
        )
        
        if normalizar_cadena(nombre_bd) == plato_buscado:
            precio_bd = plato_doc.get("Precio") or plato_doc.get("precio") or plato_doc.get("monto") or 0
            try:
                precio_limpio = str(precio_bd).replace("$", "").replace(".", "").replace(",", "").strip()
                precio_numero = int(float(precio_limpio))
                return f"${precio_numero:,}".replace(",", ".")
            except Exception:
                return f"${precio_bd}"

    if "lasa" in plato_buscado:
        return "$9.990"
    if "risotto" in plato_buscado:
        return "$12.500"
    if "salmon" in plato_buscado:
        return "$15.800"

    return "$0"


# --- 1. Crear una nueva reserva con guardado de usuario en 'usuario' ---
@router.post("/Crear")
def crear_reserva(datos: CrearReservaIn):
    db = get_db()
    try:
        reserva_ocupada = db.reservas.find_one({
            "fecha": datos.fecha,
            "hora": datos.hora,
            "lugar": datos.lugar,
            "estado": {"$nin": ["rechazada", "0", 0, "cancelada"]}
        })

        if reserva_ocupada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El lugar '{datos.lugar}' ya se encuentra reservado para el {datos.fecha} a las {datos.hora}."
            )

        # Guarda o actualiza al cliente directamente en la coleccion 'usuario'
        db.usuario.update_one(
            {"id_usuario": datos.identificador.strip()},
            {"$set": {
                "id_usuario": datos.identificador.strip(),
                "identificador": datos.identificador.strip(),
                "nombre": datos.nombre.strip(),
                "apellido": datos.apellido.strip(),
                "contacto": datos.telefono.strip()
            }},
            upsert=True
        )

        total_reserva = obtener_precio_plato(db, datos.plato)

        nueva_reserva = {
            "id_usuario": datos.identificador.strip(),
            "fecha": datos.fecha,
            "hora": datos.hora,
            "lugar": datos.lugar,
            "platos": datos.plato.strip(),
            "estado": "pendiente",
            "estado_pago": "Pago no registrado",
            "total": total_reserva
        }

        resultado = db.reservas.insert_one(nueva_reserva)

        return {
            "mensaje": "Reserva solicitada con éxito.",
            "codigo": str(resultado.inserted_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la reserva en MongoDB: {str(e)}"
        )


# --- 2. Listar todas las reservas cruzando exclusivamente con 'usuario' ---
@router.get("/Listar")
def listar_reservas():
    db = get_db()
    try:
        reservas = list(db.reservas.find().sort("_id", -1))

        # Lectura centralizada desde la coleccion 'usuario'
        usuarios_totales = list(db.usuario.find())

        mapa_usuarios = {}
        for u in usuarios_totales:
            uid_str = str(u.get("_id"))
            rut = str(u.get("id_usuario") or u.get("identificador") or "").strip()
            nombre = u.get("nombre", "").strip()
            apellido = u.get("apellido", "").strip()
            contacto = u.get("contacto", "Sin contacto").strip()
            nombre_comp = f"{nombre} {apellido}".strip() or "Cliente Álamos"

            info = {
                "nombre_completo": nombre_comp,
                "contacto": contacto,
                "rut": rut or "No registrado"
            }

            mapa_usuarios[uid_str] = info
            if rut:
                mapa_usuarios[rut] = info
                rut_limpio = rut.lower().replace(".", "").replace("-", "")
                mapa_usuarios[rut_limpio] = info

        resultado = []
        for r in reservas:
            id_u = str(r.get("id_usuario") or r.get("usuario_id") or "").strip()
            id_u_limpio = id_u.lower().replace(".", "").replace("-", "")

            cliente_info = mapa_usuarios.get(id_u) or mapa_usuarios.get(id_u_limpio) or {
                "nombre_completo": "Cliente Álamos",
                "contacto": "Sin contacto",
                "rut": id_u or "No registrado"
            }

            if "fecha_hora" in r and isinstance(r["fecha_hora"], datetime):
                fecha_str = r["fecha_hora"].strftime("%Y-%m-%d")
                hora_str = r["fecha_hora"].strftime("%H:%M")
            else:
                fecha_str = str(r.get("fecha", "-"))
                hora_str = str(r.get("hora", "-"))

            platos = str(r.get("platos") or r.get("plato") or "Sin plato")

            total_val = r.get("total")
            if not total_val or total_val in ["$0", 0, "0", "$ 0"]:
                total_val = obtener_precio_plato(db, platos)

            est = r.get("estado")
            if est == 1 or str(est).lower() in ["1", "aprobada", "confirmada"]:
                estado_texto = "Aprobada"
            elif est == 0 or str(est).lower() in ["0", "rechazada", "cancelada"]:
                estado_texto = "Rechazada"
            else:
                estado_texto = str(est).capitalize() if est else "Pendiente"

            resultado.append({
                "code": str(r["_id"]),
                "client": cliente_info["nombre_completo"],
                "rut": cliente_info["rut"],
                "phone": cliente_info["contacto"],
                "date": fecha_str,
                "time": hora_str,
                "table": r.get("lugar", "Mesa asignada"),
                "status": estado_texto,
                "payment_status": r.get("estado_pago", "Pago no registrado"),
                "total": total_val,
                "notes": f"Plato: {platos}"
            })

        return resultado

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al listar reservas en MongoDB: {str(e)}"
        )


# --- 3. Actualizar el estado de la reserva ---
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


# --- 4. Eliminar reserva ---
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


# --- 5. Consultar reservas del cliente ---
@router.post("/Consultar")
def consultar_reserva(datos: ConsultarReservaIn):
    db = get_db()
    try:
        rut = datos.identificador.strip()
        cod = datos.codigo.strip() if datos.codigo else None

        rut_limpio = rut.lower().replace(".", "").replace("-", "")

        filtro_usuario = {
            "$or": [
                {"id_usuario": rut},
                {"identificador": rut},
                {"id_usuario": rut.replace(".", "")},
                {"identificador": rut.replace(".", "")},
                {"id_usuario": rut_limpio},
                {"identificador": rut_limpio}
            ]
        }

        if cod:
            try:
                filtro_id = {"_id": ObjectId(cod)}
            except InvalidId:
                filtro_id = {"id_reserva": int(cod)} if cod.isdigit() else {"_id": cod}

            cursor = db.reservas.find({"$and": [filtro_id, filtro_usuario]})
            reservas = list(cursor)

            if not reservas:
                if db.reservas.find_one(filtro_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="El identificador ingresado no coincide con el titular de este código."
                    )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No existe ninguna reserva con ese código."
                )
        else:
            reservas = list(db.reservas.find(filtro_usuario).sort("_id", -1))

            if not reservas:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No se encontraron reservas registradas para este identificador."
                )

        resultado = []
        for reserva in reservas:
            est = reserva.get("estado")
            if est == 1 or str(est).lower() in ["1", "aprobada", "confirmada"]:
                estado_texto = "Aprobada"
            elif est == 0 or str(est).lower() in ["0", "rechazada", "cancelada"]:
                estado_texto = "Rechazada"
            else:
                estado_texto = str(est).capitalize() if est else "Pendiente"

            plato_nombre = reserva.get("platos") or reserva.get("plato", "Sin plato")

            total_val = reserva.get("total")
            if not total_val or total_val in ["$0", 0, "0", "$ 0"]:
                total_val = obtener_precio_plato(db, plato_nombre)

            resultado.append({
                "codigo": str(reserva["_id"]),
                "fecha": reserva.get("fecha", "-"),
                "hora": reserva.get("hora", "-"),
                "plato": plato_nombre,
                "lugar": reserva.get("lugar", "Mesa asignada"),
                "estado": estado_texto,
                "estado_pago": reserva.get("estado_pago", "Pago no registrado"),
                "total": total_val
            })

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar reservas en MongoDB: {str(e)}"
        )


# --- 6. Registrar pago simulado y actualizar el monto pagado en MongoDB ---
@router.post("/RegistrarPago")
def registrar_pago(datos: PagoSimuladoIn):
    db = get_db()
    try:
        cod = datos.codigo.strip()
        try:
            filtro = {"_id": ObjectId(cod)}
        except InvalidId:
            filtro = {"id_reserva": int(cod)} if cod.isdigit() else {"_id": cod}

        # 1. Buscar la reserva actual en la base de datos
        reserva = db.reservas.find_one(filtro)
        if not reserva:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada."
            )

        # 2. Obtener el nombre del plato y calcular su precio real desde el menú
        nombre_plato = reserva.get("platos") or reserva.get("plato") or "Sin plato"
        precio_calculado = obtener_precio_plato(db, nombre_plato)

        # Respaldo si el precio calculado vino en $0
        if precio_calculado in ["$0", 0, "0", "$ 0"]:
            precio_calculado = "$9.990" if "lasa" in normalizar_cadena(nombre_plato) else "$8.990"

        # 3. Actualizar en MongoDB tanto el estado_pago como el total
        resultado = db.reservas.update_one(
            filtro,
            {
                "$set": {
                    "estado_pago": "Pagado",
                    "total": precio_calculado
                }
            }
        )

        if resultado.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se pudo actualizar la reserva."
            )

        return {
            "mensaje": f"Pago de {precio_calculado} registrado con éxito.",
            "total": precio_calculado
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar pago en MongoDB: {str(e)}"
        )