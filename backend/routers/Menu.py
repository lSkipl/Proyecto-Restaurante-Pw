from fastapi import APIRouter, HTTPException
from database import get_connection
from models import MenuIn

router = APIRouter(prefix="/Menu", tags=["Menu"])


# --- Mostrar menús con un precio específico ---
@router.get("/precio/")
def obtener_menus_por_precio(Precio: int):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """ SELECT Plato, Descripcion, Precio FROM Menu WHERE Precio = ? """,(Precio,)
    )

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "Platos": r[0],
            "Descripcion": r[1],
            "Precio": r[2]
        }
        for r in rows
    ]


# --- Agregar un nuevo menu ---
@router.post("/")
def agregar_menu(item: MenuIn):

    conn = get_connection()
    cursor = conn.cursor()

    # Verificar si el plato ya existe
    cursor.execute(
        """ SELECT Plato FROM Menu WHERE Plato = ? """, (item.Platos,)
    )

    existe = cursor.fetchone()

    if existe:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"El menú '{item.Platos}' ya existe."
        )

    try:
        cursor.execute(
            """ INSERT INTO Menu (Plato, Descripcion, Precio) VALUES (?, ?, ?) """, (item.Platos, item.Descripcion, item.Precio)
        )

        conn.commit()

        return {
            "mensaje": f"El menú '{item.Platos}' fue agregado correctamente."
        }

    except Exception as e:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Error al agregar el menú: {str(e)}"
        )

    finally:
        conn.close()