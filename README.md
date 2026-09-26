# Proyecto-Restaurante-Pw

Faltan algunas cosas que modificar, agregar en el back-end, mas consultas. 

# ejemplo:
que desde el back-end se puedan agregar usuarios, registrar nuevos trabajadores, poder eliminar reservas, crear nuevos menus entre otras cosas

tambien me dijieron (pepe) que hay que emular como un sistema de pago, osea una nueva entidad.

# Para poder utilizar el programa primero debemos instalar lo necesario
1- pip install sqlalchemy        
2- pip install "fastapi[standard]" 
3- por si acaso actualizar python
4- winget install ngrok -s msstore (instalar ngrok)  puedes verifcar la version con ngrok version
6- loguear ngrok ngrok config add-authtoken "TU_TOKEN"
y eso seria lo inicial.
# Para poder ejecutar el programa
1- Asegurarse que la carpeta en la que estas es en backend cd "Proyecto Restaurante\Back-End\backend"
2- una vez estado en esa carpeta ejecutar "python -m uvicorn main:app --reload" (con esto levantaras de forma local el back-end)
3- en otra consola (pestaña) ejecutas "ngrok http 8000" con esto levantaras la pagina  
4- en la pestaña donde ejecutas el ngrok veras algo asi "Forwarding    https://xxxxx.ngrok-free.app -> http://localhost:8000" basicamente ocupamos la direccion https://xxxxx.ngrok-free.app
5- muy importante al url que nos dio debemos modificarlo un poco https://xxxxx.ngrok-free.app/docs y listo
