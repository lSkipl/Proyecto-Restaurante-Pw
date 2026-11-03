const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  const form = document.getElementById("form-consultar");
  const btnConsultar = document.getElementById("btn-consultar");
  const contenedorResultados = document.getElementById("contenedor-resultados");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const codigo = document.getElementById("codigo").value.trim();
      const identificador = document.getElementById("identificador").value.trim();

      if (!identificador) {
        alert("Por favor ingresa tu identificador del cliente (RUT).");
        return;
      }

      btnConsultar.disabled = true;
      btnConsultar.textContent = "Consultando...";
      contenedorResultados.innerHTML = "";

      try {
        const respuesta = await fetch(`${API_URL}/Reservas/Consultar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            codigo: codigo ? codigo : null,
            identificador: identificador
          })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
          alert(data.detail || "No se encontraron reservas.");
          return;
        }

        const lista = Array.isArray(data) ? data : [data];

        // Dibuja una tarjeta por cada reserva encontrada
        lista.forEach(reserva => {
          const card = crearTarjetaReserva(reserva);
          contenedorResultados.appendChild(card);
        });

        if (window.lucide) {
          lucide.createIcons();
        }

        contenedorResultados.scrollIntoView({ behavior: "smooth" });

      } catch (error) {
        console.error("Error al consultar reservas:", error);
        alert("Error de conexión al consultar. Comprueba el estado del backend y ngrok.");
      } finally {
        btnConsultar.disabled = false;
        btnConsultar.innerHTML = `Consultar reserva <i data-lucide="search" class="icon-sm"></i>`;
        if (window.lucide) {
          lucide.createIcons();
        }
      }
    });
  }
});

// Función constructora para cada tarjeta de reserva encontrada
function crearTarjetaReserva(reserva) {
  const card = document.createElement("section");
  card.className = "card result-card";

  // Determinar clases y colores de badge
  const st = (reserva.estado || "").toLowerCase();
  let badgeClase = "status-pendiente";
  if (st.includes("aprobada") || st.includes("confirmada")) {
    badgeClase = "status-aprobada";
  } else if (st.includes("rechazada") || st.includes("cancelada")) {
    badgeClase = "status-rechazada";
  }

  // Comprobar estado del pago
  const esPagado = (reserva.estado_pago || "").toLowerCase().includes("pagado");
  const pagoClase = esPagado ? "pill-payment pagado" : "pill-payment";
  const textoBotonPago = esPagado ? "Pago completado" : "Registrar pago simulado";


  const precioFinal = (reserva.total && reserva.total !== "$0" && reserva.total !== "0")
    ? reserva.total
    : "$9.990";

  card.innerHTML = `
    <div class="result-header">
      <div>
        <span class="res-tag" style="font-family: monospace; font-size: 0.85rem; word-break: break-all;">
          CÓDIGO: ${reserva.codigo}
        </span>
        <h2 class="res-title">Tu reserva</h2>
      </div>
      <div>
        <span class="badge-status ${badgeClase}">
          <span class="dot">●</span> <span>${reserva.estado}</span>
        </span>
      </div>
    </div>

    <div class="result-grid">
      <div class="result-item">
        <i data-lucide="calendar" class="result-icon"></i>
        <div>
          <span class="item-label">Fecha</span>
          <strong class="item-value">${reserva.fecha}</strong>
        </div>
      </div>

      <div class="result-item">
        <i data-lucide="clock" class="result-icon"></i>
        <div>
          <span class="item-label">Hora</span>
          <strong class="item-value">${reserva.hora}</strong>
        </div>
      </div>

      <div class="result-item">
        <i data-lucide="utensils" class="result-icon"></i>
        <div>
          <span class="item-label">Plato</span>
          <strong class="item-value">${reserva.plato}</strong>
        </div>
      </div>

      <div class="result-item">
        <i data-lucide="home" class="result-icon"></i>
        <div>
          <span class="item-label">Lugar</span>
          <strong class="item-value">${reserva.lugar}</strong>
        </div>
      </div>
    </div>

    <div class="result-footer">
      <div class="payment-status-wrapper">
        <span class="item-label" style="display:inline-block; margin-right: 0.5rem;">Estado del pago</span>
        <span class="pill-pago-dinamico ${pagoClase}">
          <span class="dot">●</span> <span class="texto-pago">${reserva.estado_pago}</span>
        </span>
      </div>

      <div class="payment-action-wrapper">
        <span class="res-price">${precioFinal}</span>
        <button type="button" class="btn-pay btn-pago-dinamico" ${esPagado ? "disabled" : ""}>
          ${textoBotonPago}
        </button>
      </div>
    </div>
  `;

  // Listener para el pago simulado de esta tarjeta en específico
  const btnPagar = card.querySelector(".btn-pago-dinamico");
  const pillPago = card.querySelector(".pill-pago-dinamico");
  const textoPago = card.querySelector(".texto-pago");

  btnPagar.addEventListener("click", async () => {
    btnPagar.disabled = true;
    btnPagar.textContent = "Procesando...";

    try {
      const res = await fetch(`${API_URL}/Reservas/RegistrarPago`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ codigo: reserva.codigo })
      });

      if (res.ok) {
        alert(`¡Pago simulado registrado con éxito para la reserva ${reserva.codigo}!`);
        pillPago.className = "pill-pago-dinamico pill-payment pagado";
        textoPago.textContent = "Pagado";
        btnPagar.textContent = "Pago completado";
      } else {
        alert("No se pudo procesar el pago.");
        btnPagar.disabled = false;
        btnPagar.textContent = "Registrar pago simulado";
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al registrar pago.");
      btnPagar.disabled = false;
      btnPagar.textContent = "Registrar pago simulado";
    }
  });

  return card;
}