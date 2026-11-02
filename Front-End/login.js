const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const toggle = document.getElementById("toggle-password");
const message = document.getElementById("form-message");
const submitBtn = form?.querySelector('button[type="submit"]');


if (toggle && password) {
  toggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!visible));
    toggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  });
}


if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correoIngresado = email ? email.value.trim() : "";
    const claveIngresada = password ? password.value.trim() : "";


    if (!correoIngresado || !claveIngresada) {
      if (message) {
        message.textContent = "Completa tu correo y contraseña.";
        message.className = "form-message is-error";
      }
      return;
    }

    if (message) {
      message.textContent = "Validando credenciales...";
      message.className = "form-message is-info";
    }
    if (submitBtn) submitBtn.disabled = true;

    try {
   
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

    
      if (respuesta.status === 401) {
        if (message) {
          message.textContent = data.detail || "Correo o contraseña incorrectos.";
          message.className = "form-message is-error";
        }
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      if (!respuesta.ok) {
        throw new Error(data.detail || "Error en el servidor al autenticar.");
      }

     
      sessionStorage.setItem("usuario", JSON.stringify(data.usuario));
      sessionStorage.setItem("usuario_sesion", JSON.stringify(data.usuario));
      localStorage.setItem("usuario", JSON.stringify(data.usuario));

      if (message) {
        message.textContent = `¡Bienvenido, ${data.usuario.Nombre}! Redirigiendo...`;
        message.className = "form-message is-success";
      }

 
      const cargo = (data.usuario.Cargo || "").toLowerCase();

      setTimeout(() => {
        if (cargo.includes("admin")) {
      
          window.location.href = "reservas.html";
        } else {
    
          window.location.href = "horarios.html";
        }
      }, 700);

    } catch (err) {
      console.error("Error al autenticar:", err);
      if (message) {
        message.textContent = "No se pudo conectar con el servidor.";
        message.className = "form-message is-error";
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}