# Proyecto-Restaurante-Pw

# Que Falta?:
1- Falta Hacer Nuevos diagramas, Modelo Relacional y Modela Entidad Relacion (Yo voy a hacer el diccionario de datos) Recordar (que son las FK y Pk)
Adjunto imagen de la BD. 
<img width="370" height="567" alt="image" src="https://github.com/user-attachments/assets/fbf54e23-8ee5-47cf-a890-7c89de1e9948" />

2- Cambiar un poco el Diagrama de Casos de Uso

3- Busca Por que elegimos ese API (FastApi)

4- Buscar Por que decidimos Usar Ngrok para el host

5- redactar bien el informe

6- Hacer los cambios al informe segun nos dijo el profe en la primera entrega

7- trata de usar el back-end Hacer pruebas, te lo encargo, si no sabes que hace revisa los comentarios del código y ve el CODIGO, me encargue de dejarlo comentado

De momento es lo que se me ocurre de lo que hay que hacer


# Para poder utilizar el programa primero debemos instalar lo necesario
1- pip install sqlalchemy

2- pip install "fastapi[standard]"

3- por si acaso actualizar python

4- winget install ngrok -s msstore (instalar ngrok)  puedes verifcar la version con ngrok version

6- loguear ngrok ngrok config add-authtoken "TU_TOKEN"

y eso seria lo inicial.
# Para poder ejecutar el programa

1- Asegurarse que la carpeta en la que estas es en backend cd "Proyecto Restaurante\backend"

2- una vez estado en esa carpeta ejecutar "python -m uvicorn main:app --reload" (con esto levantaras de forma local el back-end)

3- en otra consola (pestaña) ejecutas "ngrok http 8000" con esto levantaras la pagina

4- en la pestaña donde ejecutas el ngrok veras algo asi "Forwarding    https://xxxxx.ngrok-free.app -> http://localhost:8000" basicamente ocupamos la direccion https://xxxxx.ngrok-free.app

5- muy importante al url que nos dio debemos modificarlo un poco https://xxxxx.ngrok-free.app/docs y listo
