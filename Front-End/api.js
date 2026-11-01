// Front-End/api.js

// Si estás usando ngrok, pega tu URL pública aquí. 
// Si estás probando en tu máquina, puedes usar "http://localhost:8000".
const BASE_URL = "https://olive-stood-quizzical.ngrok-free.dev";

// Encabezados base requeridos (incluye el bypass para la advertencia de ngrok)
const headersComunes = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true"
};

// Función para obtener la lista del menú
async function obtenerPlatos() {
  try {
    const respuesta = await fetch(`${BASE_URL}/menu`, { // Cambia /menu si tu ruta es distinta en Menu.py
      method: "GET",
      headers: headersComunes
    });

    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    const platos = await respuesta.json();
    console.log("Platos recibidos del backend:", platos);
    return platos;
  } catch (error) {
    console.error("No se pudo conectar con el backend:", error);
    return [];
  }
}