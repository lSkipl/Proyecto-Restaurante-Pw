import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE = os.path.join(BASE_DIR, "Restaurante.sqlite")


def get_connection():
    conn = sqlite3.connect(DATABASE)
    return conn
