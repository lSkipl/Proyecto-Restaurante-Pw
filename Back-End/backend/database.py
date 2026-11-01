import os
from pymongo import MongoClient

# URI actualizada con la nueva contraseña
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://ignaciojuanduran_db_user:Alamos12345@cluster0.sz7yxcs.mongodb.net/?retryWrites=true&w=majority"
)

DATABASE_NAME = "alamos_restaurante"

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]

def get_db():
    return db

def get_connection():
    return db