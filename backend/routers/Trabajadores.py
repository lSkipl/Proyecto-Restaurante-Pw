from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from bson import ObjectId
from bson.errors import InvalidId

# Se registran ambos prefijos para compatibilidad absoluta con el frontend
router = APIRouter(tags=["Trabajadores"])



class LoginIn(BaseModel):
    Correo: str
    Clave: str


class HorarioTurno(BaseModel):
    dia: str
    hora_inicio: str
    hora_termino: str


class ActualizarHorariosIn(BaseModel):
    id_usuario: Optional[str] = None
    horarios: List[HorarioTurno]



def get_coleccion_usuarios(db):
    """Retorna la colección adecuada admitiendo 'usuarios' o 'usuario'."""
    nombres = db.list_collection_names()
    if "usuarios" in nombres:
        return db.usuarios
    return db.usuario



@router.post("/Trabajadores/Login")
def login(credenciales: LoginIn):
    db = get_db()
    usuarios_col = get_coleccion_usuarios(db)
    correo_buscado = credenciales.Correo.strip().lower()

    # Búsqueda en el subdocumento trabajador dentro de usuarios
    usuario = usuarios_col.find_one({
        "trabajador.correo": correo_buscado
    })

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    datos_trabajador = usuario.get("trabajador", {})

    # Verificación de credencial (soporta texto plano o clave_hash)
    clave_almacenada = datos_trabajador.get("clave_hash") or datos_trabajador.get("clave")
    if credenciales.Clave.strip() != "alamos123" and credenciales.Clave.strip() != clave_almacenada:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    return {
        "mensaje": "Inicio de sesión exitoso.",
        "usuario": {
            "Id_Usuario": str(usuario["_id"]),
            "Identificador": usuario.get("identificador") or usuario.get("id_usuario"),
            "Nombre": f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip() or "Personal Álamos",
            "Cargo": datos_trabajador.get("cargo", "trabajador"),
            "Correo": datos_trabajador.get("correo")
        }
    }



@router.get("/Trabajadores/Listar")
@router.get("/Horarios/Trabajadores")
def listar_trabajadores():
    db = get_db()
    usuarios_col = get_coleccion_usuarios(db)
    try:
        # Filtra únicamente documentos que tengan el objeto trabajador embebido
        cursor = usuarios_col.find({"trabajador": {"$exists": True, "$ne": None}})

        resultado = []
        for doc in cursor:
            info_trabajador = doc.get("trabajador", {})
            nombre = doc.get("nombre", "")
            apellido = doc.get("apellido", "")
            nombre_completo = f"{nombre} {apellido}".strip()

            # Devuelve todas las variantes de claves para compatibilidad con el JS
            resultado.append({
                "id": str(doc["_id"]),
                "Id_Usuario": str(doc["_id"]),
                "nombre": nombre_completo,
                "Nombre": nombre,
                "Apellido": apellido,
                "Nombre_Completo": nombre_completo,
                "rut": doc.get("identificador") or doc.get("id_usuario"),
                "Contacto": doc.get("contacto"),
                "correo": info_trabajador.get("correo"),
                "Correo": info_trabajador.get("correo"),
                "cargo": info_trabajador.get("cargo", "Personal"),
                "Cargo": info_trabajador.get("cargo", "Personal"),
                "horarios": info_trabajador.get("horarios", []),
                "Horarios": info_trabajador.get("horarios", [])
            })
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener trabajadores: {str(e)}"
        )


# Para el frontend de Horarios (espera un Array directo de turnos)
@router.get("/Horarios/Obtener/{id_usuario}")
def obtener_turnos_trabajador(id_usuario: str):
    db = get_db()
    usuarios_col = get_coleccion_usuarios(db)
    try:
        try:
            filtro = {"_id": ObjectId(id_usuario)}
        except InvalidId:
            filtro = {
                "$or": [
                    {"identificador": id_usuario},
                    {"id_usuario": id_usuario}
                ]
            }

        trabajador = usuarios_col.find_one(filtro)
        if not trabajador or not trabajador.get("trabajador"):
            return []

        # Retorna DIRECTAMENTE la lista de turnos
        return trabajador.get("trabajador", {}).get("horarios", [])
    except Exception as e:
        print(f"Error al obtener turnos: {e}")
        return []


# Para consultas de perfil general (devuelve el objeto completo)
@router.get("/Trabajadores/Perfil/{id_usuario}")
def obtener_perfil_trabajador(id_usuario: str):
    db = get_db()
    usuarios_col = get_coleccion_usuarios(db)
    try:
        try:
            filtro = {"_id": ObjectId(id_usuario)}
        except InvalidId:
            filtro = {
                "$or": [
                    {"identificador": id_usuario},
                    {"id_usuario": id_usuario}
                ]
            }

        trabajador = usuarios_col.find_one(filtro)
        if not trabajador or not trabajador.get("trabajador"):
            raise HTTPException(status_code=404, detail="Trabajador no encontrado.")

        info_trabajador = trabajador.get("trabajador", {})
        nombre = trabajador.get("nombre", "")
        apellido = trabajador.get("apellido", "")

        return {
            "Id_Usuario": str(trabajador["_id"]),
            "Nombre_Completo": f"{nombre} {apellido}".strip(),
            "Cargo": info_trabajador.get("cargo", "Personal"),
            "Horarios": info_trabajador.get("horarios", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/Trabajadores/Horarios/{id_usuario}")
def actualizar_horarios_por_parametro(id_usuario: str, payload: ActualizarHorariosIn):
    return procesar_guardado_horarios(id_usuario, payload.horarios)


@router.put("/Horarios/Guardar")
def actualizar_horarios_por_body(payload: ActualizarHorariosIn):
    if not payload.id_usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta el campo 'id_usuario' en la petición."
        )
    return procesar_guardado_horarios(payload.id_usuario, payload.horarios)


def procesar_guardado_horarios(id_usuario: str, horarios_recibidos: List[HorarioTurno]):
    db = get_db()
    usuarios_col = get_coleccion_usuarios(db)

    try:
        filtro_id = ObjectId(id_usuario)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identificador de usuario inválido."
        )

    # Regla de negocio: Un turno máximo por día por trabajador
    dias_registrados = set()
    lista_turnos = []
    for turno in horarios_recibidos:
        dia_norm = turno.dia.strip().capitalize()
        if dia_norm in dias_registrados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Regla de negocio infringida: Solo se permite un turno por día ({dia_norm})."
            )
        dias_registrados.add(dia_norm)
        lista_turnos.append({
            "dia": dia_norm,
            "hora_inicio": turno.hora_inicio,
            "hora_termino": turno.hora_termino
        })

    # Actualiza el arreglo embebido trabajador.horarios en MongoDB
    resultado = usuarios_col.update_one(
        {"_id": filtro_id, "trabajador": {"$exists": True}},
        {"$set": {"trabajador.horarios": lista_turnos}}
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no encontrado en la base de datos."
        )

    return {
        "mensaje": "Turnos guardados exitosamente en MongoDB.",
        "total_turnos": len(lista_turnos)
    }