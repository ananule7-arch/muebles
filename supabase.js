import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔹 Configuración de Supabase
// Reemplaza estos valores con los de tu proyecto en Supabase (Settings -> API)
const supabaseUrl = 'https://jddulfxdxftjomdqfusy.supabase.co'
const supabaseKey = 'sb_publishable_EsFMF5OCX2Pxqxmh7eAKew_dKXHKHrH'
const supabase = createClient(supabaseUrl, supabaseKey)

// === FUNCIONES SUPABASE ===

// 🔐 Autenticación
export async function login(password) {
  // Usamos un correo interno fijo para que solo necesites la contraseña
  const email = "admin@muebles.com"; 
  const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
  if (error) throw error;
  return data.user;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function obtenerUsuarioActual() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

// 📥 Obtener productos
export async function obtenerProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('id', { ascending: false });
  
  if (error) {
    console.error("Error al obtener productos:", error.message);
    return [];
  }
  return data;
}

// ➕ Agregar producto
export async function agregarProducto(producto, archivosImagenes) {
  const urlsImagenes = [];

  for (const archivo of archivosImagenes) {
    if (archivo) {
      const fileName = `${Date.now()}-${archivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, archivo);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('productos').getPublicUrl(fileName);
      urlsImagenes.push(data.publicUrl);
    }
  }

  const { error } = await supabase
    .from('productos')
    .insert([{ ...producto, imagenes: urlsImagenes }]);

  if (error) throw error;
}

// ✏️ Editar producto
export async function actualizarProducto(id, producto, archivosNuevos, imagenesExistentes) {
  const urlsFinales = [...imagenesExistentes];

  for (let i = 0; i < archivosNuevos.length; i++) {
    const archivo = archivosNuevos[i];
    if (archivo) {
      const fileName = `${Date.now()}-${archivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, archivo);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('productos').getPublicUrl(fileName);
      urlsFinales[i] = data.publicUrl; // Reemplaza la imagen en esa posición
    }
  }

  const { error } = await supabase
    .from('productos')
    .update({ ...producto, imagenes: urlsFinales.filter(url => url) })
    .eq('id', id);

  if (error) throw error;
}

// 🗑️ Eliminar producto
export async function eliminarProductoDB(id) {
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}
