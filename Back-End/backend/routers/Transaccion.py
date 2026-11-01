from fastapi import APIRouter, HTTPException
from database import get_connection
from models import TransaccionIn

router = APIRouter(prefix="/Transacciones", tags=["Transacciones"])


# --- Realizar transacción ---
@router.post("/Realizar")
def realizar_transaccion(item: TransaccionIn):

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # Verificar que el usuario exista
        cursor.execute(""" SELECT Id_Usuario FROM Usuario WHERE Id_Usuario = ? """, (item.Id_Usuario,))

        usuario = cursor.fetchone()

        if not usuario:
            raise HTTPException(status_code=404, detail=f"El usuario {item.Id_Usuario} no existe.")

        # Verificar que la reserva exista
        cursor.execute(""" SELECT Id_reserva, Id_Usuario FROM Reserva WHERE Id_reserva = ? """, (item.Id_reserva,))

        reserva = cursor.fetchone()

        if not reserva:
            raise HTTPException(status_code=404, detail=f"La reserva {item.Id_reserva} no existe.")

        # Verificar que la reserva pertenezca al usuario
        if reserva[1] != item.Id_Usuario:
            raise HTTPException(status_code=400, detail="La reserva no pertenece al usuario indicado.")

        #Verificar si existe una transaccion asociada a la reserva
        cursor.execute(""" SELECT Id_Transaccion FROM Reserva WHERE Id_reserva = ? """, (item.Id_reserva,))


        transaccion = cursor.fetchone()
        
        if transaccion and transaccion[0] is not None:
            raise HTTPException(status_code=400,detail=f"La reserva {item.Id_reserva} ya tiene una transacción asociada."
    )


        # Crear la transacción
        cursor.execute(
            """ INSERT INTO Transaccion (Monto, Id_Usuario, Id_reserva) VALUES (?, ?, ?) """,
            (item.Monto, item.Id_Usuario, item.Id_reserva)
        )
        id_transaccion = cursor.lastrowid

        # Asociar la transacción a la reserva
        cursor.execute(""" UPDATE Reserva SET Id_Transaccion = ? WHERE Id_reserva = ? """,
            (id_transaccion, item.Id_reserva)
        )

        conn.commit()

        return {
            "mensaje": "Transacción realizada correctamente.",
            "Id_Transaccion": id_transaccion,
            "Id_Usuario": item.Id_Usuario,
            "Id_reserva": item.Id_reserva,
            "Monto": item.Monto
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()

        raise HTTPException(status_code=500, detail=f"Error al realizar la transacción: {str(e)}")

    finally:
        conn.close()