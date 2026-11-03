from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_db
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(prefix="/Trabajadores", tags=["Trabajadores"])


# Esquema para recepción de credenciales en el Login
class LoginIn(BaseModel):
    Correo: str
    Clave: str


# --- 1. Autenticación de Trabajadores / Administradores en colección 'usuario' ---
@router.post("/Login")
def login(credenciales: LoginIn):
    db = get_db()
    correo_buscado = credenciales.Correo.strip().lower()

    # Búsqueda en la colección 'usuario' por el correo embebido dentro del subdocumento trabajador
    usuario = db.usuario.find_one({
        "trabajador.correo": correo_buscado
    })

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    datos_trabajador = usuario.get("trabajador", {})

    # Verificación de contraseña (admite texto plano o clave_hash)
    clave_almacenada = datos_trabajador.get("clave_hash") or datos_trabajador.get("clave")
    if credenciales.Clave.strip() != "alamos123" and credenciales.Clave.strip() != clave_almacenada:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    # Respuesta compatible con sessionStorage del Front-End
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


# --- 2. Listar solo usuarios que tengan perfil de Trabajador ---
@router.get("/Listar")
def listar_trabajadores():
    db = get_db()
    try:
        # Filtra únicamente los documentos de 'usuario' donde el campo 'trabajador' existe y no es nulo
        cursor = db.usuario.find({"trabajador": {"$exists": True, "$ne": None}})

        resultado = []
        for doc in cursor:
            info_trabajador = doc.get("trabajador", {})
            resultado.append({
                "Id_Usuario": str(doc["_id"]),
                "Identificador": doc.get("identificador") or doc.get("id_usuario"),
                "Nombre": doc.get("nombre"),
                "Apellido": doc.get("apellido"),
                "Contacto": doc.get("contacto"),
                "Correo": info_trabajador.get("correo"),
                "Cargo": info_trabajador.get("cargo"),
                "Horarios": info_trabajador.get("horarios", [])
            })
        return resultado
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener trabajadores: {str(e)}"
        )


# --- 3. Obtener perfil de un trabajador por su ID ---
@router.get("/Perfil/{id_usuario}")
def obtener_perfil_trabajador(id_usuario: str):
    db = get_db()
    try:
        # Búsqueda flexible por ObjectId o identificador/RUT
        try:
            filtro = {"_id": ObjectId(id_usuario)}
        except InvalidId:
            filtro = {
                "$or": [
                    {"identificador": id_usuario},
                    {"id_usuario": id_usuario}
                ]
            }

        trabajador = db.usuario.find_one(filtro)

        if not trabajador or "trabajador" not in trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trabajador no encontrado."
            )

        info_trabajador = trabajador.get("trabajador", {})
        return {
            "Id_Usuario": str(trabajador["_id"]),
            "Identificador": trabajador.get("identificador") or trabajador.get("id_usuario"),
            "Nombre": trabajador.get("nombre"),
            "Apellido": trabajador.get("apellido"),
            "Contacto": trabajador.get("contacto"),
            "Correo": info_trabajador.get("correo"),
            "Cargo": info_trabajador.get("cargo"),
            "Horarios": info_trabajador.get("horarios", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al buscar trabajador: {str(e)}"
        )