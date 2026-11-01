// Front-End/reservas.js

// 1. Control de acceso de Administrador
(function verificarAccesoAdmin() {
  const sesion = JSON.parse(sessionStorage.getItem("usuario_sesion"));
  if (!sesion || !(sesion.Cargo || "").toLowerCase().includes("admin")) {
    alert("Acceso denegado: Esta vista requiere permisos de Administrador.");
    window.location.href = "login.html";
  }
})();

// 2. Renderizado de la barra lateral con contraste de color
function renderSidebar(activeSection) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const usuario = JSON.parse(sessionStorage.getItem('usuario_sesion')) || { Nombre: 'Administrador' };

  const linkBase = "display: block; padding: 0.75rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.95rem; transition: background 0.2s, color 0.2s;";
  const linkActive = "background-color: #f1eee9 !important; color: #111111 !important; font-weight: 700;";
  const linkInactive = "color: #ffffff !important; font-weight: 500; opacity: 0.9;";

  sidebar.innerHTML = `
    <div style="padding: 1.5rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.15);">
      <strong style="display: block; font-size: 1.25rem; font-weight: 700; color: #ffffff !important;">Álamos</strong>
      <span style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.7) !important;">Panel de Administración</span>
    </div>
    <nav style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
      <a href="reservas.html" style="${linkBase} ${activeSection === 'reservas' ? linkActive : linkInactive}">
        Reservas
      </a>
      <a href="horarios.html" style="${linkBase} ${activeSection === 'horarios' ? linkActive : linkInactive}">
        Horarios y Turnos
      </a>
      <a href="index.html" style="${linkBase} ${activeSection === 'sitio' ? linkActive : linkInactive}">
        Ver Sitio Web
      </a>
      <button onclick="cerrarSesion()" style="margin-top: 2rem; padding: 0.65rem 1rem; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(0,0,0,0.2); border-radius: 8px; cursor: pointer; text-align: left; font-size: 0.85rem; color: #ffb4b4 !important; font-weight: 500;">
        Cerrar sesión (${usuario.Nombre})
      </button>
    </nav>
  `;
}

function cerrarSesion() {
  sessionStorage.removeItem('usuario_sesion');
  window.location.href = 'login.html';
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function showToast(mensaje) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.style.cssText = "background: #1f3d33; color: #fff; padding: 0.8rem 1.2rem; border-radius: 8px; margin-top: 0.5rem; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: opacity 0.3s ease;";
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 3. Manejo de reservas desde la base de datos
let reservations = [];
let openDetail = null;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const STATUS_LABELS = { 
  pendiente: 'En espera', 
  aprobada: 'Aprobada', 
  rechazada: 'Rechazada' 
};

function formatDate(iso) {
  if (!iso || !iso.includes('-')) return iso || '-';
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// Cargar registros desde FastAPI
async function cargarReservasDesdeBD() {
  try {
    const res = await fetch("/Reservas/Listar", {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    if (!res.ok) throw new Error("Error al consultar reservas al servidor.");

    reservations = await res.json();
    render();
  } catch (err) {
    console.error(err);
    showToast("No se pudieron cargar las reservas.");
  }
}

function renderStats() {
  const pendingEl = document.getElementById('stat-pending');
  const approvedEl = document.getElementById('stat-approved');
  if (pendingEl) pendingEl.textContent = reservations.filter((r) => r.status === 'pendiente').length;
  if (approvedEl) approvedEl.textContent = `${reservations.filter((r) => r.status === 'aprobada').length} aprobadas`;
}

function renderRows() {
  const dateFilter = document.getElementById('filter-date')?.value;
  const statusFilter = document.getElementById('filter-status')?.value;
  const visible = reservations.filter(
    (r) => (!dateFilter || r.date === dateFilter) && (statusFilter === 'todos' || r.status === statusFilter),
  );

  const resultsEl = document.getElementById('results-count');
  if (resultsEl) resultsEl.textContent = `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}`;

  const tbody = document.getElementById('rows');
  if (!tbody) return;

  if (!visible.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="text-align: center; padding: 2rem; color: #888;">No hay reservas registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = visible.map((r) => {
    const isOpen = openDetail === r.code;
    const pendingActions = r.status === 'pendiente'
      ? `<button type="button" class="btn btn-sm btn-ghost" data-action="approve" data-code="${r.code}">Aprobar</button>
         <button type="button" class="btn btn-sm btn-ghost" data-action="reject" data-code="${r.code}">Rechazar</button>`
      : '';
    const detail = isOpen
      ? `<tr class="detail-row">
           <td colspan="7" style="background: #faf8f5; padding: 1rem;"><strong>${r.guests} personas</strong> · Tel: ${escapeHtml(r.phone)} · Obs: ${escapeHtml(r.notes)}</td>
         </tr>`
      : '';
    return `
      <tr>
        <td class="cell-code" style="font-family: monospace; font-weight: 700;">${r.code}</td>
        <td>${escapeHtml(r.client)}</td>
        <td>${formatDate(r.date)}</td>
        <td>${r.time}</td>
        <td>${escapeHtml(r.table)}</td>
        <td>
          <span class="badge badge-${r.status}">
            <span class="badge-dot" aria-hidden="true"></span>${STATUS_LABELS[r.status] || r.status}
          </span>
        </td>
        <td>
          <div class="row-actions" style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn btn-sm btn-ghost" data-action="detail" data-code="${r.code}" aria-expanded="${isOpen}">
              ${isOpen ? 'Ocultar' : 'Ver detalle'}
            </button>
            ${pendingActions}
            <button type="button" class="icon-btn" data-action="delete" data-code="${r.code}" aria-label="Eliminar reserva ${r.code}" style="background: transparent; border: none; cursor: pointer; color: #b91c1c;">
              <i data-lucide="trash-2" class="icon" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>${detail}`;
  }).join('');

  refreshIcons();
}

function render() {
  renderStats();
  renderRows();
}

// 4. Inicialización y eventos de acción (Aprobar, Rechazar, Eliminar)
document.addEventListener("DOMContentLoaded", () => {
  renderSidebar('reservas');
  cargarReservasDesdeBD();

  const rows = document.getElementById('rows');
  if (rows) {
    rows.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, code } = button.dataset;

      // Ver u ocultar detalle
      if (action === 'detail') {
        openDetail = openDetail === code ? null : code;
        renderRows();
        return;
      }

      // Actualizar estado en la BD (1 para aprobada, 0 para rechazada)
      if (action === 'approve' || action === 'reject') {
        const nuevoEstado = action === 'approve' ? 'aprobada' : 'rechazada';
        try {
          const resp = await fetch(`/Reservas/Estado/${encodeURIComponent(code)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({ Estado: nuevoEstado })
          });

          if (!resp.ok) throw new Error("No se pudo actualizar el estado.");

          reservations = reservations.map((r) => (r.code === code ? { ...r, status: nuevoEstado } : r));
          showToast(`Reserva ${code} ${nuevoEstado}.`);
          render();
        } catch (err) {
          console.error(err);
          alert("Error al actualizar el estado de la reserva en la base de datos.");
        }
      }

      // Eliminar registro de la BD
      if (action === 'delete') {
        if (!confirm(`¿Estás seguro de eliminar definitivamente la reserva ${code} de la base de datos?`)) return;

        try {
          const resp = await fetch(`/Reservas/Delete/${encodeURIComponent(code)}`, {
            method: "DELETE",
            headers: { "ngrok-skip-browser-warning": "true" }
          });

          if (!resp.ok) throw new Error("No se pudo eliminar la reserva.");

          reservations = reservations.filter((r) => r.code !== code);
          showToast(`Reserva ${code} eliminada de la base de datos.`);
          render();
        } catch (err) {
          console.error(err);
          alert("Error al eliminar la reserva de la base de datos.");
        }
      }
    });
  }

  document.getElementById('filter-date')?.addEventListener('change', renderRows);
  document.getElementById('filter-status')?.addEventListener('change', renderRows);
});