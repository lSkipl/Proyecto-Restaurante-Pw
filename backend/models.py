from pydantic import BaseModel

class UsuarioIn(BaseModel):
    Id_Usuario: str
    Nombre: str
    Apellido: str
    Contacto: str

class TrabajadorIn(BaseModel):
    Nombre: str
    Apellido: str
    Contacto: str
    Id_Trabajador: str
    Clave: str
    Correo: str
    Cargo: str

class MenuIn(BaseModel):
    Platos: str
    Descripcion: str | None = None
    Precio: int

class ReservaIn(BaseModel):
    Id_Usuario: str
    Platos: str
    Fecha: str
    Hora: str
    Lugar: str
    Estado: int

class TransaccionIn(BaseModel):
    Monto: int
    Id_Usuario: str
    Id_reserva: int