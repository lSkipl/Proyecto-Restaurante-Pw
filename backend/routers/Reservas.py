from fastapi import APIRouter, HTTPException
from database import get_connection
from models import ReservaIn

router = APIRouter(prefix="/Reservas", tags=["Reservas"])


# --- Consultar reservas por Id_Usuario ---
@router.get("/")
def obtener_reservas_rut(Id_Usuario: str):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            Id_reserva,
            Id_Usuario,
            Platos,
            Fecha,
            Hora,
            Lugar,
            Estado
        FROM Reserva
        WHERE Id_Usuario = ?
        """,
        (Id_Usuario,)
    )

    rows = cursor.fetchall()

    conn.close()

    return [
        {
            "Id_reserva": r[0],
            "Id_Usuario": r[1],
            "Platos": r[2],
            "Fecha": r[3],
            "Hora": r[4],
            "Lugar": r[5],
            "Estado": r[6]
        }
        for r in rows
    ]
@router.put("/{Id_reserva}")
def Modificar_datos_reserva(Id_reserva: str, item: ReservaIn):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Reserva WHERE Id_reserva = ?", (Id_reserva,))
    existente = cursor.fetchone()

    if not existente:
        conn.close()
        raise HTTPException(status_code=404, detail=f"La reserva Id: {Id_reserva} no fue encontrada.")

    cursor.execute("""
        UPDATE Reserva SET Id_reserva=?, Id_Usuario=?, Platos=?, Fecha=?,
        Hora=?, Lugar=?, Estado=? WHERE Id_reserva=?
    """, (
        item.Id_reserva, item.Id_Usuario, item.Platos, item.Fecha,
        item.Hora, item.Lugar, item.Estado, Id_reserva
    ))
    conn.commit()
    conn.close()
    return {"mensaje": f"Los datos de la reserva {Id_reserva} fueron actualizado correctamente."}


@router.delete("/{Id_reserva}")
def eliminar_reserva(Id_reserva: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM Reserva WHERE Id_reserva = ?", (Id_reserva,))
    conn.commit()
    conn.close()
    return {"mensaje": f"La reserva {Id_reserva} fue eliminada del sistema."}
