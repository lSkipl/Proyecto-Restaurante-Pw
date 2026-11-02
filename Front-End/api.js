const BASE_URL = "https://olive-stood-quizzical.ngrok-free.dev";

// Encabezados base requeridos (incluye el bypass para la advertencia de ngrok)
const headersComunes = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true"
};

// Función para obtener la lista del menú
async function obtenerPlatos() {
  try {
    const respuesta = await fetch(`${BASE_URL}/menu`, { 
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