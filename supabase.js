// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

// 🔹 Configuración de Firebase (copia la tuya desde Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyBI5XAy59QQfLq6ECFujVN2phNUpbhv9PI",
    authDomain: "galvanshop-a9e93.firebaseapp.com",
    projectId: "galvanshop-a9e93",
    storageBucket: "galvanshop-a9e93.firebasestorage.app",
    messagingSenderId: "741169067846",
    appId: "1:741169067846:web:f4c42bfd49406b43d09747",
    measurementId: "G-DVP86RFF6D"
  };
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// === FUNCIONES FIRESTORE + STORAGE ===

// 📥 Obtener productos
export async function obtenerProductos() {
  const querySnapshot = await getDocs(collection(db, "productos"));
  const productos = [];
  querySnapshot.forEach(docSnap => {
    productos.push({ id: docSnap.id, ...docSnap.data() });
  });
  return productos;
}

// ➕ Agregar producto
export async function agregarProducto(producto, archivoImagen) {
  let urlImagen = producto.imagen;
  if (archivoImagen) {
    const storageRef = ref(storage, "productos/" + archivoImagen.name);
    await uploadBytes(storageRef, archivoImagen);
    urlImagen = await getDownloadURL(storageRef);
  }
  await addDoc(collection(db, "productos"), { ...producto, imagen: urlImagen });
}

// ✏️ Editar producto
export async function actualizarProducto(id, producto, archivoImagen) {
  let urlImagen = producto.imagen;
  if (archivoImagen) {
    const storageRef = ref(storage, "productos/" + archivoImagen.name);
    await uploadBytes(storageRef, archivoImagen);
    urlImagen = await getDownloadURL(storageRef);
  }
  const docRef = doc(db, "productos", id);
  await updateDoc(docRef, { ...producto, imagen: urlImagen });
}

// 🗑️ Eliminar producto
export async function eliminarProductoDB(id, urlImagen) {
  if (urlImagen) {
    try {
      const imgRef = ref(storage, urlImagen);
      await deleteObject(imgRef);
    } catch (e) {
      console.warn("No se pudo borrar la imagen:", e);
    }
  }
  await deleteDoc(doc(db, "productos", id));
}
