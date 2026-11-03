const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

const DIAS_SEMANA = [
  { key: "Lunes", label: "Lunes" },
  { key: "Martes", label: "Martes" },
  { key: "Miércoles", label: "Miércoles" },
  { key: "Jueves", label: "Jueves" },
  { key: "Viernes", label: "Viernes" },
  { key: "Sábado", label: "Sábado" },
  { key: "Domingo", label: "Domingo" }
];

let turnosActuales = [];
let listaTrabajadores = [];

document.addEventListener("DOMContentLoaded", async () => {
  const rawSesion = sessionStorage.getItem("usuario") 
                 || sessionStorage.getItem("usuario_sesion")
                 || localStorage.getItem("usuario")
                 || localStorage.getItem("usuario_sesion");

  if (!rawSesion || rawSesion === "undefined" || rawSesion === "null") {
    window.location.href = "login.html";
    return;
  }

  let sesion = {};
  try {
    sesion = JSON.parse(rawSesion);
  } catch (e) {
    window.location.href = "login.html";
    return;
  }

  const usuario = sesion.usuario ? sesion.usuario : sesion;
  const cargo = (usuario.Cargo || usuario.cargo || "").toLowerCase();
  const esAdmin = cargo.includes("admin");

  configurarBotonCerrar(usuario);

  // Vincular botón 'Guardar cambios'
  const btnGuardar = document.getElementById("save-btn") 
                  || Array.from(document.querySelectorAll("button, a, span")).find(el => el.textContent.trim().toLowerCase().includes("guardar cambios"));

  if (!esAdmin) {
    const linkReservas = document.getElementById("linkReservas");
    if (linkReservas) linkReservas.style.display = "none";

    if (btnGuardar) btnGuardar.style.display = "none";
  } else if (btnGuardar) {
    btnGuardar.onclick = (e) => {
      e.preventDefault();
      guardarHorarios();
    };
  }

  await cargarTrabajadores(usuario, esAdmin);
});

// Configuración del botón de cierre de sesión
function configurarBotonCerrar(usuario) {
  const btnCerrar = document.getElementById("btnCerrarSesion");
  if (btnCerrar) {
    const nombreMostrar = usuario.Nombre_Completo || usuario.Nombre || "Usuario";
    btnCerrar.textContent = `Cerrar sesión (${nombreMostrar})`;
    btnCerrar.onclick = (e) => {
      e.preventDefault();
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }
}

// Carga del selector de trabajadores
async function cargarTrabajadores(usuarioLogueado, esAdmin) {
  const select = document.getElementById("worker") || document.querySelector("select");
  if (!select) return;

  try {
    select.innerHTML = '<option value="" disabled selected>Cargando trabajadores...</option>';

    const res = await fetch(`${API_URL}/Horarios/Trabajadores`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) throw new Error("Error al obtener lista de trabajadores");

    listaTrabajadores = await res.json();
    select.innerHTML = "";

    if (esAdmin) {
      listaTrabajadores.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.Id_Usuario || t.id;
        opt.textContent = `${t.Nombre_Completo || t.Nombre || t.nombre} (${t.Cargo || t.cargo || 'Personal'})`;
        select.appendChild(opt);
      });

      if (listaTrabajadores.length > 0) {
        const primerId = listaTrabajadores[0].Id_Usuario || listaTrabajadores[0].id;
        select.value = primerId;
        await cargarHorarios(primerId, esAdmin);
      } else {
        select.innerHTML = '<option value="" disabled selected>No hay trabajadores activos</option>';
      }

      select.onchange = (e) => cargarHorarios(e.target.value, esAdmin);
    } else {
      const miId = usuarioLogueado.Id_Usuario || usuarioLogueado.id;
      const opt = document.createElement("option");
      opt.value = miId;
      opt.textContent = `${usuarioLogueado.Nombre_Completo || usuarioLogueado.Nombre || "Usuario"} (${usuarioLogueado.Cargo || usuarioLogueado.cargo || 'Personal'})`;
      select.appendChild(opt);

      select.value = miId;
      select.disabled = true;
      await cargarHorarios(miId, esAdmin);
    }
  } catch (err) {
    console.error("Error cargando trabajadores:", err);
    select.innerHTML = '<option value="" disabled selected>Error al cargar trabajadores</option>';
  }
}

// Obtener horarios desde MongoDB y manejar listas u objetos
async function cargarHorarios(idTrabajador, esAdmin) {
  const contenedor = document.getElementById("days");
  if (!contenedor) return;

  try {
    const res = await fetch(`${API_URL}/Horarios/Obtener/${idTrabajador}`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) {
      turnosActuales = [];
    } else {
      const data = await res.json();
      if (Array.isArray(data)) {
        turnosActuales = data;
      } else if (data && Array.isArray(data.Horarios)) {
        turnosActuales = data.Horarios;
      } else if (data && Array.isArray(data.horarios)) {
        turnosActuales = data.horarios;
      } else {
        turnosActuales = [];
      }
    }

    renderizarTarjetas(contenedor, turnosActuales, esAdmin);
  } catch (err) {
    console.error("Error al obtener horarios:", err);
    turnosActuales = [];
    renderizarTarjetas(contenedor, [], esAdmin);
  }
}

// Renderizar las tarjetas de la semana
function renderizarTarjetas(contenedor, horarios, esAdmin) {
  contenedor.innerHTML = "";
  const listaHorarios = Array.isArray(horarios) ? horarios : [];

  DIAS_SEMANA.forEach(diaInfo => {
    const turno = listaHorarios.find(h => h.dia && h.dia.toLowerCase() === diaInfo.key.toLowerCase());
    const tarjeta = document.createElement("div");
    tarjeta.className = "card card-dia";
    tarjeta.dataset.dia = diaInfo.key;
    tarjeta.style.cssText = "background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;";

    if (turno) {
      tarjeta.innerHTML = `
        <div style="border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
          <h4 style="margin: 0; font-size: 1rem; color: #111;">${diaInfo.label}</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="font-size: 0.75rem; color: #666; font-weight: 600;">Hora de inicio</label>
          <input type="time" class="input-hora-inicio" value="${turno.hora_inicio || '12:30'}" ${!esAdmin ? "disabled" : ""} style="padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; width: 100%;">
          
          <label style="font-size: 0.75rem; color: #666; font-weight: 600;">Hora de término</label>
          <input type="time" class="input-hora-termino" value="${turno.hora_termino || '21:30'}" ${!esAdmin ? "disabled" : ""} style="padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; width: 100%;">
          
          ${esAdmin ? `
            <div style="margin-top: 0.75rem; text-align: right;">
              <button type="button" title="Eliminar turno" style="border: none; background: none; cursor: pointer; font-size: 1.1rem;" onclick="eliminarTurno('${diaInfo.key}')">🗑️</button>
            </div>
          ` : ""}
        </div>
      `;
    } else {
      tarjeta.innerHTML = `
        <div style="border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
          <h4 style="margin: 0; font-size: 1rem; color: #111;">${diaInfo.label}</h4>
        </div>
        <div style="text-align: center; padding: 1.5rem 0;">
          <p style="color: #888; font-size: 0.85rem; margin-bottom: 0.75rem;">Sin turno asignado</p>
          ${esAdmin ? `
            <button type="button" style="border: none; background: none; color: #1f3d33; font-weight: 600; cursor: pointer; font-size: 0.85rem;" onclick="asignarTurnoNuevo('${diaInfo.key}')">+ Asignar turno</button>
          ` : ""}
        </div>
      `;
    }

    contenedor.appendChild(tarjeta);
  });
}

// Capturar los valores actuales de los inputs
function capturarHorariosDesdeDOM() {
  const tarjetas = document.querySelectorAll("#days .card-dia");
  const resultado = [];

  tarjetas.forEach(tarjeta => {
    const dia = tarjeta.dataset.dia;
    const inputInicio = tarjeta.querySelector(".input-hora-inicio");
    const inputTermino = tarjeta.querySelector(".input-hora-termino");

    if (inputInicio && inputTermino) {
      resultado.push({
        dia: dia,
        hora_inicio: inputInicio.value,
        hora_termino: inputTermino.value
      });
    }
  });

  return resultado;
}

// Asignar turno nuevo
window.asignarTurnoNuevo = function(dia) {
  turnosActuales = capturarHorariosDesdeDOM();
  turnosActuales.push({ dia: dia, hora_inicio: "12:30", hora_termino: "21:30" });
  renderizarTarjetas(document.getElementById("days"), turnosActuales, true);
};

// Eliminar turno
window.eliminarTurno = function(dia) {
  turnosActuales = capturarHorariosDesdeDOM();
  turnosActuales = turnosActuales.filter(h => h.dia.toLowerCase() !== dia.toLowerCase());
  renderizarTarjetas(document.getElementById("days"), turnosActuales, true);
};

// Guardar turnos en el backend
async function guardarHorarios() {
  const select = document.getElementById("worker") || document.querySelector("select");
  if (!select || !select.value) {
    alert("Por favor selecciona un trabajador primero.");
    return;
  }

  const idTrabajador = select.value;
  const horariosAGuardar = capturarHorariosDesdeDOM();

  try {
    const res = await fetch(`${API_URL}/Horarios/Guardar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        id_usuario: idTrabajador,
        horarios: horariosAGuardar
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert("Turnos guardados exitosamente en MongoDB.");
      turnosActuales = horariosAGuardar;
    } else {
      alert(`Error al guardar: ${data.detail || "No se pudo actualizar."}`);
    }
  } catch (e) {
    console.error("Error al guardar turnos:", e);
    alert("Error de conexión al guardar los turnos.");
  }
}