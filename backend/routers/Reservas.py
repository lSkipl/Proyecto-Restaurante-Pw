from fastapi import APIRouter, HTTPException
from database import get_connection
from models import ReservaIn

router = APIRouter(prefix="/Reservas", tags=["Reservas"])


# --- Agregar reserva ---
@router.post("/Insert")
def agregar_reserva(item: ReservaIn):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que el usuario exista
        cursor.execute(
            """ SELECT Id_Usuario FROM Usuario  WHERE Id_Usuario = ? """, (item.Id_Usuario,) )

        usuario = cursor.fetchone()

        if not usuario:
            raise HTTPException(status_code=404, detail=f"El usuario {item.Id_Usuario} no existe.")

        # Verificar que el menú exista
        cursor.execute( """ SELECT Platos FROM Menu WHERE Platos = ? """, (item.Platos,))

        menu = cursor.fetchone()

        if not menu:
            raise HTTPException( status_code=404, detail=f"El menú '{item.Platos}' no existe.")

        # Insertar la reserva
        cursor.execute(""" INSERT INTO Reserva (Id_Usuario,Platos,Fecha,Hora,Lugar,Estado)VALUES (?, ?, ?, ?, ?, ?)""",
            (item.Id_Usuario, item.Platos, item.Fecha, item.Hora, item.Lugar, item.Estado))

        conn.commit()

        # Obtener el ID generado automáticamente
        id_reserva = cursor.lastrowid

        return {
            "mensaje": "Reserva agregada correctamente.",
            "Id_reserva": id_reserva
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException( status_code=500, detail=f"Error al agregar la reserva: {str(e)}")

    finally:
        conn.close()


# --- Consultar reservas por Id_Usuario ---
@router.get("/Select")
def obtener_reservas_rut(Id_Usuario: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute( """ SELECT Id_Transaccion, Id_reserva, Id_Usuario, Platos, Fecha, Hora, Lugar, Estado FROM Reserva WHERE Id_Usuario = ? """, (Id_Usuario,))

    rows = cursor.fetchall()

    conn.close()

    return [
        {
            "Id_Transaccion": r[0],
            "Id_reserva": r[1],
            "Id_Usuario": r[2],
            "Platos": r[3],
            "Fecha": r[4],
            "Hora": r[5],
            "Lugar": r[6],
            "Estado": r[7]
        }
        for r in rows
    ]


# --- Consultar reservas por menú y mostrar precio ---
@router.get("/Join")
def obtener_reservas_por_tipo_de_menu(Menu: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(""" SELECT Reserva.Id_Transaccion, Reserva.Id_reserva, Reserva.Id_Usuario, Reserva.Platos, Menu.Precio, Reserva.Fecha, Reserva.Hora,
            Reserva.Lugar, Reserva.Estado FROM Reserva INNER JOIN Menu ON Reserva.Platos = Menu.Platos WHERE Reserva.Platos = ? """, (Menu,))

    rows = cursor.fetchall()

    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail=f"Las reservas con {Menu} no fueron encontradas.")

    return [
        {
            "Id_Transaccion": r[0],
            "Id_reserva": r[1],
            "Id_usuario": r[2],
            "Platos": r[3],
            "Precio": r[4],
            "Fecha": r[5],
            "Hora": r[6],
            "Lugar": r[7],
            "Estado": r[8]
        }
        for r in rows
    ]


# --- Modificar datos de una reserva ---
@router.put("/Update")
def modificar_datos_reserva(Id_reserva: int, item: ReservaIn):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(""" SELECT * FROM Reserva WHERE Id_reserva = ? """, (Id_reserva,))

    existente = cursor.fetchone()

    if not existente:
        conn.close()

        raise HTTPException(status_code=404, detail=f"La reserva Id: {Id_reserva} no fue encontrada.")

    try:

        cursor.execute(
            """ UPDATE Reserva SET Id_Usuario = ?, Platos = ?, Fecha = ?, Hora = ?, Lugar = ?, Estado = ? WHERE Id_reserva = ? """,
            (item.Id_Usuario,item.Platos, item.Fecha, item.Hora, item.Lugar, item.Estado, Id_reserva)
        )

        conn.commit()

        return {
            "mensaje": f"Los datos de la reserva {Id_reserva} fueron actualizados correctamente."
        }

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al modificar la reserva: {str(e)}")

    finally:
        conn.close()


# --- Eliminar reserva ---
@router.delete("/Delete")
def eliminar_reserva(Id_reserva: int):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que la reserva exista
        cursor.execute(""" SELECT Id_reserva FROM Reserva WHERE Id_reserva = ? """, (Id_reserva,))

        reserva = cursor.fetchone()

        if not reserva:
            raise HTTPException(status_code=404, detail=f"La reserva {Id_reserva} no fue encontrada." )

        # Verificar si la reserva tiene una transacción asociada
        cursor.execute(
            """ SELECT Id_Transaccion FROM Transaccion WHERE Id_reserva = ?  """, (Id_reserva,))

        transaccion = cursor.fetchone()

        if transaccion:
            raise HTTPException(status_code=400, detail=f"No se puede eliminar la reserva {Id_reserva} porque tiene una transacción asociada.")

        # Eliminar la reserva
        cursor.execute( """ DELETE FROM Reserva WHERE Id_reserva = ? """, (Id_reserva,))

        conn.commit()

        return {
            "mensaje": f"La reserva {Id_reserva} fue eliminada del sistema."
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al eliminar la reserva: {str(e)}")

    finally:
        conn.close()

# --- Caso de Uso: Consulta de reservas ---
@router.get("/Consulta")
def consulta_reservas(
    Id_Usuario: str,
    Estado: int,
    FechaDesde: str | None = None,
    FechaHasta: str | None = None,
    Platos: str | None = None,
    Lugar: str | None = None
):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Filtros obligatorios
        sql = """ SELECT Id_Transaccion, Id_reserva, Id_Usuario, Platos, Fecha, Hora, Lugar, Estado FROM Reserva WHERE Id_Usuario = ? AND Estado = ? """

        parametros = [Id_Usuario, Estado]

        # Filtros opcionales
        if FechaDesde is not None:
            sql += " AND Fecha >= ?"
            parametros.append(FechaDesde)

        if FechaHasta is not None:
            sql += " AND Fecha <= ?"
            parametros.append(FechaHasta)

        if Platos is not None:
            sql += " AND Platos = ?"
            parametros.append(Platos)

        if Lugar is not None:
            sql += " AND Lugar = ?"
            parametros.append(Lugar)

        sql += " ORDER BY Fecha ASC, Hora ASC"

        cursor.execute(sql, parametros)

        rows = cursor.fetchall()

        return [
            {
                "Id_Transaccion": r[0],
                "Id_reserva": r[1],
                "Id_Usuario": r[2],
                "Platos": r[3],
                "Fecha": r[4],
                "Hora": r[5],
                "Lugar": r[6],
                "Estado": r[7]
            }
            for r in rows
        ]

    except Exception as e:

        raise HTTPException( status_code=500, detail=f"Error al realizar la consulta: {str(e)}")

    finally:
        conn.close()