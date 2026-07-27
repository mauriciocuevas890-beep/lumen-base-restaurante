// ============================================================
// Capa de datos + autenticación de Lumen Base POS
// Usa el MISMO proyecto de Supabase que tu página Lumen Base:
//  - Login con Supabase Auth (correo + contraseña).
//  - El negocio de cada usuario se resuelve desde la tabla 'perfiles'
//    (rol 'cliente' -> su cliente_id ; rol 'agencia' -> elige entre sus clientes).
//  - Los datos del POS viven en 'negocio_estado', protegidos por RLS:
//    cada quien solo accede a su(s) negocio(s).
// ============================================================

const _winCfg = (typeof window !== 'undefined' && window.LUMEN_CONFIG) || {};
const _env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const SUPABASE_URL = _winCfg.supabaseUrl || _env.VITE_SUPABASE_URL;
const SUPABASE_KEY = _winCfg.supabaseKey || _env.VITE_SUPABASE_ANON_KEY;

let _supabase = null;
export async function supabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (_supabase) return _supabase;
  const { createClient } = await import('@supabase/supabase-js');
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _supabase;
}

export function hayConfigSupabase() { return !!(SUPABASE_URL && SUPABASE_KEY); }

// ---------- Autenticación ----------
export async function getSesion() {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session || null;
}
export async function iniciarSesion(email, password) {
  const sb = await supabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
export async function cerrarSesion() {
  const sb = await supabase();
  if (sb) await sb.auth.signOut();
}

function _slug(v) {
  return (v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function _urlCliente() {
  try {
    const p = new URLSearchParams(window.location.search);
    const v = p.get('cliente') || p.get('negocioId') || p.get('negocio');
    if (v) return _slug(v);
  } catch (e) { /* ignore */ }
  return null;
}

// Resuelve el/los negocio(s) del usuario logueado desde 'perfiles'.
// Devuelve { rol, negocioId, negocios:[{id,nombre}] }
export async function resolverNegocios(session) {
  const sb = await supabase();
  if (!sb || !session) return { rol: null, negocioId: null, negocios: [] };
  const uid = session.user.id;
  const { data: perfiles } = await sb.from('perfiles')
    .select('rol,cliente_id,agencia_id').eq('user_id', uid);
  const p = (perfiles && perfiles[0]) || {};

  if (p.rol === 'cliente' && p.cliente_id) {
    let nombre = p.cliente_id;
    try {
      const { data: c } = await sb.from('clientes').select('id,nombre').eq('id', p.cliente_id).maybeSingle();
      if (c && c.nombre) nombre = c.nombre;
    } catch (e) { /* ignore */ }
    return { rol: 'cliente', negocioId: p.cliente_id, negocios: [{ id: p.cliente_id, nombre }] };
  }

  if (p.rol === 'agencia') {
    // La agencia ve TODOS sus negocios directamente desde 'clientes' (por agencia_id).
    let negocios = [];
    try {
      const { data: cs } = await sb.from('clientes')
        .select('id,nombre').eq('agencia_id', p.agencia_id).order('nombre');
      negocios = cs || [];
    } catch (e) { /* ignore */ }
    const url = _urlCliente();
    const idsDisp = negocios.map(n => n.id);
    const negocioId = (url && idsDisp.includes(url)) ? url : (negocios[0] ? negocios[0].id : null);
    return { rol: 'agencia', negocioId, negocios };
  }

  return { rol: p.rol || null, negocioId: null, negocios: [] };
}

// ---------- Estado del negocio ----------
export async function cargarEstado(negocioId) {
  if (!negocioId) return null;
  try {
    const sb = await supabase();
    if (sb) {
      const { data, error } = await sb.from('negocio_estado').select('datos').eq('negocio_id', negocioId).maybeSingle();
      if (!error && data && data.datos) return data.datos;
    }
  } catch (e) { console.warn('cargarEstado nube:', e.message); }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('lumen_base_estado_v1__' + negocioId);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) { /* ignore */ }
  return null;
}

let _timer = null;
export function guardarEstado(negocioId, estado) {
  if (!negocioId) return;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('lumen_base_estado_v1__' + negocioId, JSON.stringify(estado));
  } catch (e) { /* ignore */ }
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  clearTimeout(_timer);
  _timer = setTimeout(async () => {
    try {
      const sb = await supabase();
      if (sb) await sb.from('negocio_estado').upsert({ negocio_id: negocioId, datos: estado, actualizado: new Date().toISOString() });
    } catch (e) { console.warn('No se pudo sincronizar a Supabase:', e.message); }
  }, 1200);
}
