const API_URL = "https://olive-stood-quizzical.ngrok-free.dev";

//Imagenes de los platos
const IMAGENES_PLATOS = {
  "Pizza Napolitana": "images/pizza_napolitana.jpg",
  "Pizza Familiar": "images/pizza_familiar.jpg",
  "Hamburguesa Clásica": "images/hamburguesa.jpg",
  "Hamburguesa BBQ": "images/hamburguesa_bbq.jpg",
  "Pasta Alfredo": "images/pasta_alfredo.jpg",
  "Lasaña": "images/lasana.jpg",
  "Ensalada César": "images/ensalada_cesar.jpg",
  "Sopa del Día": "images/sopa_del_dia.jpg",
  "Salmón a la plancha": "images/salmon_plancha.jpg"
};

// Almacena en memoria el menú obtenido desde MongoDB
let catalogoPlatos = {};

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector(".reserve-form");
  const inputFecha = document.getElementById("fecha");
  const selectPlato = document.getElementById("plato");
  const submitBtn = form?.querySelector('button[type="submit"]');

 
  if (inputFecha) {
    const hoy = new Date().toISOString().split("T")[0];
    inputFecha.min = hoy;
  }

 
  await cargarMenuDesdeBD(selectPlato);


  if (selectPlato) {
    selectPlato.addEventListener("change", (e) => {
      const platoSeleccionado = e.target.value;
      actualizarResumenPlato(platoSeleccionado);
    });
  }


  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre")?.value.trim() || "";
      const apellido = document.getElementById("apellido")?.value.trim() || "";
      const identificador = document.getElementById("identificador")?.value.trim() || "";
      const telefono = document.getElementById("telefono")?.value.trim() || "";
      const fecha = document.getElementById("fecha")?.value || "";
      const hora = document.getElementById("hora")?.value || "";
      const plato = selectPlato?.value || "Sin plato";
      const lugar = document.getElementById("lugar")?.value || "";

      if (!nombre || !apellido || !identificador || !telefono || !fecha || !hora || !lugar || !plato) {
        alert("Por favor completa todos los campos del formulario antes de continuar.");
        return;
      }

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

        // Validación de choque de mesa/horario (409 Conflict)
        if (respuesta.status === 409) {
          alert(`⚠️ No disponible:\n${data.detail}\nPor favor elige otra hora o lugar.`);
          return;
        }

        if (!respuesta.ok) {
          throw new Error(data.detail || "Error en el servidor al registrar la reserva.");
        }

        alert(
          `✅ ¡Solicitud enviada con éxito!\n\n` +
          `Cliente: ${nombre} ${apellido}\n` +
          `Lugar: ${lugar}\n` +
          `Horario: ${fecha} a las ${hora}\n` +
          `Plato: ${plato}\n` +
          `Código de seguimiento: ${data.codigo}\n\n` +
          `Tu reserva quedó en estado pendiente de aprobación.`
        );

        form.reset();
        if (inputFecha) inputFecha.min = new Date().toISOString().split("T")[0];

        // Restablecer al primer plato cargado
        const primerPlato = Object.keys(catalogoPlatos)[0];
        if (primerPlato && selectPlato) {
          selectPlato.value = primerPlato;
          actualizarResumenPlato(primerPlato);
        }

      } catch (err) {
        console.error("Error al procesar reserva:", err);
        alert("Ocurrió un error al intentar registrar la reserva. Comprueba si el backend está activo.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = textoOriginal;
        }
      }
    });
  }
});

// Obtiene los datos del nuevo endpoint /Menu/ y puebla el select
async function cargarMenuDesdeBD(selectElement) {
  if (!selectElement) return;

  try {
    const res = await fetch(`${API_URL}/Menu/`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!res.ok) throw new Error("No se pudo obtener el menú.");

    const platos = await res.json();
    selectElement.innerHTML = "";
    catalogoPlatos = {};

    platos.forEach((p, index) => {
      catalogoPlatos[p.nombre] = {
        precio: p.precio,
        desc: p.descripcion
      };

      const opt = document.createElement("option");
      opt.value = p.nombre;
      opt.textContent = p.nombre;
      if (index === 0) opt.selected = true;
      selectElement.appendChild(opt);
    });

    // Cargar la vista inicial con el primer plato recibido
    if (platos.length > 0) {
      actualizarResumenPlato(platos[0].nombre);
    }

  } catch (error) {
    console.error("Error cargando el menú dinámico:", error);
    selectElement.innerHTML = `<option value="">Error al cargar menú</option>`;
  }
}

// Actualiza título, descripción, precio e imagen en la tarjeta lateral
function actualizarResumenPlato(nombrePlato) {
  const info = catalogoPlatos[nombrePlato];
  if (!info) return;

  const summaryTitle = document.getElementById("summary-title");
  const summaryDesc = document.querySelector(".summary-desc");
  const summaryPrice = document.querySelector(".summary-price dd");
  const summaryImg = document.querySelector(".summary-image");

  if (summaryTitle) summaryTitle.textContent = nombrePlato;
  if (summaryDesc) summaryDesc.textContent = info.desc;
  if (summaryPrice) summaryPrice.textContent = info.precio;

  // Actualizar imagen con fallback a plato.png si no existe mapeo exacto
  if (summaryImg) {
    const rutaImagen = IMAGENES_PLATOS[nombrePlato] || "images/plato.png";
    summaryImg.src = rutaImagen;
    summaryImg.alt = `Plato de ${nombrePlato}`;
  }
}