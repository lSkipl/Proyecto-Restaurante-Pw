from pydantic import BaseModel

class UsuarioIn(BaseModel):
    Id_Usuario: str
    Nombre: str
    Apellido: str
    Contacto: str

class TrabajadorIn(BaseModel):
    Id_trabajador: str
    Clave: str
    Correo: str
    Cargo: str

class MenuIn(BaseModel):
    Platos: str
    Descripcion: str | None = None
    Precio: int

class ReservasIn(BaseModel):
    Id_reserva: int
    Id_trabajador: str
    Platos: str
    Fecha: str
    Hora: str
    Lugar: str
    Estado: int
 