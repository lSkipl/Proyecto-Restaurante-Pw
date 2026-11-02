// ==========================================
// CONFIGURACIÓN DE CONEXIÓN
// ==========================================
const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

// Catálogo de platos para actualizar el resumen visual interactivo
const PLATOS_INFO = {
  "Risotto de champiñones": {
    precio: "$12.500",
    desc: "Arroz arbóreo, mix de hongos, parmesano y aceite de hierbas."
  },
  "Salmón a la plancha": {
    precio: "$14.900",
    desc: "Filete de salmón fresco con vegetales salteados y reducción de cítricos."
  },
  "Pastel de choclo": {
    precio: "$11.000",
    desc: "Receta tradicional chilena con pino de carne, pollo y pasta de choclo gratinada."
  },
  "Ensalada de estación": {
    precio: "$8.500",
    desc: "Mix de hojas verdes, tomates cherry, palta, frutos secos y vinagreta balsámica."
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".reserve-form");
  const inputFecha = document.getElementById("fecha");
  const selectPlato = document.getElementById("plato");
  const submitBtn = form?.querySelector('button[type="submit"]');

  // 1. Evitar que seleccionen fechas anteriores a la de hoy
  if (inputFecha) {
    const hoy = new Date().toISOString().split("T")[0];
    inputFecha.min = hoy;
  }

  // 2. Sincronizar el plato seleccionado con la tarjeta de resumen derecha
  if (selectPlato) {
    selectPlato.addEventListener("change", (e) => {
      const platoElegido = e.target.value;
      const info = PLATOS_INFO[platoElegido];

      const summaryTitle = document.getElementById("summary-title");
      const summaryDesc = document.querySelector(".summary-desc");
      const summaryPrice = document.querySelector(".summary-price dd");

      if (info) {
        if (summaryTitle) summaryTitle.textContent = platoElegido;
        if (summaryDesc) summaryDesc.textContent = info.desc;
        if (summaryPrice) summaryPrice.textContent = info.precio;
      }
    });
  }

  // 3. Envío y validación del formulario de reserva
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre")?.value.trim() || "";
      const apellido = document.getElementById("apellido")?.value.trim() || "";
      const identificador = document.getElementById("identificador")?.value.trim() || "";
      const telefono = document.getElementById("telefono")?.value.trim() || "";
      const fecha = document.getElementById("fecha")?.value || "";
      const hora = document.getElementById("hora")?.value || "";
      const plato = document.getElementById("plato")?.value || "Sin plato";
      const lugar = document.getElementById("lugar")?.value || "";

      // Comprobación de campos obligatorios
      if (!nombre || !apellido || !identificador || !telefono || !fecha || !hora || !lugar) {
        alert("Por favor completa todos los campos del formulario antes de continuar.");
        return;
      }

      // Estado de carga en el botón
      const textoOriginal = submitBtn ? submitBtn.innerHTML : "Solicitar reserva";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Verificando disponibilidad...";
      }

      try {
        const respuesta = await fetch(`${API_URL}/Reservas/Crear`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            nombre: nombre,
            apellido: apellido,
            identificador: identificador,
            telefono: telefono,
            fecha: fecha,
            hora: hora,
            plato: plato,
            lugar: lugar
          })
        });

        const data = await respuesta.json();

        // Caso: Colisión de disponibilidad (Código 409 Conflict)
        if (respuesta.status === 409) {
          alert(`⚠️ No disponible:\n${data.detail}\nPor favor elige otra hora o lugar.`);
          return;
        }

        // Otros errores del servidor
        if (!respuesta.ok) {
          throw new Error(data.detail || "Error en el servidor al registrar la reserva.");
        }

        // Caso: Éxito
        alert(
          `✅ ¡Solicitud enviada con éxito!\n\n` +
          `Cliente: ${nombre} ${apellido}\n` +
          `Lugar: ${lugar}\n` +
          `Horario: ${fecha} a las ${hora}\n` +
          `Código de seguimiento: ${data.codigo}\n\n` +
          `Tu reserva quedó en estado pendiente de aprobación.`
        );

        form.reset();

        // Restablecer valores de resumen iniciales
        if (inputFecha) {
          const hoy = new Date().toISOString().split("T")[0];
          inputFecha.min = hoy;
        }

      } catch (err) {
        console.error("Error al procesar reserva:", err);
        alert("Ocurrió un error al intentar registrar la reserva. Comprueba si el servidor está encendido.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = textoOriginal;
        }
      }
    });
  }
});