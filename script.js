// script.js
import { 
  obtenerProductos, agregarProducto, actualizarProducto, eliminarProductoDB, login, logout, obtenerUsuarioActual
} from "./supabase.js";

if (window.location.protocol === 'file:') {
  alert("⚠️ ERROR: Estás abriendo el archivo directamente. \n\nPara que la tienda cargue, debes usar 'Live Server' o un servidor local.");
  console.error("Los módulos JS requieren un servidor (http://), no funcionan sobre file://");
}

let productos = [];
let adminMode = false;
let editandoId = null;
let currentPhotoIndex = 0;
let currentPhotos = [];

// === CACHÉ DE ELEMENTOS ===
const loader = document.getElementById('loader');
const catalogoContainer = document.getElementById('catalogo');
const modal = document.getElementById('modal-producto');
const modalCloseBtn = document.getElementById('modal-close');
const modalGallery = document.getElementById('modal-gallery');
const galleryDots = document.getElementById('gallery-dots');
const prevPhotoBtn = document.getElementById('prev-photo');
const nextPhotoBtn = document.getElementById('next-photo');
const modalNombre = document.getElementById('modal-nombre');
const modalDetalles = document.getElementById('modal-detalles');
const adminBtn = document.getElementById('admin-btn');
const toastContainer = document.getElementById('toast-container');
const loginModal = document.getElementById('login-modal');
const loginPasswordInput = document.getElementById('login-password');
const confirmLoginBtn = document.getElementById('confirm-login');
const closeLoginBtn = document.getElementById('close-login');
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
const formImagenesInputs = document.querySelectorAll('.form-imagen-input');
const imagePreviews = document.querySelectorAll('.image-preview');

// === FORMATEADOR DE MONEDA ===
const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0
});

// === INTERSECTION OBSERVER (Animaciones al hacer scroll) ===
const observerOptions = {
  root: null,
  rootMargin: '-50px',
  threshold: 0.15 // El elemento aparecerá cuando el 15% sea visible
};

const fadeObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Aplicamos la animación definida en el CSS
      entry.target.style.animation = `fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`;
      entry.target.style.opacity = '1';
      observer.unobserve(entry.target); // Dejar de observar una vez que aparece
    }
  });
}, observerOptions);

// === EVENTOS GLOBALES ===
const ocultarLoader = () => {
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.style.display = 'none', 800);
  }
};

setTimeout(ocultarLoader, 5000);

adminBtn.addEventListener('click', loginAdmin);
modalCloseBtn.addEventListener('click', cerrarModal);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });

confirmLoginBtn.addEventListener('click', async () => {
  const pass = loginPasswordInput.value;
  if(pass) await ejecutarLogin(pass);
});

loginPasswordInput.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const pass = loginPasswordInput.value;
    if(pass) await ejecutarLogin(pass);
  }
});

closeLoginBtn.addEventListener('click', () => loginModal.classList.remove('active'));

formImagenesInputs.forEach(input => {
  input.addEventListener('change', () => {
    const index = input.dataset.index;
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreviews[index].style.backgroundImage = `url(${e.target.result})`;
        imagePreviews[index].textContent = "";
      };
      reader.readAsDataURL(file);
    }
  });
});

guardarBtn.addEventListener('click', guardarProducto);
cancelarBtn.addEventListener('click', cerrarFormulario);
formOverlay.addEventListener('click', cerrarFormulario);

prevPhotoBtn.addEventListener('click', () => navegarGaleria(-1));
nextPhotoBtn.addEventListener('click', () => navegarGaleria(1));

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

// === INICIALIZACIÓN ===
async function init() {
  try {
    const usuario = await obtenerUsuarioActual();
    if (usuario) {
      adminMode = true;
      adminBtn.innerHTML = "SALIR";
    }
    productos = await obtenerProductos();
    renderCatalogo();
    setTimeout(ocultarLoader, 800); 
  } catch (error) {
    console.error("Error inicializando:", error);
    ocultarLoader();
  }
}
init();

// === SISTEMA DE NOTIFICACIONES ===
function showToast(mensaje, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `
    <span>${tipo === 'success' ? '✨' : '⚠️'}</span>
    <p>${mensaje}</p>
  `;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// === RENDERIZADO DEL CATÁLOGO ===
function renderCatalogo() {
  catalogoContainer.innerHTML = "";

  if (productos.length === 0 && !adminMode) {
    catalogoContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--color-muted);">
        <h3 style="font-family: var(--font-serif); font-size: 2rem; margin-bottom: 1rem; color: var(--color-primario);">El catálogo está vacío</h3>
        <p>Pronto subiremos nuevos muebles. ¡Volvé a visitarnos!</p>
      </div>`;
  }

  productos.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "producto";
    card.dataset.id = p.id; // Asignamos el ID directamente a la tarjeta

    const imagenPrincipal = p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : 'https://via.placeholder.com/400x500?text=Sin+Imagen';
    const cuotaValor = p.precio / p.cuotas;
    const cuotaFormateada = formatoPrecio.format(cuotaValor);
    
    // Efecto de entrada escalonada
    card.style.opacity = '0'; 
    card.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';

    // Nueva estructura HTML coincidente con el CSS mejorado
    card.innerHTML = `
      <div class="producto-img-container">
        ${!p.disponible ? '<div class="badge-status" style="color: #A50A1C;">Agotado</div>' : ''}
        ${p.nuevo ? '<div class="badge-status">Nuevo</div>' : ''}
        <img src="${imagenPrincipal}" alt="${p.nombre}" loading="lazy">
      </div>
      <div class="producto-info">
          <h3>${p.nombre}</h3>
          <p class="cuota-preview">${p.cuotas} cuotas de <strong>${cuotaFormateada}</strong></p>
          ${adminMode ? `
            <div class="botones-admin" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
              <button class="btn-editar" style="flex:1; padding:0.5rem; background:#C29B62; color:white; border:none; border-radius:4px; cursor:pointer;">✏️ Editar</button>
              <button class="btn-eliminar" style="flex:1; padding:0.5rem; background:#A50A1C; color:white; border:none; border-radius:4px; cursor:pointer;">🗑️ Eliminar</button>
            </div>
          ` : ''}
      </div>
    `;
    
    catalogoContainer.appendChild(card);
    fadeObserver.observe(card); // Activamos el observador para esta tarjeta
  });

  if (adminMode) {
    const btnAdd = document.createElement("div");
    btnAdd.className = "btn-add-container producto";
    btnAdd.style.opacity = '0';
    
    btnAdd.innerHTML = `
      <div class="btn-add-content" style="text-align: center;">
        <span class="btn-add-icon" style="display: block; font-size: 2rem; margin-bottom: 1rem; color: var(--color-secundario);">⊕</span>
        <span class="btn-add-text" style="color: var(--color-secundario); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Nuevo Mueble</span>
      </div>`;
    
    catalogoContainer.appendChild(btnAdd);
    fadeObserver.observe(btnAdd);
  }
}

// === LÓGICA DE MODAL Y ADMIN ===
function abrirModal(id) {
  const p = productos.find(prod => prod.id == id);
  if (!p) return;
  
  const cuota = formatoPrecio.format(p.precio / p.cuotas);
  const descuento = formatoPrecio.format(p.precio * 0.9);
  
  // Resetear y cargar galería
  modalGallery.innerHTML = "";
  galleryDots.innerHTML = "";
  currentPhotoIndex = 0;
  currentPhotos = p.imagenes && p.imagenes.length > 0 ? p.imagenes : ['https://via.placeholder.com/800x1000?text=Imagen+No+Disponible'];
  
  // Ocultar flechas si hay una sola foto
  const showNav = currentPhotos.length > 1;
  prevPhotoBtn.style.display = showNav ? 'flex' : 'none';
  nextPhotoBtn.style.display = showNav ? 'flex' : 'none';

  currentPhotos.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    modalGallery.appendChild(img);
    
    const dot = document.createElement('div');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.onclick = () => alternarFoto(i);
    galleryDots.appendChild(dot);
  });

  // Resetear posición inicial
  modalGallery.style.transform = `translateX(0)`;

  modalNombre.textContent = p.nombre;
  modalDetalles.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div class="precio-destacado" style="font-size: 1.8rem; margin-bottom: 1rem;">${formatoPrecio.format(p.precio)}</div>
      <p style="margin-bottom: 0.5rem; color: var(--color-muted);"><strong>💳 Financiación:</strong> ${p.cuotas} cuotas sin interés de <strong>${cuota}</strong></p>
      <p style="color: var(--color-muted);"><strong>💰 Precio contado:</strong> <span style="color: var(--color-primario); font-weight: bold;">${descuento}</span> (10% off)</p>
    </div>
    <div style="border-top: 1px solid var(--glass-border); padding-top: 2rem;">
      <p style="margin-bottom: 0.8rem;"><strong>📏 Dimensiones:</strong> ${p.medidas}</p>
      <p style="margin-bottom: 0.8rem;"><strong>🎨 Material/Color:</strong> ${p.color}</p>
      <p><strong>📦 Estado:</strong> ${p.disponible ? "<span style='color: #2E8B57;'>✅ Disponible</span>" : "<span style='color: #A50A1C;'>❌ Agotado</span>"}</p>
    </div>
  `;
  modal.classList.add('active');
}

function alternarFoto(index) {
  currentPhotoIndex = index;
  const offset = -index * 100;
  modalGallery.style.transform = `translateX(${offset}%)`;
  
  const dots = galleryDots.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function navegarGaleria(direccion) {
  if (!currentPhotos.length) return;
  let nuevoIndex = currentPhotoIndex + direccion;
  
  if (nuevoIndex < 0) nuevoIndex = currentPhotos.length - 1;
  if (nuevoIndex >= currentPhotos.length) nuevoIndex = 0;
  
  alternarFoto(nuevoIndex);
}

function cerrarModal() { modal.classList.remove('active'); }

function loginAdmin() {
  if (!adminMode) {
    loginModal.classList.add('active');
    loginPasswordInput.value = "";
    loginPasswordInput.focus();
  } else {
    ejecutarLogout();
  }
}

async function ejecutarLogin(password) {
  try {
    await login(password);
    adminMode = true;
    adminBtn.innerHTML = "SALIR";
    loginModal.classList.remove('active');
    renderCatalogo();
    showToast("Acceso concedido");
  } catch (error) {
    showToast("Clave incorrecta", "error");
  }
}

async function ejecutarLogout() {
  await logout();
  adminMode = false;
  adminBtn.innerHTML = "ADMIN";
  renderCatalogo();
  showToast("Sesión cerrada");
}

function abrirFormularioAgregar() {
  editandoId = null;
  formTitulo.textContent = "🛠️ Agregar Mueble";
  limpiarFormulario();
  abrirFormulario();
}

function editarProducto(id) {
  const p = productos.find(prod => prod.id == id);
  if (!p) return;
  editandoId = id;
  formTitulo.textContent = "✏️ Editar Mueble";
  formNombre.value = p.nombre;
  formPrecio.value = p.precio;
  formCuotas.value = p.cuotas;
  formMedidas.value = p.medidas;
  formColor.value = p.color;
  formDisponible.value = p.disponible;
  
  imagePreviews.forEach((prev, i) => {
    if (p.imagenes && p.imagenes[i]) {
      prev.style.backgroundImage = `url(${p.imagenes[i]})`;
      prev.textContent = "";
    } else {
      prev.style.backgroundImage = "none";
      prev.textContent = i + 1;
    }
  });
  
  abrirFormulario();
}

function abrirFormulario() {
  formularioPanel.classList.add("active");
  formOverlay.classList.add("active");
}

function cerrarFormulario() {
  formularioPanel.classList.remove("active");
  formOverlay.classList.remove("active");
}

function limpiarFormulario() {
  formNombre.value = "";
  formPrecio.value = "";
  formCuotas.value = "";
  formMedidas.value = "";
  formColor.value = "";
  formDisponible.value = "true";
  formImagenesInputs.forEach(input => input.value = "");
  imagePreviews.forEach((prev, i) => {
    prev.style.backgroundImage = "none";
    prev.textContent = i + 1;
  });
}

// === GUARDAR / ELIMINAR ===
async function guardarProducto() {
  const originalText = guardarBtn.textContent;
  try {
    guardarBtn.disabled = true;
    guardarBtn.textContent = "⏳ Guardando...";

    const archivos = Array.from(formImagenesInputs).map(input => input.files[0]);
    const productoData = {
      nombre: formNombre.value.trim(),
      precio: parseFloat(formPrecio.value),
      cuotas: parseInt(formCuotas.value),
      medidas: formMedidas.value.trim(),
      color: formColor.value.trim(),
      disponible: formDisponible.value === "true"
    };

    if (!productoData.nombre || isNaN(productoData.precio) || isNaN(productoData.cuotas)) {
      showToast("Completa los campos obligatorios", "error");
      return;
    }

    if (editandoId) {
      const pOriginal = productos.find(p => p.id == editandoId);
      await actualizarProducto(editandoId, productoData, archivos, pOriginal.imagenes || []);
      showToast("Mueble actualizado con éxito");
    } else {
      await agregarProducto(productoData, archivos);
      showToast("Mueble agregado al catálogo");
    }

    cerrarFormulario();
    productos = await obtenerProductos();
    renderCatalogo();
  } catch (error) {
    showToast("Error al guardar", "error");
    console.error(error);
  } finally {
    guardarBtn.disabled = false;
    guardarBtn.textContent = originalText;
  }
}

async function eliminarProducto(id) {
  try {
    if (confirm("🗑️ ¿Seguro que quieres eliminar este mueble?")) {
      await eliminarProductoDB(id);
      productos = await obtenerProductos();
      renderCatalogo();
      showToast("Producto eliminado");
    }
  } catch (error) {
    showToast("No se pudo eliminar", "error");
    console.error(error);
  }
}
