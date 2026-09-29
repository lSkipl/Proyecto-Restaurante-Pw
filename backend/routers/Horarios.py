from fastapi import APIRouter, HTTPException
from database import get_connection
from models import HorarioIn

router = APIRouter(prefix="/Horarios", tags=["Horarios"])


# --- Consultar horarios de un trabajador ---
@router.get("/Select")
def obtener_horarios(Id_Trabajador: str):

    conn = get_connection()
    cursor = conn.cursor()

    try:

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
            raise HTTPException(
                status_code=404,
                detail=f"El trabajador {Id_Trabajador} no existe."
            )

        # Obtener sus horarios
        cursor.execute(""" SELECT Id_Trabajador, Dia, Hora_Inicio, Hora_Termino FROM Horario WHERE Id_Trabajador = ?
            ORDER BY CASE Dia WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4
            WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 WHEN 'Domingo' THEN 7 END """, (Id_Trabajador,))

        rows = cursor.fetchall()

        return [
            {
                "Id_Trabajador": r[0],
                "Dia": r[1],
                "Hora_Inicio": r[2],
                "Hora_Termino": r[3]
            }
            for r in rows
        ]

    finally:
        conn.close()


# --- Crear horario ---
@router.post("/Insert")
def agregar_horario(item: HorarioIn):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que el trabajador exista
        cursor.execute( """ SELECT Id_Trabajador FROM Trabajador WHERE Id_Trabajador = ? """, (item.Id_Trabajador,))

        trabajador = cursor.fetchone()

        if not trabajador:
            raise HTTPException(status_code=404, detail=f"El trabajador {item.Id_Trabajador} no existe.")

        # Verificar que el trabajador no tenga ya un horario ese día
        cursor.execute(""" SELECT Id_Trabajador FROM Horario WHERE Id_Trabajador = ? AND Dia = ? """, (item.Id_Trabajador, item.Dia))

        horario = cursor.fetchone()

        if horario:
            raise HTTPException(status_code=400,detail=f"El trabajador ya tiene un horario asignado para el día {item.Dia}.")

        # Insertar horario
        cursor.execute(""" INSERT INTO Horario (Id_Trabajador, Dia, Hora_Inicio, Hora_Termino) VALUES (?, ?, ?, ?) """,
            (item.Id_Trabajador, item.Dia, item.Hora_Inicio, item.Hora_Termino))

        conn.commit()

        return {
            "mensaje": "Horario agregado correctamente.",
            "Id_Trabajador": item.Id_Trabajador,
            "Dia": item.Dia
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al agregar el horario: {str(e)}")

    finally:
        conn.close()


# --- Modificar horario ---
@router.put("/Update")
def modificar_horario(
    Id_Trabajador: str,
    Dia: str,
    item: HorarioIn
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que el horario exista
        cursor.execute(""" SELECT Id_Trabajador, Dia FROM Horario WHERE Id_Trabajador = ? AND Dia = ? """, (Id_Trabajador, Dia))

        horario = cursor.fetchone()

        if not horario:
            raise HTTPException(status_code=404, detail=f"No existe un horario para el trabajador {Id_Trabajador} el día {Dia}.")

        # Verificar que el trabajador nuevo exista
        cursor.execute(""" SELECT Id_Trabajador FROM Trabajador WHERE Id_Trabajador = ? """, (item.Id_Trabajador,))

        trabajador = cursor.fetchone()

        if not trabajador:
            raise HTTPException(status_code=404, detail=f"El trabajador {item.Id_Trabajador} no existe.")

        # Si se cambia el trabajador o el día,
        # verificar que no exista otro horario con esa combinación
        if Id_Trabajador != item.Id_Trabajador or Dia != item.Dia:

            cursor.execute("""SELECT Id_Trabajador FROM Horario WHERE Id_Trabajador = ? AND Dia = ?""",(item.Id_Trabajador, item.Dia)
            )

            existe = cursor.fetchone()

            if existe:
                raise HTTPException(status_code=400, detail=f"El trabajador ya tiene un horario asignado para el día {item.Dia}.")

        # Modificar horario
        cursor.execute(""" UPDATE Horario SET Id_Trabajador = ?, Dia = ?, Hora_Inicio = ?,Hora_Termino = ? WHERE Id_Trabajador = ? AND Dia = ? """,
            (item.Id_Trabajador, item.Dia, item.Hora_Inicio, item.Hora_Termino, Id_Trabajador, Dia))

        conn.commit()

        return {
            "mensaje": "El horario fue actualizado correctamente.",
            "Id_Trabajador": item.Id_Trabajador,
            "Dia": item.Dia
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al modificar el horario: {str(e)}")

    finally:
        conn.close()


# --- Eliminar horario ---
@router.delete("/Delete")
def eliminar_horario(
    Id_Trabajador: str,
    Dia: str
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que el horario exista
        cursor.execute(""" SELECT Id_Trabajador, Dia FROM Horario WHERE Id_Trabajador = ? AND Dia = ? """, (Id_Trabajador, Dia))

        horario = cursor.fetchone()

        if not horario:
            raise HTTPException(status_code=404, detail=f"No existe un horario para el trabajador {Id_Trabajador} el día {Dia}.")

        # Eliminar horario
        cursor.execute(""" DELETE FROM Horario WHERE Id_Trabajador = ? AND Dia = ? """, (Id_Trabajador, Dia))

        conn.commit()

        return {
            "mensaje": f"El horario del día {Dia} fue eliminado correctamente."
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500,detail=f"Error al eliminar el horario: {str(e)}")

    finally:
        conn.close()