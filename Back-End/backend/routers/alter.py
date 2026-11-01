from fastapi import APIRouter, HTTPException
from database import get_connection

router = APIRouter(prefix="/alter", tags=["Alter"])

@router.put("/agregar-columna")
def agregar_columna(tabla: str, nombre_columna: str, tipo_dato: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        sql = f"ALTER TABLE {tabla} ADD COLUMN {nombre_columna} {tipo_dato}"
        cursor.execute(sql)
        conn.commit()
        mensaje = f"Columna '{nombre_columna}' de tipo '{tipo_dato}' agregada a la tabla '{tabla}'."
    except Exception as e:
        mensaje = f"Error al agregar columna: {e}"
    finally:
        conn.close()
    return {"mensaje": mensaje}


@router.put("/cambiar-nombre-columna")
def cambiar_nombre_columna(tabla: str, nombre_columna: str, nombre_nuevo: str):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        sql = f"ALTER TABLE {tabla} RENAME COLUMN {nombre_columna} TO {nombre_nuevo}"
        cursor.execute(sql)
        conn.commit()
        mensaje = f"Columna '{nombre_columna}' renombrada a '{nombre_nuevo}' en la tabla '{tabla}'."
    except Exception as e:
        mensaje = f"Error al cambiar nombre: {e}"
    finally:
        conn.close()
    return {"mensaje": mensaje}

@router.delete("/Drop-table")
def eliminar_tabla(tabla: str):

    conn = get_connection()
    cursor = conn.cursor()

    try:
        sql = f"DROP TABLE {tabla}"
        cursor.execute(sql)
        conn.commit()

        return {
            "mensaje": f"La tabla '{tabla}' fue eliminada correctamente."
        }

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al eliminar la tabla: {str(e)}")

    finally:
        conn.close()
