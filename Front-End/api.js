const BASE_URL = "https://olive-stood-quizzical.ngrok-free.dev";


const headersComunes = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true"
};


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