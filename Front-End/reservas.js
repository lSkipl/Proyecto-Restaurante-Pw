const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

let listaReservas = []; 

document.addEventListener("DOMContentLoaded", async () => {
  const rawSesion = sessionStorage.getItem("usuario") 
                 || sessionStorage.getItem("usuario_sesion")
                 || localStorage.getItem("usuario");

  if (!rawSesion) {
    window.location.href = "login.html";
    return;
  }

  const sesion = JSON.parse(rawSesion);
  const usuario = sesion.usuario || sesion;

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

  configurarFiltros();
  await obtenerReservas();
});

async function obtenerReservas() {
  const tbody = document.querySelector("table tbody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="col-datos">Cargando reservas...</td></tr>`;
  }

  try {
    const res = await fetch(`${API_URL}/Reservas/Listar`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) throw new Error("Error al obtener reservas");

    listaReservas = await res.json();
    actualizarMetricas(listaReservas);
    aplicarFiltros();

  } catch (error) {
    console.error("Error al listar reservas:", error);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="col-datos">No se pudo conectar con el servidor.</td></tr>`;
    }
  }
}

function renderizarTabla(reservas) {
  const tbody = document.querySelector("table tbody");
  const contadorTexto = document.getElementById("results-count") 
                     || document.querySelector(".card-header span, .solicitudes-count") 
                     || document.querySelector("section p, h2 + p");

  if (contadorTexto) {
    contadorTexto.textContent = `${reservas.length} solicitudes encontradas`;
  }

  if (!tbody) return;
  tbody.innerHTML = "";

  if (reservas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="col-datos">
          No se encontraron reservas con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  reservas.forEach((r, index) => {
    const estado = (r.status || r.Estado || "Pendiente").trim();
    const estadoLower = estado.toLowerCase();

    let claseColor = "status-pendiente";
    if (estadoLower.includes("aprobada") || estadoLower.includes("confirmada")) {
      claseColor = "status-aprobada";
    } else if (estadoLower.includes("rechazada") || estadoLower.includes("cancelada")) {
      claseColor = "status-rechazada";
    }

    const tr = document.createElement("tr");
    tr.className = "fila-reserva";

    const codigo = r.code || r.Codigo;
    const cliente = r.client || r.Cliente;

    tr.innerHTML = `
      <td class="col-codigo">${codigo}</td>
      <td class="col-datos">
        <span class="cliente-link" onclick="abrirModalCliente(${index})" title="Ver información del cliente">
          ${cliente} ℹ️
        </span>
      </td>
      <td class="col-datos">${r.date || r.Fecha}</td>
      <td class="col-datos">${r.time || r.Hora}</td>
      <td class="col-datos">${r.table || r.Lugar}</td>
      <td class="col-datos">
        <span class="badge-status ${claseColor}">${estado}</span>
      </td>
      <td class="col-acciones">
        <button type="button" class="btn-accion-estado" onclick="cambiarEstado('${codigo}', '${estadoLower.includes("aprobada") ? "rechazada" : "aprobada"}')">
          ${estadoLower.includes("aprobada") ? "Rechazar" : "Aprobar"}
        </button>
        <button type="button" class="btn-accion-eliminar" onclick="eliminarReserva('${codigo}')" title="Eliminar">
          🗑️
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

window.abrirModalCliente = function(index) {
  const r = listaReservas[index];
  if (!r) return;

  const modal = document.getElementById("modal-cliente");
  if (!modal) return;

  document.getElementById("modal-nombre").textContent = r.client || r.Cliente || "No especificado";
  document.getElementById("modal-rut").textContent = r.rut || "No registrado";
  document.getElementById("modal-telefono").textContent = r.phone || r.contacto || "Sin contacto";
  document.getElementById("modal-mesa").textContent = r.table || r.Lugar || "-";
  
  const platoTexto = (r.notes || r.Platos || "").replace("Platos: ", "").replace("Plato: ", "") || "Sin plato";
  document.getElementById("modal-plato").textContent = platoTexto;
  
  document.getElementById("modal-pago").textContent = r.payment_status || r.estado_pago || "Pago no registrado";
  document.getElementById("modal-total").textContent = r.total || "$0";

  modal.style.display = "flex";
};

window.cerrarModalCliente = function() {
  const modal = document.getElementById("modal-cliente");
  if (modal) modal.style.display = "none";
};

window.onclick = function(event) {
  const modal = document.getElementById("modal-cliente");
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

function configurarFiltros() {
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

  const fechaFiltro = inputFecha ? inputFecha.value : "";
  const estadoFiltro = selectEstado ? selectEstado.value.toLowerCase().trim() : "todos";

  const filtradas = listaReservas.filter(r => {
    const estadoReserva = (r.status || r.Estado || "").toLowerCase();
    let coincideEstado = true;

    if (estadoFiltro !== "todos" && estadoFiltro !== "") {
      coincideEstado = estadoReserva.includes(estadoFiltro);
    }

    let coincideFecha = true;
    if (fechaFiltro) {
      const fechaReserva = (r.date || r.Fecha || "").trim();
      coincideFecha = normalizarYCompararFechas(fechaFiltro, fechaReserva);
    }

    return coincideEstado && coincideFecha;
  });

  renderizarTabla(filtradas);
}

function normalizarYCompararFechas(fechaInput, fechaReserva) {
  if (fechaInput === fechaReserva) return true;
  if (fechaReserva.startsWith(fechaInput)) return true;

  const meses = {
    "ene": "01", "feb": "02", "mar": "03", "abr": "04",
    "may": "05", "jun": "06", "jul": "07", "ago": "08",
    "sep": "09", "oct": "10", "nov": "11", "dic": "12"
  };

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
  const hoyStr = new Date().toISOString().split("T")[0];
  let aprobadas = 0;
  let pendientes = 0;
  let reservasHoy = 0;

  reservas.forEach(r => {
    const st = (r.status || r.Estado || "").toLowerCase();
    const fecha = r.date || r.Fecha || "";
    if (fecha.startsWith(hoyStr)) reservasHoy++;
    if (st.includes("aprobada")) aprobadas++;
    if (st.includes("pendiente")) pendientes++;
  });

  const statToday = document.getElementById("stat-today");
  const statApproved = document.getElementById("stat-approved");
  const statPending = document.getElementById("stat-pending");

  if (statToday) statToday.textContent = reservasHoy;
  if (statApproved) statApproved.textContent = `${aprobadas} aprobadas`;
  if (statPending) statPending.textContent = pendientes;
}