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


  if (!esAdmin) {
   
    const linkReservas = document.getElementById("linkReservas");
    if (linkReservas) linkReservas.style.display = "none";

    
    const btnGuardar = document.getElementById("save-btn");
    if (btnGuardar) btnGuardar.style.display = "none";
  }

 
  await cargarTrabajadores(usuario, esAdmin);
});

// Configurar botón cerrar sesión
function configurarBotonCerrar(usuario) {
  const btnCerrar = document.getElementById("btnCerrarSesion");
  if (btnCerrar) {
    btnCerrar.textContent = `Cerrar sesión (${usuario.Nombre || "Usuario"})`;
    btnCerrar.onclick = (e) => {
      e.preventDefault();
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "login.html";
    };
  }
}


async function cargarTrabajadores(usuarioLogueado, esAdmin) {
  const select = document.getElementById("worker");
  if (!select) return;

  try {
    const res = await fetch(`${API_URL}/Horarios/Trabajadores`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) throw new Error("Error al obtener lista de trabajadores");

    const trabajadores = await res.json();
    select.innerHTML = "";

    if (esAdmin) {
   
      trabajadores.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.nombre;
        select.appendChild(opt);
      });

      if (trabajadores.length > 0) {
        select.value = trabajadores[0].id;
        await cargarHorarios(trabajadores[0].id, esAdmin);
      }

      select.onchange = (e) => cargarHorarios(e.target.value, esAdmin);

      const btnGuardar = document.getElementById("save-btn");
      if (btnGuardar) {
        btnGuardar.onclick = guardarHorarios;
      }
    } else {
     
      const miId = usuarioLogueado.Id_Usuario || usuarioLogueado.id;
      const opt = document.createElement("option");
      opt.value = miId;
      opt.textContent = `${usuarioLogueado.Nombre} (${usuarioLogueado.Cargo})`;
      select.appendChild(opt);

      select.value = miId;
      select.disabled = true;
      await cargarHorarios(miId, esAdmin);
    }
  } catch (err) {
    console.error("Error cargando trabajadores:", err);
  }
}

// Obtener horarios desde MongoDB
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
      turnosActuales = await res.json();
    }

    renderizarTarjetas(contenedor, turnosActuales, esAdmin);
  } catch (err) {
    console.error("Error al obtener horarios:", err);
  }
}

function renderizarTarjetas(contenedor, horarios, esAdmin) {
  contenedor.innerHTML = "";

  DIAS_SEMANA.forEach(diaInfo => {
    const turno = horarios.find(h => h.dia.toLowerCase() === diaInfo.key.toLowerCase());
    const tarjeta = document.createElement("div");
    tarjeta.className = "card card-dia";
    tarjeta.style.cssText = "background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;";

    if (turno) {
      tarjeta.innerHTML = `
        <div style="border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
          <h4 style="margin: 0; font-size: 1rem; color: #111;">${diaInfo.label}</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="font-size: 0.75rem; color: #666; font-weight: 600;">Inicio</label>
          <input type="time" class="input-hora-inicio" value="${turno.hora_inicio}" ${!esAdmin ? "disabled" : ""} style="padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; width: 100%;">
          
          <label style="font-size: 0.75rem; color: #666; font-weight: 600;">Término</label>
          <input type="time" class="input-hora-termino" value="${turno.hora_termino}" ${!esAdmin ? "disabled" : ""} style="padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; width: 100%;">
          
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
            <button type="button" style="border: none; background: none; color: #2e7d32; font-weight: 600; cursor: pointer; font-size: 0.85rem;" onclick="asignarTurnoNuevo('${diaInfo.key}')">+ Asignar turno</button>
          ` : ""}
        </div>
      `;
    }

    contenedor.appendChild(tarjeta);
  });
}

// Asignar nuevo turno 
window.asignarTurnoNuevo = function(dia) {
  turnosActuales.push({ dia: dia, hora_inicio: "09:00", hora_termino: "17:00" });
  renderizarTarjetas(document.getElementById("days"), turnosActuales, true);
};

// Eliminar turno 
window.eliminarTurno = function(dia) {
  turnosActuales = turnosActuales.filter(h => h.dia.toLowerCase() !== dia.toLowerCase());
  renderizarTarjetas(document.getElementById("days"), turnosActuales, true);
};

// Guardar turnos en el backend
async function guardarHorarios() {
  const select = document.getElementById("worker");
  const idTrabajador = select.value;
  const tarjetas = document.querySelectorAll("#days .card-dia");

  const horariosAGuardar = [];
  tarjetas.forEach(tarjeta => {
    const dia = tarjeta.querySelector("h4")?.textContent.trim();
    const inputInicio = tarjeta.querySelector(".input-hora-inicio");
    const inputTermino = tarjeta.querySelector(".input-hora-termino");

    if (inputInicio && inputTermino) {
      horariosAGuardar.push({
        dia: dia,
        hora_inicio: inputInicio.value,
        hora_termino: inputTermino.value
      });
    }
  });

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

    if (res.ok) {
      alert("Turnos guardados exitosamente en MongoDB Atlas.");
    } else {
      const err = await res.json();
      alert(`Error al guardar: ${err.detail || "No se pudo actualizar"}`);
    }
  } catch (e) {
    console.error("Error al guardar turnos:", e);
    alert("Error de conexión al guardar los turnos.");
  }
}