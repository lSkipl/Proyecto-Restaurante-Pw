// ==========================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ==========================================
const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

let listaReservas = []; // Copia original traída desde MongoDB

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Validar sesión activa
  const rawSesion = sessionStorage.getItem("usuario") 
                 || sessionStorage.getItem("usuario_sesion")
                 || localStorage.getItem("usuario");

  if (!rawSesion) {
    window.location.href = "login.html";
    return;
  }

  const sesion = JSON.parse(rawSesion);
  const usuario = sesion.usuario || sesion;

  // Personalizar botón de cerrar sesión
  const btnCerrar = document.getElementById("btnCerrarSesion") 
                 || document.querySelector(".btn-logout")
                 || document.querySelector("a[href*='login']");
  if (btnCerrar) {
    btnCerrar.textContent = `Cerrar sesión (${usuario.Nombre || "Usuario"})`;
    btnCerrar.onclick = (e) => {
      e.preventDefault();
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }

  // 2. Asociar eventos a los filtros
  configurarFiltros();

  // 3. Cargar reservas desde el backend
  await obtenerReservas();
});

// ==========================================
// PETICIONES AL BACKEND
// ==========================================
async function obtenerReservas() {
  const tbody = document.querySelector("table tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">Cargando reservas...</td></tr>`;
  }

  try {
    const res = await fetch(`${API_URL}/Reservas/Listar`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) throw new Error("Error al obtener reservas");

    listaReservas = await res.json();
    
    // Actualizar métricas superiores (Hoy, Pendientes, etc.)
    actualizarMetricas(listaReservas);

    // Renderizar tabla completa inicialmente
    aplicarFiltros();

  } catch (error) {
    console.error("Error al listar reservas:", error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red; padding: 2rem;">No se pudo conectar con el servidor.</td></tr>`;
    }
  }
}

// ==========================================
// RENDERIZADO DE TABLA Y BADGES
// ==========================================
function renderizarTabla(reservas) {
  const tbody = document.querySelector("table tbody");
  const contadorTexto = document.querySelector(".card-header span, .solicitudes-count") 
                     || document.querySelector("section p, h2 + p");

  // Actualizar contador ("X resultados")
  document.querySelectorAll("p, span").forEach(el => {
    if (el.textContent.includes("resultados")) {
      el.textContent = `${reservas.length} resultados`;
    }
  });

  if (!tbody) return;
  tbody.innerHTML = "";

  if (reservas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
          No se encontraron reservas con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  reservas.forEach(r => {
    const estado = (r.status || r.Estado || "Pendiente").trim();
    const estadoLower = estado.toLowerCase();

    // Determinar la clase CSS según el estado
    let claseColor = "status-pendiente";
    if (estadoLower.includes("aprobada") || estadoLower.includes("confirmada")) {
      claseColor = "status-aprobada";
    } else if (estadoLower.includes("rechazada") || estadoLower.includes("cancelada")) {
      claseColor = "status-rechazada";
    }

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f0f0f0";

    tr.innerHTML = `
      <td style="padding: 1rem 0.75rem; font-family: monospace; font-size: 0.85rem; color: #555;">${r.code || r.Codigo}</td>
      <td style="padding: 1rem 0.75rem; font-weight: 500;">${r.client || r.Cliente}</td>
      <td style="padding: 1rem 0.75rem;">${r.date || r.Fecha}</td>
      <td style="padding: 1rem 0.75rem;">${r.time || r.Hora}</td>
      <td style="padding: 1rem 0.75rem;">${r.table || r.Lugar}</td>
      <td style="padding: 1rem 0.75rem;">
        <span class="badge-status ${claseColor}">${estado}</span>
      </td>
      <td style="padding: 1rem 0.75rem; white-space: nowrap;">
        <button type="button" onclick="cambiarEstado('${r.code || r.Codigo}', '${estadoLower.includes("aprobada") ? "rechazada" : "aprobada"}')" 
                style="background: none; border: none; color: #2e7d32; cursor: pointer; font-size: 0.85rem; margin-right: 0.5rem; text-decoration: underline;">
          ${estadoLower.includes("aprobada") ? "Rechazar" : "Aprobar"}
        </button>
        <button type="button" onclick="eliminarReserva('${r.code || r.Codigo}')" title="Eliminar" 
                style="background: none; border: none; cursor: pointer; color: #c62828;">
          🗑️
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ==========================================
// LÓGICA DE FILTRADO (ESTADO Y FECHA)
// ==========================================
function configurarFiltros() {
  // Buscar inputs de fecha y selector de estado
  const inputFecha = document.querySelector("input[type='date']");
  const selectEstado = document.querySelector("select");

  if (inputFecha) {
    inputFecha.addEventListener("change", aplicarFiltros);
    inputFecha.addEventListener("input", aplicarFiltros);
  }

  if (selectEstado) {
    selectEstado.addEventListener("change", aplicarFiltros);
  }
}

function aplicarFiltros() {
  const inputFecha = document.querySelector("input[type='date']");
  const selectEstado = document.querySelector("select");

  const fechaFiltro = inputFecha ? inputFecha.value : ""; // Viene en "YYYY-MM-DD"
  const estadoFiltro = selectEstado ? selectEstado.value.toLowerCase().trim() : "todos";

  const filtradas = listaReservas.filter(r => {
    // 1. Filtrar por Estado
    const estadoReserva = (r.status || r.Estado || "").toLowerCase();
    let coincideEstado = true;

    if (estadoFiltro !== "todos" && estadoFiltro !== "") {
      coincideEstado = estadoReserva.includes(estadoFiltro);
    }

    // 2. Filtrar por Fecha
    let coincideFecha = true;
    if (fechaFiltro) {
      const fechaReserva = (r.date || r.Fecha || "").trim();
      coincideFecha = normalizarYCompararFechas(fechaFiltro, fechaReserva);
    }

    return coincideEstado && coincideFecha;
  });

  renderizarTabla(filtradas);
}

// Convierte fechas tanto ISO (2026-10-01) como texto ("1 oct 2026") para compararlas
function normalizarYCompararFechas(fechaInput, fechaReserva) {
  // Si coinciden directamente como string
  if (fechaInput === fechaReserva) return true;

  // Si fechaReserva viene como "YYYY-MM-DD"
  if (fechaReserva.startsWith(fechaInput)) return true;

  // Meses en español
  const meses = {
    "ene": "01", "feb": "02", "mar": "03", "abr": "04",
    "may": "05", "jun": "06", "jul": "07", "ago": "08",
    "sep": "09", "oct": "10", "nov": "11", "dic": "12"
  };

  // Desglosar "1 oct 2026"
  const partes = fechaReserva.toLowerCase().split(" ");
  if (partes.length >= 3) {
    const dia = partes[0].padStart(2, "0");
    const mes = meses[partes[1].substring(0, 3)] || "00";
    const anio = partes[2];
    const fechaReservaFormato = `${anio}-${mes}-${dia}`;
    return fechaReservaFormato === fechaInput;
  }

  return false;
}

// ==========================================
// ACCIONES: CAMBIAR ESTADO Y ELIMINAR
// ==========================================
window.cambiarEstado = async function(idReserva, nuevoEstado) {
  try {
    const res = await fetch(`${API_URL}/Reservas/Estado/${idReserva}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ Estado: nuevoEstado })
    });

    if (res.ok) {
      await obtenerReservas();
    } else {
      alert("No se pudo actualizar el estado.");
    }
  } catch (e) {
    console.error("Error al actualizar estado:", e);
  }
};

window.eliminarReserva = async function(idReserva) {
  if (!confirm("¿Seguro que deseas eliminar esta reserva?")) return;

  try {
    const res = await fetch(`${API_URL}/Reservas/Delete/${idReserva}`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (res.ok) {
      await obtenerReservas();
    } else {
      alert("No se pudo eliminar la reserva.");
    }
  } catch (e) {
    console.error("Error al eliminar:", e);
  }
};

function actualizarMetricas(reservas) {
  let aprobadas = 0;
  let pendientes = 0;

  reservas.forEach(r => {
    const st = (r.status || r.Estado || "").toLowerCase();
    if (st.includes("aprobada")) aprobadas++;
    if (st.includes("pendiente")) pendientes++;
  });

  const elPendientes = document.querySelector(".card:nth-child(2) h3, .card:nth-child(2) div");
  document.querySelectorAll("div, p").forEach(el => {
    if (el.textContent.trim() === "Requieren revisión") {
      const h = el.previousElementSibling;
      if (h) h.textContent = pendientes;
    }
  });
}