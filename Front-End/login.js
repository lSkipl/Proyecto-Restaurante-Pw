// Front-End/login.js

// URL base del backend en ngrok
const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const toggle = document.getElementById("toggle-password");
const message = document.getElementById("form-message");
const submitBtn = form?.querySelector('button[type="submit"]');

// 1. Alternar visualización de contraseña (ver / ocultar)
if (toggle && password) {
  toggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!visible));
    toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });
}

// 2. Cargar credenciales de demostración desde los botones
document.querySelectorAll(".demo-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (email) email.value = btn.dataset.email;
    if (password) password.value = "alamos123";
    if (message) {
      message.textContent = "";
      message.className = "form-message";
    }
  });
});

// 3. Envío del formulario y autenticación contra el backend
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correoIngresado = email.value.trim();
    const claveIngresada = password.value.trim();

    // Validación básica de campos vacíos
    if (!correoIngresado || !claveIngresada) {
      message.textContent = "Completa tu correo y contraseña.";
      message.className = "form-message is-error";
      return;
    }

    message.textContent = "Validando credenciales...";
    message.className = "form-message is-info";
    if (submitBtn) submitBtn.disabled = true;

    try {
      // Petición apuntando directamente al túnel de ngrok
      const respuesta = await fetch(`${API_URL}/Trabajadores/Login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          Correo: correoIngresado,
          Clave: claveIngresada
        })
      });

      const data = await respuesta.json();

      // Credenciales inválidas (401)
      if (respuesta.status === 401) {
        message.textContent = data.detail || "Correo o contraseña incorrectos.";
        message.className = "form-message is-error";
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      if (!respuesta.ok) {
        throw new Error(data.detail || "Error en el servidor al autenticar.");
      }

      // Se guarda bajo ambas claves para compatibilidad total con Horarios y Reservas
      sessionStorage.setItem("usuario", JSON.stringify(data.usuario));
      sessionStorage.setItem("usuario_sesion", JSON.stringify(data.usuario));
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      message.textContent = `¡Bienvenido, ${data.usuario.Nombre}! Redirigiendo...`;
      message.className = "form-message is-success";

      // Evaluar cargo y redirigir
      const cargo = (data.usuario.Cargo || "").toLowerCase();

      setTimeout(() => {
        if (cargo.includes("admin")) {
          // Administrador: redirige a la vista de gestión de reservas
          window.location.href = "reservas.html";
        } else {
          // Garzón, Cocinero o personal: redirige a sus turnos y horarios
          window.location.href = "horarios.html";
        }
      }, 700);

    } catch (err) {
      console.error("Error al autenticar:", err);
      message.textContent = "No se pudo conectar con el servidor.";
      message.className = "form-message is-error";
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}