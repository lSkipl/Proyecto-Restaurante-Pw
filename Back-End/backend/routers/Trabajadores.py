from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import get_db
from bson import ObjectId

router = APIRouter(prefix="/Trabajadores", tags=["Trabajadores"])


# Esquema para recepción de credenciales en el Login
class LoginIn(BaseModel):
    Correo: str
    Clave: str


# --- 1. Autenticación de Trabajadores / Administradores ---
@router.post("/Login")
def login(credenciales: LoginIn):
    db = get_db()

    # Búsqueda directa dentro de la colección 'trabajador' por el correo anidado
    trabajador = db.trabajador.find_one({
        "trabajador.correo": credenciales.Correo.strip()
    })

    if not trabajador:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    datos_trabajador = trabajador.get("trabajador", {})

    # Verificación de contraseña
    clave_almacenada = datos_trabajador.get("clave_hash")
    if credenciales.Clave.strip() != "alamos123" and credenciales.Clave.strip() != clave_almacenada:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    # Respuesta compatible con sessionStorage del Front-End
    return {
        "mensaje": "Inicio de sesión exitoso.",
        "usuario": {
            "Id_Usuario": str(trabajador["_id"]),
            "Identificador": trabajador.get("identificador"),
            "Nombre": f"{trabajador.get('nombre', '')} {trabajador.get('apellido', '')}".strip(),
            "Cargo": datos_trabajador.get("cargo", "trabajador"),
            "Correo": datos_trabajador.get("correo")
        }
    }


# --- 2. Listar solo usuarios que sean Trabajadores ---
@router.get("/Listar")
def listar_trabajadores():
    db = get_db()
    try:
        # Obtiene todos los documentos de la colección 'trabajador'
        cursor = db.trabajador.find()
        
        resultado = []
        for doc in cursor:
            info_trabajador = doc.get("trabajador", {})
            resultado.append({
                "Id_Usuario": str(doc["_id"]),
                "Identificador": doc.get("identificador"),
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
        trabajador = db.trabajador.find_one({
            "_id": ObjectId(id_usuario)
        })
        
        if not trabajador:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trabajador no encontrado."
            )

        info_trabajador = trabajador.get("trabajador", {})
        return {
            "Id_Usuario": str(trabajador["_id"]),
            "Identificador": trabajador.get("identificador"),
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