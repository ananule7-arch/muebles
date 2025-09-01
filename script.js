// script.js
import { 
  obtenerProductos, agregarProducto, actualizarProducto, eliminarProductoDB 
} from "./firebase.js";

let productos = [];
let adminMode = false;
let editandoId = null;

// === CACHÉ DE ELEMENTOS ===
const loader = document.getElementById('loader');
const catalogoContainer = document.getElementById('catalogo');
const modal = document.getElementById('modal-producto');
const modalCloseBtn = document.getElementById('modal-close');
const modalImg = document.getElementById('modal-img');
const modalNombre = document.getElementById('modal-nombre');
const modalDetalles = document.getElementById('modal-detalles');
const adminBtn = document.getElementById('admin-btn');
const formularioPanel = document.getElementById('formulario-panel');
const formOverlay = document.getElementById('overlay-form');
const formTitulo = document.getElementById('form-titulo');
const guardarBtn = document.getElementById('guardar-btn');
const cancelarBtn = document.getElementById('cancelar-btn');
const formNombre = document.getElementById('form-nombre');
const formPrecio = document.getElementById('form-precio');
const formCuotas = document.getElementById('form-cuotas');
const formMedidas = document.getElementById('form-medidas');
const formColor = document.getElementById('form-color');
const formDisponible = document.getElementById('form-disponible');
const formImagen = document.getElementById('form-imagen'); // ahora será un <input type="file">

// === EVENTOS ===
window.addEventListener('load', () => {
  setTimeout(() => loader.classList.add('hidden'), 2000);
});

adminBtn.addEventListener('click', loginAdmin);
modalCloseBtn.addEventListener('click', cerrarModal);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
guardarBtn.addEventListener('click', guardarProducto);
cancelarBtn.addEventListener('click', cerrarFormulario);
formOverlay.addEventListener('click', cerrarFormulario);

catalogoContainer.addEventListener('click', (e) => {
  const card = e.target.closest('.producto');
  if (e.target.closest('.btn-add-container')) {
    abrirFormularioAgregar();
  } else if (e.target.matches('.btn-editar')) {
    editarProducto(card.dataset.id);
  } else if (e.target.matches('.btn-eliminar')) {
    eliminarProducto(card.dataset.id);
  } else if (card) {
    abrirModal(card.dataset.id);
  }
});

// === FUNCIONES DE FIREBASE ===
async function init() {
  productos = await obtenerProductos();
  renderCatalogo();
}
init();

// === RENDERIZADO ===
function renderCatalogo() {
  catalogoContainer.innerHTML = "";
  productos.forEach(p => {
    const cuota = (p.precio / p.cuotas).toFixed(2);
    const card = document.createElement("div");
    card.className = "producto";
    card.dataset.id = p.id;
    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
      <h3>${p.nombre}</h3>
      <div>
          <div class="precio-destacado">\$${p.precio}</div>
          <p><strong>💳</strong> ${p.cuotas} cuotas de <strong>\$${cuota}</strong></p>
          <p><strong>📏</strong> ${p.medidas}</p>
          <p><strong>🎨</strong> ${p.color}</p>
          <p><strong>📦</strong> ${p.disponible ? "✅ Disponible" : "❌ Agotado"}</p>
      </div>
    `;
    if (adminMode) {
      card.innerHTML += `
        <div class="botones-admin">
          <button class="btn-editar">✏️ Editar</button>
          <button class="btn-eliminar">🗑️ Eliminar</button>
        </div>
      `;
    }
    catalogoContainer.appendChild(card);
  });
  if (adminMode) {
    const btnAdd = document.createElement("div");
    btnAdd.className = "btn-add-container";
    btnAdd.innerHTML = `<span class="btn-add-text">➕<br>Agregar Mueble</span>`;
    catalogoContainer.appendChild(btnAdd);
  }
}

// === MODAL ===
function abrirModal(id) {
  const p = productos.find(prod => prod.id === id);
  if (!p) return;
  const cuota = (p.precio / p.cuotas).toFixed(2);
  const descuento = (p.precio * 0.9).toFixed(2);
  modalImg.src = p.imagen;
  modalNombre.textContent = p.nombre;
  modalDetalles.innerHTML = `
    <div class="modal-detalles-info">
      <div class="precio-destacado">\$${p.precio}</div>
      <p><strong>💳 Financiación:</strong> ${p.cuotas} cuotas sin interés de <strong>\$${cuota}</strong></p>
      <p><strong>💰 Precio contado:</strong> <span class="precio-contado">\$${descuento}</span> (10% off)</p>
    </div>
    <div class="detalles-bloque">
      <p><strong>📏 Dimensiones:</strong> ${p.medidas}</p>
      <p><strong>🎨 Material/Color:</strong> ${p.color}</p>
      <p><strong>📦 Estado:</strong> ${p.disponible ? "✅ Disponible" : "❌ Agotado"}</p>
    </div>
  `;
  modal.classList.add('activo');
}
function cerrarModal() { modal.classList.remove('activo'); }

// === ADMIN ===
function loginAdmin() {
  adminMode = !adminMode;
  adminBtn.innerHTML = adminMode ? "🚪" : "🔑";
  alert(adminMode ? "✅ Modo administrador activado." : "🚪 Sesión cerrada.");
  renderCatalogo();
}

function abrirFormularioAgregar() {
  editandoId = null;
  formTitulo.textContent = "🛠️ Agregar Mueble";
  limpiarFormulario();
  abrirFormulario();
}

function editarProducto(id) {
  const p = productos.find(prod => prod.id === id);
  if (!p) return;
  editandoId = id;
  formTitulo.textContent = "✏️ Editar Mueble";
  formNombre.value = p.nombre;
  formPrecio.value = p.precio;
  formCuotas.value = p.cuotas;
  formMedidas.value = p.medidas;
  formColor.value = p.color;
  formDisponible.value = p.disponible;
  abrirFormulario();
}

function abrirFormulario() {
  formularioPanel.classList.add("activo");
  formOverlay.classList.add("activo");
}
function cerrarFormulario() {
  formularioPanel.classList.remove("activo");
  formOverlay.classList.remove("activo");
}
function limpiarFormulario() {
  formNombre.value = "";
  formPrecio.value = "";
  formCuotas.value = "";
  formMedidas.value = "";
  formColor.value = "";
  formDisponible.value = "true";
  formImagen.value = "";
}

// === GUARDAR / ELIMINAR ===
async function guardarProducto() {
  const archivoImagen = formImagen.files[0] || null;
  const productoData = {
    nombre: formNombre.value.trim(),
    precio: parseFloat(formPrecio.value),
    cuotas: parseInt(formCuotas.value),
    medidas: formMedidas.value.trim(),
    color: formColor.value.trim(),
    disponible: formDisponible.value === "true",
    imagen: "" // lo genera Firebase
  };
  if (!productoData.nombre || !productoData.precio || !productoData.cuotas) {
    alert("⚠️ Completa todos los campos.");
    return;
  }
  if (editandoId) {
    await actualizarProducto(editandoId, productoData, archivoImagen);
    alert("✅ Mueble actualizado.");
  } else {
    await agregarProducto(productoData, archivoImagen);
    alert("✅ Mueble agregado.");
  }
  cerrarFormulario();
  productos = await obtenerProductos();
  renderCatalogo();
}

async function eliminarProducto(id) {
  if (confirm("🗑️ ¿Seguro que quieres eliminar este mueble?")) {
    const prod = productos.find(p => p.id === id);
    await eliminarProductoDB(id, prod.imagen);
    productos = await obtenerProductos();
    renderCatalogo();
    alert("✅ Mueble eliminado.");
  }
}
