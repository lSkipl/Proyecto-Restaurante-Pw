from fastapi import APIRouter, HTTPException
from database import get_connection
from models import TrabajadorIn

router = APIRouter(prefix="/Trabajadores", tags=["Trabajadores"])

# --- Mostrar datos de los trabajadores ---
@router.get("/trabajadores/")
def obtener_trabajadores():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT Trabajador.Id_Trabajador, Usuario.Nombre, Usuario.Apellido, Trabajador.Correo, 
        Trabajador.Cargo, Usuario.Contacto FROM Trabajador INNER JOIN ON Usuario.Id_Usuario = Trabajador.Id_Trabajador
        """
    )

    rows = cursor.fetchall()

    conn.close()

    return [
        {
            "Id_Trabajador": r[0],
            "Nombre": r[1],
            "Apellido": r[2],
            "Correo": r[3],
            "Cargo": r[4],
            "Contacto": r[5]
        }
        for r in rows
    ]

# --- Eliminar trabajador por RUT ---
@router.delete("/{Id_Trabajador}")
def eliminar_trabajador(Id_Trabajador: str):

    conn = get_connection()
    cursor = conn.cursor()

    # Verificar que el trabajador exista
    cursor.execute(
        """
        SELECT Id_Trabajador
        FROM Trabajador
        WHERE Id_Trabajador = ?
        """,
        (Id_Trabajador,)
    )

    trabajador = cursor.fetchone()

    if not trabajador:
        conn.close()
        raise HTTPException(
            status_code=404,
            detail=f"El trabajador con RUT {Id_Trabajador} no fue encontrado."
        )

    # Eliminar de Trabajador
    cursor.execute(
        """
        DELETE FROM Trabajador WHERE Id_Trabajador = ?
        """,
        (Id_Trabajador,)
    )

    # Eliminar también de Usuario
    cursor.execute(
        """
        DELETE FROM Usuario WHERE Id_Usuario = ?
        """,
        (Id_Trabajador,)
    )

    conn.commit()
    conn.close()

    return {
        "mensaje": f"El trabajador con RUT {Id_Trabajador} fue eliminado correctamente."
    }

# --- Agregar trabajador ---
@router.post("/")
def agregar_trabajador(item: TrabajadorIn):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar si el usuario ya existe
        cursor.execute(
            """ SELECT Id_Usuario FROM Usuario WHERE Id_Usuario = ?
            """,
            (item.Id_Trabajador,)
        )

        usuario_existente = cursor.fetchone()

        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail=f"El usuario con RUT {item.Id_Trabajador} ya existe."
            )

        # Crear usuario
        cursor.execute(
            """
            INSERT INTO Usuario (Id_Usuario, Nombre, Apellido, Contacto) VALUES (?, ?, ?, ?)
            """, (item.Id_Trabajador, item.Nombre, item.Apellido,item.Contacto)
        )

        # Crear trabajador
        cursor.execute(
            """
            INSERT INTO Trabajador (Id_Trabajador,Correo,Clave,Cargo) VALUES (?, ?, ?, ?)
            """, (item.Id_Trabajador, item.Correo, item.Clave, item.Cargo)
        )

        conn.commit()

        return {
            "mensaje": "Trabajador agregado correctamente.",
            "Id_Trabajador": item.Id_Trabajador
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al agregar trabajador: {str(e)}"
        )

    finally:
        conn.close()

