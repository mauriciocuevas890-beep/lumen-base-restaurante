import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  cargarEstado, guardarEstado, hayConfigSupabase,
  getSesion, iniciarSesion, cerrarSesion, resolverNegocios
} from './persistencia';
import {
  Zap, Home, Package, BarChart3, Landmark, ClipboardList, UserPlus, Search,
  Plus, Minus, Trash2, X, ArrowLeft, Check, Printer, Download, Share2,
  CreditCard, DollarSign, ArrowLeftRight, Wallet, Star, ImageIcon,
  ChevronDown, ChevronRight, ChevronLeft, MoreHorizontal, Save,
  TrendingUp, TrendingDown, Receipt, Filter, FolderOpen, Users, Utensils,
  Bike, ShoppingBag, Clock, StickyNote, Percent, Copy, Phone, Mail, MapPin,
  Settings, RotateCcw, Menu, Camera
} from 'lucide-react';
import logoImg from './logo.png';

// ============ DATOS INICIALES (Mock DB) ============
const INITIAL_PRODUCTS = [
  { id: '1', nombre: 'Hamburguesa Clásica', precio: 120, costo: 45, stock: 50, stockMin: 5, categoria: 'Platos Fuertes', color: '#64748b', imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300&h=300', fav: true },
  { id: '2', nombre: 'Hamburguesa Doble', precio: 165, costo: 65, stock: 30, stockMin: 5, categoria: 'Platos Fuertes', color: '#78716c', imagen: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&q=80&w=300&h=300', fav: false },
  { id: '3', nombre: 'Papas a la Francesa', precio: 50, costo: 15, stock: 100, stockMin: 10, categoria: 'Guarniciones', color: '#ca8a04', imagen: null, fav: false },
  { id: '4', nombre: 'Alitas (10 pz)', precio: 140, costo: 60, stock: 8, stockMin: 10, categoria: 'Entradas', color: '#b91c1c', imagen: null, fav: false },
  { id: '5', nombre: 'Refresco Cola', precio: 30, costo: 12, stock: 120, stockMin: 20, categoria: 'Bebidas', color: '#334155', imagen: null, fav: false },
];

const INITIAL_CLIENTES = [
  { id: 'c1', nombre: 'Juan Pérez', telefono: '3312345678', email: '', domicilio: 'Av. Reforma 450', detalles: '' },
  { id: 'c2', nombre: 'María García', telefono: '3319876543', email: '', domicilio: 'Calle Independencia 22', detalles: 'Portón negro' },
];

const CATEGORIAS_GASTO = ['Sin categoría', 'General', 'Renta', 'Gestión', 'Nómina', 'Servicios', 'Mantenimiento', 'Alimentos', 'Marketing', 'Préstamos', 'Mobiliario o Equipo', 'Transporte'];
const COLORES_TILE = ['#2563eb', '#64748b', '#b91c1c', '#ca8a04', '#15803d', '#7c3aed', '#db2777', '#334155', '#ea580c'];
const ENTREGA_DEFAULT = { modo: 'En sitio', hora: '', fecha: '', domicilio: '', detalles: '', tarifa: 0 };

const AJUSTES_DEFAULT = {
  // Contacto
  nombre: 'Lumen Base', whatsapp: '', calle: '', detallesDir: '',
  instagram: '', facebook: '', email: '', descripcion: '', googleBusiness: '',
  // General
  venderSinStock: true, turnosCaja: false, canceladas: 'Mostrar tachadas',
  moneda: 'MXN $', decimales: true, zona: 'America/Mexico_City',
  impuestoDesc: 'Impuesto', impuestoModo: 'Porcentaje', impuestoApp: 'Añadido al precio', impuestoValor: 0,
  // Ticket
  encabezado: '', pie: 'Gracias por su compra', colorTicket: '#232F55', mostrarDatosCliente: true,
  // Mesas
  activarMesas: false,
  mesas: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ id: `m${n}`, num: n, forma: n % 3 === 1 ? 'circle' : 'rect', zona: n <= 3 ? 'Bar' : 'Área principal' })),
  zonas: ['Bar', 'Área principal'],
  // Impresoras
  impresoras: [{ id: 'imp1', nombre: 'Impresora de Tickets', estado: 'Sin configurar' }],
  areasVenta: ['Barra', 'Sin área de venta', 'Cocina'],
  // IA
  openaiApiKey: '',
  openaiModelo: 'gpt-4o-mini',
};

// ============ FUNCIONES DE FECHA Y FILTROS ============
const getTimestamp = (item) => {
  if (!item) return Date.now();
  if (typeof item.ts === 'number') return item.ts;      // fecha/hora exacta guardada del pedido
  if (!item.id) return Date.now();
  const parts = item.id.split('-');                     // compatibilidad: el id ya lleva los milisegundos
  const ts = parseInt(parts[parts.length - 1]);
  return isNaN(ts) ? Date.now() : ts;
};
const inicioDelDia = () => new Date().setHours(0, 0, 0, 0);
const hace30Dias = () => new Date().setHours(0, 0, 0, 0) - (30 * 24 * 60 * 60 * 1000);
const inicioDeSemana = () => {
  const d = new Date();
  const day = d.getDay() || 7; 
  d.setHours(0, 0, 0, 0);
  return d.getTime() - (day - 1) * 24 * 60 * 60 * 1000;
};
const inicioDeMes = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const inicioDeHora = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.getTime();
};
const aplicarFiltroFecha = (items, rango) => {
  if (rango === 'Todo') return items;
  let umbral = 0;
  if (rango === '30D') umbral = hace30Dias();
  else if (rango === 'Mes') umbral = inicioDeMes();
  else if (rango === 'Semana') umbral = inicioDeSemana();
  else if (rango === 'Dia' || rango === 'Hoy') umbral = inicioDelDia();
  else if (rango === 'Hora') umbral = inicioDeHora();
  return items.filter(i => getTimestamp(i) >= umbral);
};

// ============ LOGO LUMEN BASE (ícono fiel al original) ============
function LumenLogo({ size = 44 }) {
  return (
    <img src={logoImg} alt="Lumen Logo" className="mix-blend-multiply" style={{ width: size, height: size, objectFit: 'contain' }} />
  );
}

const money = (n) => `$${(n || 0).toFixed(2)}`;

// Convierte una imagen subida a un data URL (base64) redimensionado y comprimido.
// Así la foto queda INCRUSTADA en los datos y sobrevive al recargar la página
// (a diferencia de URL.createObjectURL, que crea un blob temporal que se borra).
function imagenADataURL(file, maxLado, cb) {
  try {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        try {
          const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * escala));
          const h = Math.max(1, Math.round(img.height * escala));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          cb(canvas.toDataURL('image/jpeg', 0.82));
        } catch (e) { cb(ev.target.result); }
      };
      img.onerror = () => cb(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  } catch (e) { /* navegador sin soporte */ }
}
// Búsqueda insensible a acentos y mayúsculas ("clasica" encuentra "Clásica")
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const hoy = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
const horaActual = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// Formatos de fecha/hora derivados del timestamp real guardado en cada pedido.
const fmtFecha = (ts) => new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtHora = (ts) => new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtFechaHora = (ts) => `${fmtFecha(ts)} ${fmtHora(ts)}`;
const fmtFechaLarga = (ts) => new Date(ts).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

const EntregaIcon = ({ modo, className }) => {
  if (modo === 'Reparto') return <Bike className={className} />;
  if (modo === 'Pickup') return <ShoppingBag className={className} />;
  return <Utensils className={className} />;
};

// ============ TILE DE PRODUCTO (grid de venta) ============
function ProductTile({ product, onClick, sinStockOk }) {
  const low = product.stock > 0 && product.stock <= (product.stockMin || 5);
  const out = product.stock === 0 && !sinStockOk;
  return (
    <button onClick={onClick} disabled={out}
      className={`relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all text-left h-40 flex flex-col group ${out ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
      <div className="flex-1 relative flex items-center justify-center" style={{ backgroundColor: product.imagen ? '#111' : product.color }}>
        {product.imagen
          ? <img src={product.imagen} alt={product.nombre} className="absolute inset-0 w-full h-full object-cover" />
          : <span className="text-white text-xl font-bold px-2 text-center leading-tight drop-shadow">{product.nombre}</span>}
        {low && <span className="absolute top-2 left-2 bg-white text-gray-800 text-[11px] font-bold px-2 py-0.5 rounded-full shadow z-10">Stock: {product.stock}</span>}
        {out && <span className="absolute top-2 left-2 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow z-10">Agotado</span>}
      </div>
      <div className="bg-gray-700/95 px-3 py-1.5 relative z-10">
        <p className="text-white text-xs font-bold truncate">{product.nombre}</p>
        <p className="text-white/90 text-xs font-semibold">{money(product.precio)}</p>
      </div>
    </button>
  );
}

// ============ PANEL: CLIENTES (buscar / crear, estilo Yimi) ============
function ClientesPanel({ clientes, onClose, onSelect, onCrear }) {
  const [modo, setModo] = useState('lista');
  const [busqueda, setBusqueda] = useState('');
  const [f, setF] = useState({ nombre: '', telefono: '', email: '', domicilio: '', detalles: '' });
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const filtrados = clientes.filter(c => norm(`${c.nombre} ${c.telefono} ${c.email}`).includes(norm(busqueda)));

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        {modo === 'lista' ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black text-gray-900">Clientes</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setModo('nuevo')} className="p-2 hover:bg-blue-50 rounded-full text-blue-600"><Plus className="w-6 h-6" /></button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
              </div>
            </div>
            <div className="flex items-center border-2 border-gray-200 rounded-full px-4 py-3 mb-5 focus-within:border-blue-400">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, correo o teléfono" className="outline-none w-full text-gray-800" />
            </div>
            {filtrados.length === 0 ? (
              <div className="text-center py-14">
                <h3 className="text-xl font-black text-gray-900 mb-1">No tienes clientes aún</h3>
                <p className="text-gray-500 mb-5">¡Hola! Vamos a agregar tu primer cliente.</p>
                <button onClick={() => setModo('nuevo')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-blue-600/25">Nuevo cliente</button>
              </div>
            ) : filtrados.map(c => (
              <button key={c.id} onClick={() => onSelect(c)}
                className="flex items-center gap-3 py-3 px-2 hover:bg-gray-50 rounded-2xl text-left border-b border-gray-50">
                <div className="w-11 h-11 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold shrink-0">{c.nombre.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{c.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{c.telefono}{c.domicilio ? ` · ${c.domicilio}` : ''}</p>
                </div>
              </button>
            ))}
            {filtrados.length > 0 && <button onClick={() => onSelect(null)} className="mt-3 text-blue-600 font-bold text-sm py-2 hover:bg-blue-50 rounded-full">Vender sin cliente</button>}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black text-gray-900">Nuevo cliente</h2>
              <button onClick={() => setModo('lista')} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-1.5">Nombre</label>
                <input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del cliente"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-1.5">Móvil/WhatsApp</label>
                <div className="flex items-center border-2 border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500 gap-2">
                  <span className="font-bold text-gray-700 shrink-0">🇲🇽 +52</span>
                  <input value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Móvil del cliente" className="outline-none w-full" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-1.5">Email</label>
                <input value={f.email} onChange={e => set('email', e.target.value)} placeholder="Email del cliente"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-1.5">Domicilio</label>
                <input value={f.domicilio} onChange={e => set('domicilio', e.target.value)} placeholder="Calle, Ciudad y código postal"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 block mb-1.5">Detalles del domicilio</label>
                <input value={f.detalles} onChange={e => set('detalles', e.target.value)} placeholder="Referencias, interior, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModo('lista')} className="flex-1 border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cancelar</button>
              <button onClick={() => { if (f.nombre) onCrear({ ...f, id: `c-${Date.now()}` }); }} disabled={!f.nombre}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-full">Guardar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ MODAL: PROGRAMAR PEDIDO (Pickup / Reparto) ============
function ProgramarPedidoModal({ entrega, cliente, onAbrirClientes, onClose, onGuardar }) {
  const ahora = new Date();
  const [f, setF] = useState({
    modo: entrega.modo === 'En sitio' ? 'Pickup' : entrega.modo,
    hora: entrega.hora || `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`,
    fecha: entrega.fecha || ahora.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }),
    domicilio: entrega.domicilio || (cliente?.domicilio ?? ''),
    detalles: entrega.detalles || (cliente?.detalles ?? ''),
    tarifa: entrega.tarifa || '',
  });
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const esReparto = f.modo === 'Reparto';

  // Si se asigna/cambia el cliente con el modal abierto, autollenar su
  // dirección al instante (sin sobrescribir lo que el usuario haya escrito).
  useEffect(() => {
    if (cliente) setF(prev => ({
      ...prev,
      domicilio: prev.domicilio || cliente.domicilio || '',
      detalles: prev.detalles || cliente.detalles || '',
    }));
  }, [cliente]);

  const copiarInfo = () => {
    const txt = `Pedido ${f.modo} · ${f.fecha} ${f.hora}\nCliente: ${cliente?.nombre || 'Mostrador'}\n${esReparto ? 'Entregar en' : 'Recoger en'}: ${f.domicilio}\n${f.detalles}`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 pt-6 pb-2 shrink-0">
          <h2 className="text-2xl font-black text-gray-900">Programar pedido</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="overflow-y-auto px-7 pb-4">
          <div className="flex items-center gap-4 mb-6 mt-3">
            <div className="border border-gray-200 rounded-full p-1 flex">
              <button onClick={() => set('modo', 'Pickup')} className={`px-5 py-2 rounded-full text-sm font-bold ${!esReparto ? 'bg-gray-800 text-white' : 'text-gray-700'}`}>Pickup</button>
              <button onClick={() => set('modo', 'Reparto')} className={`px-5 py-2 rounded-full text-sm font-bold ${esReparto ? 'bg-gray-800 text-white' : 'text-gray-700'}`}>Reparto</button>
            </div>
            <button onClick={onAbrirClientes} className="border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2 font-bold text-gray-900 hover:bg-gray-50">
              {cliente ? cliente.nombre : 'Cliente'} <UserPlus className="w-5 h-5" />
            </button>
          </div>

          <h3 className="font-black text-gray-900 mb-3">Programar entrega</h3>
          <div className="flex gap-3 mb-5">
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 gap-2 focus-within:border-blue-500">
              <Clock className="w-5 h-5 text-gray-500" />
              <input value={f.hora} onChange={e => set('hora', e.target.value)} className="outline-none w-16 font-bold text-gray-900" />
            </div>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 gap-2 focus-within:border-blue-500">
              <Clock className="w-5 h-5 text-gray-500" />
              <input value={f.fecha} onChange={e => set('fecha', e.target.value)} className="outline-none w-28 font-bold text-gray-900" />
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between mb-5">
            <span className="font-black text-gray-900">{cliente ? cliente.nombre : 'Cliente'}</span>
            <button onClick={onAbrirClientes} className="text-blue-600 font-bold hover:underline">{cliente ? 'Cambiar' : 'Agregar'}</button>
          </div>

          <h3 className="font-black text-gray-900 mb-3">{esReparto ? 'Entregar en' : 'Recoger en'}</h3>
          <label className="text-sm font-bold text-gray-700 block mb-1.5">Domicilio (Calle, Ciudad y código postal)</label>
          <input value={f.domicilio} onChange={e => set('domicilio', e.target.value)} placeholder="Dirección de entrega"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 mb-4" />
          <label className="text-sm font-bold text-gray-700 block mb-1.5">Detalles</label>
          <input value={f.detalles} onChange={e => set('detalles', e.target.value)} placeholder="Referencias, interior, etc."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 mb-4" />
          {esReparto && (
            <>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Tarifa de reparto</label>
              <input type="number" value={f.tarifa} onChange={e => set('tarifa', e.target.value)} placeholder="$0.00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 mb-2 font-bold" />
            </>
          )}
        </div>
        <div className="px-7 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button onClick={copiarInfo} className="flex items-center gap-2 font-bold text-gray-700 hover:text-blue-600"><Copy className="w-4 h-4" /> Copiar info</button>
          <button onClick={() => onGuardar({ ...f, tarifa: esReparto ? (parseFloat(f.tarifa) || 0) : 0 })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-blue-600/25">
            Programar {esReparto ? 'reparto' : 'pickup'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL: DESCUENTO GLOBAL (% o $) ============
function DescuentoModal({ subtotal, descuento, onClose, onAplicar }) {
  const [modoPct, setModoPct] = useState(false);
  const [valor, setValor] = useState(descuento || '');
  const num = parseFloat(valor) || 0;
  const monto = modoPct ? Math.min(subtotal, subtotal * num / 100) : Math.min(subtotal, num);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-900 mb-5">Descuento en: {money(subtotal)}</h2>
        <div className="bg-gray-100 rounded-full p-1 flex mb-5">
          <button onClick={() => setModoPct(true)} className={`flex-1 py-2 rounded-full text-sm font-bold ${modoPct ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}>Porcentaje (%)</button>
          <button onClick={() => setModoPct(false)} className={`flex-1 py-2 rounded-full text-sm font-bold ${!modoPct ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}>Monto ($)</button>
        </div>
        <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 mb-2 focus-within:border-blue-500">
          <span className="text-gray-400 font-bold mr-2">{modoPct ? '%' : '$'}</span>
          <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0" className="w-full outline-none text-lg font-bold" />
        </div>
        {num > 0 && <p className="text-sm text-gray-500 font-semibold mb-4">Descuento: {money(monto)}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cancelar</button>
          <button onClick={() => onAplicar(monto)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-full">Continuar</button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL: AGREGAR NOTA ============
function NotaModal({ nota, onClose, onGuardar }) {
  const [txt, setTxt] = useState(nota || '');
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-900 mb-4">Agregar nota</h2>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Ej. Sin cebolla, salsa aparte..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 resize-none h-28 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cancelar</button>
          <button onClick={() => onGuardar(txt)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-full">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL: PAGO ============
function PagoModal({ total, onClose, onPagar, onPosponer, tieneCliente }) {
  const [recibido, setRecibido] = useState('');
  const [propina, setPropina] = useState(0);
  const [showPropina, setShowPropina] = useState(false);
  const [avisoCliente, setAvisoCliente] = useState(false);

  const totalPagar = total + propina;
  const quick = useMemo(() => {
    const exact = totalPagar;
    const r50 = Math.ceil(totalPagar / 50) * 50 + (totalPagar % 50 === 0 ? 50 : 0);
    const r100 = Math.ceil(totalPagar / 100) * 100 + (totalPagar % 100 === 0 ? 100 : 0);
    return [...new Set([exact, r50, r100])];
  }, [totalPagar]);

  const recNum = parseFloat(recibido) || 0;
  const metodos = [
    { id: 'Venta a crédito', icon: TrendingDown, red: true, requiereCliente: true },
    { id: 'Débito', icon: CreditCard },
    { id: 'Crédito', icon: CreditCard },
    { id: 'Transferencia', icon: ArrowLeftRight },
    { id: 'Saldo monedero', icon: Wallet, requiereCliente: true },
  ];

  const pagarCon = (m) => {
    if (m.requiereCliente && !tieneCliente) { setAvisoCliente(true); return; }
    onPagar(m.id, totalPagar, propina);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Pago</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Total a pagar</p>
            <p className="text-5xl font-black text-gray-900 tracking-tight">{money(totalPagar)}</p>
            {!showPropina ? (
              <button onClick={() => setShowPropina(true)} className="mt-3 inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold px-4 py-2 rounded-full">
                <Plus className="w-4 h-4" /> Agregar propina
              </button>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-2">
                {[0, 10, 15, 20].map(p => (
                  <button key={p} onClick={() => setPropina(Math.round(total * p) / 100)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold ${Math.round(total * p) / 100 === propina ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {p === 0 ? 'Sin propina' : `${p}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-gray-800">Recibido en Efectivo</p>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500">
              <span className="text-gray-400 font-bold mr-2">$</span>
              <input type="number" value={recibido} onChange={e => setRecibido(e.target.value)}
                placeholder="0.00" className="w-full outline-none text-lg font-bold text-gray-900 placeholder-gray-300" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quick.map(q => (
                <button key={q} onClick={() => setRecibido(String(q))}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-full text-sm transition-colors">{money(q)}</button>
              ))}
            </div>
            {recNum >= totalPagar && recNum > 0 && (
              <button onClick={() => onPagar('Efectivo', recNum, propina)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-full text-base shadow-lg shadow-blue-600/25">
                Recibir {money(recNum)} en Efectivo {recNum > totalPagar ? `· Cambio ${money(recNum - totalPagar)}` : ''}
              </button>
            )}
            {onPosponer && (
              <button onClick={onPosponer}
                className="w-full border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold py-3 rounded-full text-sm">
                Cobrar y posponer entrega
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-gray-800 text-center mb-3">Otro método de pago</p>
            <div className="grid grid-cols-2 gap-2.5">
              {metodos.map(m => (
                <button key={m.id} onClick={() => pagarCon(m)}
                  className="border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-colors">
                  <m.icon className={`w-6 h-6 ${m.red ? 'text-rose-600' : 'text-blue-600'}`} />
                  <span className="text-sm font-semibold text-gray-800">{m.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {avisoCliente && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7 text-center">
            <h3 className="text-lg font-black text-gray-900 mb-2">Selecciona un cliente</h3>
            <p className="text-gray-500 text-sm mb-5">Para utilizar este método de pago, antes debes seleccionar un cliente.</p>
            <button onClick={() => setAvisoCliente(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-full">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MODAL: VENTA EXITOSA / PEDIDO GUARDADO ============
function SuccessModal({ venta, primeraVenta, onContinuar, onVerTicket }) {
  const guardado = !venta.pagado;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-10 text-center relative overflow-hidden">
        {guardado ? (
          <>
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-12 h-12 text-emerald-600" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Pedido guardado</h2>
            <p className="text-4xl font-black text-gray-900 mb-1">{money(venta.total)}</p>
            <p className="text-gray-500 font-semibold mb-6">Pago pendiente: {money(venta.total)}</p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-blue-900" strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-6">{primeraVenta ? '¡Tu primera venta!' : '¡Venta registrada!'}</h2>
            <p className="text-blue-600 text-sm font-bold mb-1">Ver reportes</p>
            <p className="text-3xl font-black text-gray-900 mb-2">+{money(venta.total)}</p>
            {venta.cambio > 0 && <p className="text-sm font-bold text-gray-500 bg-gray-100 inline-block px-4 py-1.5 rounded-full mb-4">Cambio: {money(venta.cambio)}</p>}
          </>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={onContinuar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-blue-600/25">{guardado ? 'Nueva venta' : 'Continuar'}</button>
          <button onClick={onVerTicket} className="border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold px-6 py-3 rounded-full flex items-center gap-2"><Receipt className="w-4 h-4" /> Ver ticket</button>
        </div>
      </div>
    </div>
  );
}

// ============ MODAL: REGISTRAR COBRO (pedidos pendientes) ============
function RegistrarCobroModal({ orden, onClose, onCobrar }) {
  const [recibido, setRecibido] = useState('');
  const recNum = parseFloat(recibido) || 0;
  const quick = [...new Set([orden.total, Math.ceil(orden.total / 100) * 100 + (orden.total % 100 === 0 ? 100 : 0), Math.ceil(orden.total / 500) * 500 + (orden.total % 500 === 0 ? 500 : 0)])];
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-gray-900 mb-1">Registrar cobro</h2>
        <p className="text-gray-500 font-semibold mb-4">Efectivo · Pedido #{orden.folio}</p>
        <p className="text-4xl font-black text-gray-900 text-center mb-5">{money(orden.total)}</p>
        <p className="text-sm font-bold text-gray-800 mb-2">Monto recibido</p>
        <div className="flex items-center border-2 border-gray-200 rounded-xl px-4 py-3 mb-3 focus-within:border-blue-500">
          <span className="text-gray-400 font-bold mr-2">$</span>
          <input type="number" value={recibido} onChange={e => setRecibido(e.target.value)} placeholder="0.00" className="w-full outline-none text-lg font-bold" />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {quick.map(q => (
            <button key={q} onClick={() => setRecibido(String(q))} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-full text-xs">{money(q)}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cancelar</button>
          <button onClick={() => onCobrar(recNum)} disabled={recNum < orden.total}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-full">
            Recibir: {money(recNum)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PANEL: COMPROBANTE (Ticket / Factura, estilo Yimi) ============
function TicketPanel({ venta, ajustes, onClose, onPersonalizar }) {
  const [tab, setTab] = useState('Ticket');
  const nItems = venta.items.reduce((s, i) => s + i.cantidad, 0);
  const fechaLarga = fmtFechaLarga(getTimestamp(venta));
  const ticketRef = useRef(null);
  const nombreArchivo = `Ticket-${venta.folio}-${(ajustes.nombre || 'Lumen').replace(/[^a-z0-9]+/gi, '-')}.png`;

  const bajarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const generarImagen = async () => {
    const h2c = typeof window !== 'undefined' ? window.html2canvas : null;
    if (!h2c || !ticketRef.current) { alert('El generador de imagen se está cargando. Intenta de nuevo en unos segundos.'); return null; }
    const canvas = await h2c(ticketRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    return await new Promise(res => canvas.toBlob(b => res(b), 'image/png'));
  };
  const descargar = async () => { const blob = await generarImagen(); if (blob) bajarBlob(blob, nombreArchivo); };
  const compartir = async () => {
    const blob = await generarImagen(); if (!blob) return;
    const file = new File([blob], nombreArchivo, { type: 'image/png' });
    const texto = `Comprobante #${venta.folio} · ${ajustes.nombre || ''} · Total ${money(venta.total)}`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Comprobante', text: texto }); return; }
      if (navigator.share) { await navigator.share({ title: 'Comprobante', text: texto }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    // Respaldo: si el dispositivo no permite compartir, se descarga la imagen.
    bajarBlob(blob, nombreArchivo);
    alert('Tu dispositivo no permite compartir directamente; descargué la imagen del ticket para que la envíes.');
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Comprobante</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="bg-gray-100 rounded-full p-1 flex">
            {['Ticket', 'Factura'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-full text-sm font-bold ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}>{t}</button>
            ))}
          </div>
          <button onClick={onPersonalizar} className="flex items-center gap-1.5 text-blue-600 font-bold text-sm hover:underline">
            <Settings className="w-4 h-4" /> Personalizar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/60">
          {tab === 'Ticket' ? (
            <div ref={ticketRef} className="bg-white shadow-sm p-6 [clip-path:polygon(0_8px,2.5%_0,5%_8px,7.5%_0,10%_8px,12.5%_0,15%_8px,17.5%_0,20%_8px,22.5%_0,25%_8px,27.5%_0,30%_8px,32.5%_0,35%_8px,37.5%_0,40%_8px,42.5%_0,45%_8px,47.5%_0,50%_8px,52.5%_0,55%_8px,57.5%_0,60%_8px,62.5%_0,65%_8px,67.5%_0,70%_8px,72.5%_0,75%_8px,77.5%_0,80%_8px,82.5%_0,85%_8px,87.5%_0,90%_8px,92.5%_0,95%_8px,97.5%_0,100%_8px,100%_100%,0_100%)]">
              <div className="text-right mb-1 mt-2">
                <p className="text-2xl font-black" style={{ color: ajustes.colorTicket }}>Ticket</p>
                <p className="font-bold text-gray-900">#{venta.folio}</p>
                {venta.pagado
                  ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><Check className="w-3 h-3" /> Pagado</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-full">Pago pendiente</span>}
              </div>
              {ajustes.encabezado && <p className="text-xs text-gray-500 mb-1">{ajustes.encabezado}</p>}
              <p className="font-black text-gray-900 text-lg">{ajustes.nombre}</p>
              <p className="text-xs text-gray-500 mb-2">{ajustes.whatsapp ? `+52 ${ajustes.whatsapp} · ` : ''}{ajustes.calle || ''}{ajustes.detallesDir ? ` · ${ajustes.detallesDir}` : ''}</p>
              {ajustes.mostrarDatosCliente && (
                <p className="text-sm text-gray-800 font-bold border-t border-gray-100 pt-2">{venta.cliente || 'Mostrador'}</p>
              )}
              <p className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2"><EntregaIcon modo={venta.entrega?.modo} className="w-4 h-4" /> {venta.entrega?.modo || 'En sitio'}</p>
              {venta.entrega?.modo !== 'En sitio' && venta.entrega?.domicilio && (
                <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {venta.entrega.domicilio} · {venta.entrega.fecha} {venta.entrega.hora}</p>
              )}
              {venta.nota && <p className="text-gray-500 text-xs mb-2 flex items-center gap-1"><StickyNote className="w-3 h-3" /> {venta.nota}</p>}
              <p className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-2 text-sm mt-3">{venta.items.length} artículos (Cant.: {nItems})</p>
              {venta.items.map(i => (
                <div key={i.id} className="flex justify-between py-2 text-sm border-b border-gray-50">
                  <span className="text-gray-800"><span className="font-bold mr-2">{i.cantidad}x</span>{i.nombre}</span>
                  <span className="font-bold text-gray-900">{money(i.precio * i.cantidad)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm text-gray-500"><span>Subtotal:</span><span className="font-bold">{money(venta.subtotal ?? venta.total)}</span></div>
              {venta.descuento > 0 && <div className="flex justify-between pt-1 text-sm text-gray-500"><span>Descuento:</span><span className="font-bold">-{money(venta.descuento)}</span></div>}
              {venta.impuesto > 0 && <div className="flex justify-between pt-1 text-sm text-gray-500"><span>{venta.impuestoDesc || 'Impuesto'}:</span><span className="font-bold">{money(venta.impuesto)}</span></div>}
              {venta.entrega?.tarifa > 0 && <div className="flex justify-between pt-1 text-sm text-gray-500"><span>Tarifa de reparto:</span><span className="font-bold">{money(venta.entrega.tarifa)}</span></div>}
              <div className="flex justify-between pt-3 text-base font-black text-gray-900"><span>Total:</span><span>{money(venta.total)}</span></div>
              <div className="flex justify-between pt-1 text-sm text-gray-500"><span>Método</span><span className="font-bold">{venta.metodo || 'Pendiente'}</span></div>
              <p className="text-center text-sm font-bold mt-5" style={{ color: ajustes.colorTicket }}>{ajustes.pie || 'Gracias por su compra'}</p>
              <p className="text-center text-[11px] text-gray-400 mt-1">{fechaLarga} · {venta.fecha || fmtHora(getTimestamp(venta))} · {ajustes.nombre}</p>
            </div>
          ) : (
            <div ref={ticketRef} className="bg-white shadow-sm rounded-xl p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-2xl font-black" style={{ color: ajustes.colorTicket }}>Factura</p>
                  <p className="text-xs text-gray-500 font-bold">INV{String(venta.folio).padStart(4, '0')}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">Fecha</p>
                  <p className="font-bold text-gray-900">{fechaLarga}</p>
                  <p className="text-gray-500 mt-2">Saldo pendiente</p>
                  <p className="font-black text-gray-900">{money(venta.pagado ? 0 : venta.total)}</p>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 text-left">
                    <th className="py-2 font-bold">Descripción</th>
                    <th className="py-2 font-bold text-center">Cant.</th>
                    <th className="py-2 font-bold text-right">P.U.</th>
                    <th className="py-2 font-bold text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="py-2.5 font-bold text-gray-900">{i.nombre}</td>
                      <td className="py-2.5 text-center text-gray-700">{i.cantidad}</td>
                      <td className="py-2.5 text-right text-gray-700">{money(i.precio)}</td>
                      <td className="py-2.5 text-right font-bold text-gray-900">{money(i.precio * i.cantidad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-bold">{money(venta.subtotal ?? venta.total)}</span></div>
                {venta.impuesto > 0 && <div className="flex justify-between text-gray-500"><span>{venta.impuestoDesc || 'Impuesto'}</span><span className="font-bold">{money(venta.impuesto)}</span></div>}
                <div className="flex justify-between font-black text-gray-900 text-base pt-1"><span>Total</span><span>{money(venta.total)}</span></div>
                {venta.pagado && venta.metodo && <div className="flex justify-between text-gray-500 pt-2"><span>Abono: {venta.metodo}</span><span className="font-bold">{money(venta.total)}</span></div>}
                <div className="flex justify-between text-gray-500"><span>Saldo pendiente</span><span className="font-bold">{money(venta.pagado ? 0 : venta.total)}</span></div>
              </div>
              <p className="text-center text-sm font-bold mt-5" style={{ color: ajustes.colorTicket }}>{ajustes.pie || 'Gracias por su compra'}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 grid grid-cols-3 gap-3">
          <button onClick={() => typeof window !== 'undefined' && window.print && window.print()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 flex flex-col items-center gap-1 font-bold text-sm"><Printer className="w-5 h-5" /> Imprimir</button>
          <button onClick={descargar} className="border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-2xl py-3.5 flex flex-col items-center gap-1 font-bold text-sm"><Download className="w-5 h-5" /> Descargar</button>
          <button onClick={compartir} className="border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-2xl py-3.5 flex flex-col items-center gap-1 font-bold text-sm"><Share2 className="w-5 h-5" /> Compartir</button>
        </div>
      </div>
    </div>
  );
}

// ============ VISTA: VENDER (POS) ============
function ViewVender(props) {
  const {
    products, cart, addToCart, updateQty, cliente, setShowClientes,
    descuento, entrega, nota, cobrar, guardarPedido, limpiarCarrito, goNuevoProducto,
    setShowProgramar, setShowDescuento, setShowNota, impuesto, permitirSinStock, onTipoPedido,
    guardarLabel, ocultarCobrar, mesaBanner, mesasActivas, mesas, mesaSel, onElegirMesa
  } = props;
  const [busqueda, setBusqueda] = useState('');
  const [showAcciones, setShowAcciones] = useState(false);
  const [showMesaPicker, setShowMesaPicker] = useState(false);
  const [movilVista, setMovilVista] = useState('productos'); // productos | carrito (solo móvil)

  const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const total = Math.max(0, subtotal - descuento) + (impuesto?.monto || 0) + (entrega.tarifa || 0);
  const nItems = cart.reduce((s, i) => s + i.cantidad, 0);
  const filtrados = products.filter(p => norm(p.nombre).includes(norm(busqueda)));

  return (
    <div className="flex flex-col h-full">
      {/* Cambio de pestaña en móvil */}
      <div className="md:hidden flex gap-2 px-3 pt-3">
        <button onClick={() => setMovilVista('productos')}
          className={`flex-1 py-2.5 rounded-full font-bold text-sm ${movilVista === 'productos' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600'}`}>Productos</button>
        <button onClick={() => setMovilVista('carrito')}
          className={`flex-1 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 ${movilVista === 'carrito' ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600'}`}>
          Carrito {nItems > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${movilVista === 'carrito' ? 'bg-white/25' : 'bg-blue-600 text-white'}`}>{nItems}</span>}
        </button>
      </div>
    <div className="flex flex-1 min-h-0 gap-3 md:gap-5 p-3 md:p-5">
      {/* Carrito (izquierda, estilo Yimi) */}
      <div className={`${movilVista === 'carrito' ? 'flex' : 'hidden'} md:flex w-full md:w-[380px] bg-white rounded-3xl shadow-sm flex-col shrink-0 overflow-visible`}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-gray-900">Venta</h2>
          <div className="relative">
            <button onClick={() => setShowAcciones(!showAcciones)} className="p-2 hover:bg-gray-100 rounded-full">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showAcciones && (
              <div className="absolute right-0 top-10 bg-white shadow-xl rounded-2xl border border-gray-100 py-2 w-56 z-30">
                <button onClick={() => { setShowAcciones(false); setShowProgramar(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 text-left"><ShoppingBag className="w-4 h-4" /> Tipo de pedido</button>
                <button onClick={() => { setShowAcciones(false); setShowDescuento(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 text-left"><Percent className="w-4 h-4" /> Descuento global</button>
                <button onClick={() => { setShowAcciones(false); setShowNota(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 text-left"><StickyNote className="w-4 h-4" /> Agregar nota</button>
                <button onClick={() => { setShowAcciones(false); limpiarCarrito(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 text-left"><Trash2 className="w-4 h-4" /> Limpiar carrito</button>
              </div>
            )}
          </div>
        </div>
        {mesaBanner && (
          <div className="mx-4 mb-2 bg-blue-600 text-white rounded-2xl py-2.5 px-4 flex items-center justify-between shadow-sm">
            <span className="font-black flex items-center gap-2"><Utensils className="w-4 h-4" /> Mesa {mesaBanner.num}</span>
            <button onClick={mesaBanner.onSalir} className="text-white/90 hover:text-white text-xs font-bold underline">Salir</button>
          </div>
        )}
        <button onClick={() => setShowClientes(true)}
          className="mx-4 mb-2 bg-gray-100 hover:bg-gray-200 rounded-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-gray-800 transition-colors">
          <UserPlus className="w-4 h-4" /> {cliente ? cliente.nombre : 'Asignar cliente'}
        </button>
        {/* Selector rápido de tipo de pedido (Pickup disponible en menú ⋯ → Tipo de pedido) */}
        <div className="mx-4 mb-2 bg-gray-100 rounded-full p-1 flex">
          {['En sitio', 'Reparto'].map(m => (
            <button key={m} onClick={() => onTipoPedido(m)}
              className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${entrega.modo === m ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}>
              <EntregaIcon modo={m} className="w-3.5 h-3.5" /> {m}
            </button>
          ))}
        </div>
        {mesasActivas && entrega.modo === 'En sitio' && (
          <button onClick={() => setShowMesaPicker(true)}
            className={`mx-4 mb-2 rounded-2xl py-2.5 px-4 flex items-center justify-between gap-2 text-sm font-bold border ${mesaSel ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
            <span className="flex items-center gap-2"><Utensils className="w-4 h-4" /> {mesaSel ? `Mesa ${mesaSel.num}` : 'Asignar mesa'}</span>
            {mesaSel
              ? <span onClick={e => { e.stopPropagation(); onElegirMesa(null); }} className="p-0.5 rounded hover:bg-blue-100"><X className="w-4 h-4" /></span>
              : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
        )}
        {entrega.modo !== 'En sitio' && (
          <button onClick={() => setShowProgramar(true)}
            className="mx-4 mb-2 border border-blue-200 bg-blue-50 rounded-2xl py-2.5 px-4 flex items-center gap-2 text-sm font-bold text-blue-700">
            <EntregaIcon modo={entrega.modo} className="w-4 h-4" />
            {entrega.modo} · {entrega.fecha} {entrega.hora}
            {entrega.domicilio ? <span className="font-semibold text-blue-500 truncate">· {entrega.domicilio}</span> : <span className="font-semibold text-rose-500">· Falta dirección</span>}
          </button>
        )}
        {nota && (
          <button onClick={() => setShowNota(true)} className="mx-4 mb-2 text-left text-xs text-gray-500 flex items-center gap-1.5 px-2"><StickyNote className="w-3.5 h-3.5" /> {nota}</button>
        )}

        <div className="flex-1 overflow-y-auto px-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
              <div className="text-gray-300"><Utensils className="w-14 h-14" /></div>
              <p className="text-lg font-bold text-gray-400">Carrito vacío</p>
              <p className="text-sm text-gray-400">Añade artículos a la venta</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
                <button onClick={() => updateQty(item.id, -1)} className="px-2 py-2 hover:bg-gray-100 text-gray-500">
                  {item.cantidad === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                </button>
                <span className="w-7 text-center font-bold text-sm text-gray-900">{item.cantidad}</span>
                <button onClick={() => updateQty(item.id, 1)} className="px-2 py-2 hover:bg-gray-100 text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{item.nombre}</p>
                <p className="text-xs text-gray-400">{money(item.precio)} / unidad</p>
              </div>
              <p className="font-bold text-gray-900 text-sm">{money(item.precio * item.cantidad)}</p>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-gray-100">
          {cart.length > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-400 font-semibold mb-1">
                <span>Subtotal – {nItems} ítems</span><span className="text-gray-900">{money(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-sm text-gray-400 font-semibold mb-1">
                  <span>Descuento</span><span className="text-rose-600">-{money(descuento)}</span>
                </div>
              )}
              {impuesto?.monto > 0 && (
                <div className="flex justify-between text-sm text-gray-400 font-semibold mb-1">
                  <span>{impuesto.desc}</span><span className="text-gray-900">{money(impuesto.monto)}</span>
                </div>
              )}
              {entrega.tarifa > 0 && (
                <div className="flex justify-between text-sm text-gray-400 font-semibold mb-1">
                  <span>Tarifa de reparto</span><span className="text-gray-900">{money(entrega.tarifa)}</span>
                </div>
              )}
              {descuento === 0 && (
                <button onClick={() => setShowDescuento(true)} className="text-blue-600 text-sm font-bold text-right w-full mb-1 hover:underline">Agregar descuento</button>
              )}
              <div className="flex justify-between items-center text-gray-900 font-bold mb-3">
                <span className="flex items-center gap-2">Total
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Sin pagar</span>
                </span>
                <span>{money(total)}</span>
              </div>
            </>
          )}
          <button onClick={guardarPedido} disabled={cart.length === 0}
            className="w-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-900 font-bold py-3 rounded-full mb-2 flex items-center justify-center gap-2 text-sm">
            <Save className="w-4 h-4" /> {guardarLabel || 'Guardar Pedido'}
          </button>
          {!ocultarCobrar && (
            <button onClick={cobrar} disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-full shadow-lg shadow-blue-600/25 disabled:shadow-none transition-colors">
              Cobrar: {money(total)}
            </button>
          )}
        </div>
      </div>

      {/* Grid de productos (derecha) */}
      <div className={`${movilVista === 'productos' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2.5 w-full md:w-80 shadow-sm focus-within:border-blue-400">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Búsqueda rápida"
              className="outline-none text-sm w-full text-gray-800 placeholder-gray-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filtrados.map(p => <ProductTile key={p.id} product={p} sinStockOk={permitirSinStock} onClick={() => addToCart(p)} />)}
            <button onClick={goNuevoProducto}
              className="rounded-xl bg-white border-2 border-dashed border-gray-200 hover:border-blue-400 h-40 flex flex-col items-center justify-center gap-2 transition-colors">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><Plus className="w-6 h-6 text-white" /></div>
              <span className="text-blue-600 font-bold text-sm">Nuevo Producto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    {/* Barra flotante en móvil: al tocar producto salta al carrito */}
    {nItems > 0 && movilVista === 'productos' && (
      <button onClick={() => setMovilVista('carrito')}
        className="md:hidden fixed bottom-4 left-3 right-3 z-20 bg-blue-600 text-white font-bold py-3.5 rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-between px-6">
        <span>Ver carrito · {nItems}</span><span>{money(total)}</span>
      </button>
    )}
    {showMesaPicker && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMesaPicker(false)}>
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">Elegir mesa</h2>
            <button onClick={() => setShowMesaPicker(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
          </div>
          {(!mesas || mesas.length === 0) ? (
            <p className="text-gray-400 font-semibold text-center py-6">No hay mesas configuradas. Agrégalas en Ajustes → Mesas.</p>
          ) : (
            <>
              <button onClick={() => { onElegirMesa(null); setShowMesaPicker(false); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold text-gray-700 mb-4">Sin mesa</button>
              {[...new Set(mesas.map(m => m.zona))].map(zona => (
                <div key={zona} className="mb-3">
                  <p className="font-bold text-gray-500 text-xs mb-2">{zona}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {mesas.filter(m => m.zona === zona).map(m => (
                      <button key={m.id} onClick={() => { onElegirMesa(m); setShowMesaPicker(false); }}
                        className={`py-3 rounded-xl font-black border-2 transition-colors ${mesaSel && mesaSel.num === m.num ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-800'}`}>{m.num}</button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    )}
    </div>
  );
}

// ============ VISTA: PEDIDOS (tabla estilo Yimi + estados) ============
function ViewPedidos({ ordenes, goVender, onVerTicket, onRegistrarCobro, onAvanzarEstado, onCancelar, onEliminar, onLimpiarCanceladas }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos'); // Todos | Abiertos | Completados
  const ABIERTOS = ['Pendiente', 'Confirmado', 'En camino'];
  const esAbierto = (o) => ABIERTOS.includes(o.estadoEntrega);
  const nAbiertos = ordenes.filter(esAbierto).length;
  const nCompletados = ordenes.filter(o => o.estadoEntrega === 'Entregado').length;
  const nCanceladas = ordenes.filter(o => o.estadoEntrega === 'Cancelado').length;
  const coincideEstado = (o) => filtroEstado === 'Abiertos' ? esAbierto(o)
    : filtroEstado === 'Completados' ? o.estadoEntrega === 'Entregado' : true;
  const filtradas = ordenes.filter(o => coincideEstado(o) && norm(`#${o.folio} ${o.cliente || ''} ${o.entrega?.modo || ''}`).includes(norm(busqueda)));

  const chipEstado = (e) => {
    const map = {
      'Pendiente': 'text-amber-700 bg-amber-50 border-amber-200',
      'Confirmado': 'text-blue-700 bg-blue-50 border-blue-200',
      'En camino': 'text-purple-700 bg-purple-50 border-purple-200',
      'Entregado': 'text-emerald-700 bg-emerald-50 border-emerald-200',
      'Cancelado': 'text-rose-700 bg-rose-50 border-rose-200',
    };
    return map[e] || 'text-gray-600 bg-gray-50 border-gray-200';
  };
  const siguienteAccion = (o) => {
    if (o.estadoEntrega === 'Pendiente') return 'Confirmar';
    if (o.estadoEntrega === 'Confirmado') return o.entrega?.modo === 'Reparto' ? 'Enviar' : 'Entregar';
    if (o.estadoEntrega === 'En camino') return 'Entregar';
    return null;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black text-gray-900 mb-6">Pedidos</h1>
      <div className="bg-white rounded-3xl shadow-sm p-6 min-h-[420px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center border border-gray-200 rounded-full px-4 py-2.5 w-56 md:w-72 focus-within:border-blue-400">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Búsqueda rápida" className="outline-none text-sm w-full" />
            </div>
            <div className="bg-gray-100 rounded-full p-1 flex text-sm font-bold">
              {[['Todos', ordenes.length], ['Abiertos', nAbiertos], ['Completados', nCompletados]].map(([t, n]) => (
                <button key={t} onClick={() => setFiltroEstado(t)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${filtroEstado === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
                  {t} <span className="text-gray-400">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {nCanceladas > 0 && (
              <button onClick={onLimpiarCanceladas} className="flex items-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold px-4 py-3 rounded-full text-sm">
                <Trash2 className="w-4 h-4" /> Limpiar canceladas ({nCanceladas})
              </button>
            )}
            <button onClick={goVender} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-blue-600/25">Nuevo pedido</button>
          </div>
        </div>
        {filtradas.length === 0 ? (
          ordenes.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-3xl font-black text-gray-900 mb-2">No tienes pedidos</h2>
              <p className="text-gray-500 mb-6">Recibe pedidos de tu tienda en línea o registra manualmente uno.</p>
              <button onClick={goVender} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-blue-600/25">Nueva orden</button>
            </div>
          ) : (
            <div className="text-center py-20">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Sin pedidos {filtroEstado === 'Abiertos' ? 'abiertos' : filtroEstado === 'Completados' ? 'completados' : 'que coincidan'}</h2>
              <p className="text-gray-500">Prueba con otro filtro o cambia la búsqueda.</p>
            </div>
          )
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-900 font-black border-b border-gray-100">
                <th className="py-3">Ticket</th>
                <th className="py-3">Entrega</th>
                <th className="py-3">Cliente</th>
                <th className="py-3 text-right">Pago</th>
                <th className="py-3 text-center">Estado</th>
                <th className="py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(o => {
                const accion = siguienteAccion(o);
                const cancelado = o.estadoEntrega === 'Cancelado';
                return (
                  <tr key={o.id} className={`border-b border-gray-50 hover:bg-gray-50/60 ${cancelado ? 'opacity-60 line-through decoration-rose-300' : ''}`}>
                    <td className="py-4">
                      <button onClick={() => onVerTicket(o)} className="text-blue-600 font-bold hover:underline">#{o.folio}</button>
                      <span className="block text-[10px] text-gray-400 font-semibold whitespace-nowrap">{fmtFechaHora(getTimestamp(o))}</span>
                    </td>
                    <td className="py-4">
                      <span className="flex items-center gap-2 font-bold text-gray-800">
                        <EntregaIcon modo={o.entrega?.modo} className="w-4 h-4 text-gray-500" />
                        {o.entrega?.modo || 'En sitio'}
                        {o.entrega?.modo !== 'En sitio' && o.entrega?.fecha && <span className="text-xs text-gray-400 font-semibold">{o.entrega.fecha} {o.entrega.hora}</span>}
                      </span>
                    </td>
                    <td className="py-4 text-gray-700">{o.cliente || 'Mostrador'}</td>
                    <td className="py-4 text-right">
                      <span className="font-black text-gray-900">{money(o.total)}</span>
                      <span className={`block text-[10px] font-bold ${o.pagado ? 'text-emerald-600' : 'text-rose-600'}`}>{o.pagado ? 'Pagado' : 'Pago pendiente'}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${chipEstado(o.estadoEntrega)}`}>{o.estadoEntrega}</span>
                    </td>
                    <td className="py-4 text-right space-x-2 whitespace-nowrap no-underline">
                      {!cancelado && !o.pagado && (
                        <button onClick={() => onRegistrarCobro(o)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-full">Registrar cobro</button>
                      )}
                      {!cancelado && accion && (
                        <button onClick={() => onAvanzarEstado(o.id)} className="border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-bold px-3.5 py-2 rounded-full">{accion}</button>
                      )}
                      {!cancelado && o.estadoEntrega !== 'Entregado' && (
                        <button onClick={() => onCancelar(o.id)} className="border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold px-3.5 py-2 rounded-full">Cancelar</button>
                      )}
                      {cancelado && (
                        <button onClick={() => onEliminar(o.id)} title="Eliminar pedido cancelado"
                          className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 inline-flex"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============ VISTA: CREAR / EDITAR PRODUCTO ============
function CrearProducto({ inicial, onGuardar, onVolver }) {
  const [f, setF] = useState(inicial || { id: '', nombre: '', categoria: '', precio: '', costo: '', stock: '', stockMin: '', codigo: '', sku: '', color: '#2563eb', imagen: null, fav: false });
  const fileRef = useRef(null);
  const precio = parseFloat(f.precio) || 0;
  const costo = parseFloat(f.costo) || 0;
  const ganancia = precio - costo;
  const margen = precio > 0 ? (ganancia / precio) * 100 : 0;
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between z-10">
        <button onClick={onVolver} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-xl font-black text-gray-900">{f.id ? 'Editar Producto' : 'Crear Producto'}</h1>
        <button onClick={() => f.nombre && precio > 0 && onGuardar({ ...f, precio, costo, stock: parseInt(f.stock) || 0, stockMin: parseInt(f.stockMin) || 5 })}
          disabled={!f.nombre || precio <= 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-7 py-2.5 rounded-full text-sm shadow-lg shadow-blue-600/25 disabled:shadow-none">Guardar</button>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <div className="bg-blue-50/60 rounded-3xl p-6 flex items-center justify-center gap-10">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 w-24">
              {COLORES_TILE.map(c => (
                <button key={c} onClick={() => { set('color', c); set('imagen', null); }}
                  className={`w-6 h-6 rounded-md ${f.color === c && !f.imagen ? 'ring-2 ring-offset-1 ring-blue-600' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="w-44 rounded-xl overflow-hidden shadow-lg shrink-0">
            <div className="h-32 flex items-center justify-center relative" style={{ backgroundColor: f.imagen ? '#111' : f.color }}>
              {f.imagen ? <img src={f.imagen} className="absolute inset-0 w-full h-full object-cover" alt="" />
                : <span className="text-white font-bold text-lg px-2 text-center">{f.nombre || '--'}</span>}
            </div>
            <div className="bg-gray-700 px-3 py-1.5">
              <p className="text-white text-xs font-bold truncate">{f.nombre || '--'}</p>
              <p className="text-white/90 text-xs font-semibold">{money(precio)}</p>
            </div>
          </div>
          <button onClick={() => fileRef.current.click()} className="flex items-center gap-2 font-bold text-gray-800 hover:text-blue-600">
            <ImageIcon className="w-5 h-5" /> Galería
          </button>
          <input type="file" ref={fileRef} className="hidden" accept="image/*"
            onChange={e => { if (e.target.files[0]) imagenADataURL(e.target.files[0], 500, url => set('imagen', url)); }} />
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 grid grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label className="text-sm font-bold text-gray-800 block mb-1.5">Nombre del producto</label>
            <input value={f.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del producto"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-gray-900" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800 block mb-1.5">Categoría</label>
            <input value={f.categoria} onChange={e => set('categoria', e.target.value)} placeholder="Buscar o crear categoría"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-gray-900" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800 block mb-1.5">Precio</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500">
              <span className="text-gray-400 mr-1.5">$</span>
              <input type="number" value={f.precio} onChange={e => set('precio', e.target.value)} placeholder="0" className="w-full outline-none text-gray-900" />
            </div>
            <p className="text-sm text-gray-400 font-semibold mt-1.5">Margen {margen.toFixed(0)}%</p>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800 block mb-1.5">Costo por unidad</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500">
              <span className="text-gray-400 mr-1.5">$</span>
              <input type="number" value={f.costo} onChange={e => set('costo', e.target.value)} placeholder="0" className="w-full outline-none text-gray-900" />
            </div>
            <p className="text-sm text-gray-400 font-semibold mt-1.5">Ganancia {money(ganancia)}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6">
          <h3 className="font-black text-gray-900 mb-4">Inventario</h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1.5">Stock actual</label>
              <input type="number" value={f.stock} onChange={e => set('stock', e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1.5">Stock mínimo</label>
              <input type="number" value={f.stockMin} onChange={e => set('stockMin', e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1.5">Código de barras</label>
              <input value={f.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Código de barras"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1.5">SKU</label>
              <input value={f.sku} onChange={e => set('sku', e.target.value)} placeholder="SKU"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ VISTA: PRODUCTOS (tabla + stats) ============
function ViewProductos({ products, onNuevo, onEditar, onEliminar, onToggleFav, onStock }) {
  const [busqueda, setBusqueda] = useState('');
  const stats = useMemo(() => {
    const valor = products.reduce((s, p) => s + p.precio * p.stock, 0);
    const costo = products.reduce((s, p) => s + p.costo * p.stock, 0);
    return {
      valor, costo, ganancia: valor - costo,
      bajo: products.filter(p => p.stock > 0 && p.stock <= (p.stockMin || 5)).length,
      sin: products.filter(p => p.stock === 0).length,
      en: products.filter(p => p.stock > (p.stockMin || 5)).length,
    };
  }, [products]);
  const filtrados = products.filter(p => norm(p.nombre).includes(norm(busqueda)));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black text-gray-900 mb-1">Artículos <span className="text-base font-semibold text-gray-500 ml-2">{products.length} ítems registrados</span></h1>
      <div className="bg-white rounded-3xl shadow-sm p-6 mt-5">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center border border-gray-200 rounded-full px-4 py-2.5 w-64 focus-within:border-blue-400">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Búsqueda rápida" className="outline-none text-sm w-full" />
          </div>
          <button className="flex items-center gap-2 font-bold text-gray-700 px-4 py-2.5 hover:bg-gray-50 rounded-full text-sm"><Filter className="w-4 h-4" /> Filtros</button>
          <button className="flex items-center gap-2 font-bold text-gray-700 px-4 py-2.5 hover:bg-gray-50 rounded-full text-sm"><FolderOpen className="w-4 h-4" /> Categorías</button>
          <div className="flex-1" />
          <button onClick={onNuevo} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-blue-600/25 text-sm">Nuevo producto</button>
        </div>

        <div className="bg-gray-50 rounded-2xl px-6 py-4 flex items-center gap-10 mb-4 flex-wrap">
          <div><p className="font-black text-gray-900">{money(stats.valor)}</p><p className="text-xs text-gray-500 font-semibold">Valor en stock</p></div>
          <div><p className="font-black text-gray-900">{money(stats.costo)}</p><p className="text-xs text-gray-500 font-semibold">Costo de stock</p></div>
          <div><p className="font-black text-gray-900">{money(stats.ganancia)}</p><p className="text-xs text-gray-500 font-semibold">Ganancia estimada</p></div>
          <div><p className="font-black text-gray-900">{stats.bajo}</p><p className="text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Stock bajo</p></div>
          <div><p className="font-black text-gray-900">{stats.sin}</p><p className="text-xs font-semibold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Sin stock</p></div>
          <div><p className="font-black text-gray-900">{stats.en}</p><p className="text-xs text-gray-500 font-semibold">En stock</p></div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="py-3 w-10"><Star className="w-4 h-4" /></th>
              <th className="py-3 font-bold">Producto</th>
              <th className="py-3 font-bold">Categoría</th>
              <th className="py-3 font-bold text-center">Stock</th>
              <th className="py-3 font-bold text-right">Precio</th>
              <th className="py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 group">
                <td className="py-3">
                  <button onClick={() => onToggleFav(p.id)}>
                    <Star className={`w-4 h-4 ${p.fav ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                  </button>
                </td>
                <td className="py-3">
                  <button onClick={() => onEditar(p)} className="flex items-center gap-3 text-left">
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: p.imagen ? '#111' : p.color }}>
                      {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" alt="" /> : <span className="text-white text-[9px] font-bold px-0.5 text-center leading-tight">{p.nombre.slice(0, 10)}</span>}
                    </div>
                    <span className="font-bold text-gray-900">{p.nombre}</span>
                  </button>
                </td>
                <td className="py-3 text-gray-700">{p.categoria || 'Todos'}</td>
                <td className="py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onStock(p.id, -1)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Minus className="w-3 h-3" /></button>
                    <span className={`font-bold ${p.stock === 0 ? 'text-rose-600' : p.stock <= (p.stockMin || 5) ? 'text-amber-600' : 'text-gray-400'}`}>
                      {p.stock === 0 ? 'Sin stock' : p.stock <= (p.stockMin || 5) ? `${p.stock} (bajo)` : `${p.stock}`}
                    </span>
                    <button onClick={() => onStock(p.id, 1)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="py-3 text-right font-bold text-gray-900">{money(p.precio)}</td>
                <td className="py-3 text-right">
                  <button onClick={() => onEliminar(p.id)} className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ MODAL: ESCANER IA ============
function ScannerModal({ onClose, onGuardar, apiKey, modelo = 'gemini-3.0-flash' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(f);
      setResultado(null);
      setError(null);
    }
  };

  const analizarConOpenAI = async () => {
    if (!file) return;
    if (!apiKey) {
      setError('Por favor configura tu API Key de OpenAI en la pestaña Ajustes > IA.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base64Data = preview.split(',')[1];
      const mimeType = file.type;

      const prompt = `Analiza esta nota de consumo o pedido a mano y extrae la siguiente información en formato JSON estricto:
      {
        "tipo": "Ingreso",
        "monto": numero (intenta calcular la suma matemática de los precios si no hay un total escrito explícitamente),
        "categoria": "Ventas",
        "descripcion": "Extrae detalladamente TODOS los platillos leídos con su cantidad y precio si lo tienen. Usa este formato: '2x Tacos al pastor ($30), 1x Coca Cola ($20). Notas: Sin cebolla'. Si algún platillo no tiene precio escrito, solo pon el nombre y cantidad.",
        "fecha": "YYYY-MM-DD" (o déjalo vacío si no la encuentras),
        "folio": "Numero de ticket o comanda si aplica (o vacio)"
      }`;

      const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelo.trim(),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const textoRespuesta = data.choices[0].message.content;
      const cleanTexto = textoRespuesta.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonParsed = JSON.parse(cleanTexto);
      
      setResultado({
        tipo: jsonParsed.tipo || 'Ingreso',
        monto: String(jsonParsed.monto || ''),
        categoria: jsonParsed.categoria || 'Ventas',
        descripcion: jsonParsed.descripcion || '',
        folio: jsonParsed.folio || '',
        metodo: 'Efectivo', // Default
        pagado: true,
      });
    } catch (err) {
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')) {
        setError('Tu API Key no es válida. Revisa que la hayas copiado bien en Ajustes.');
      } else {
        setError('Error al analizar la imagen. Detalle: ' + err.message);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!resultado.monto || isNaN(resultado.monto) || Number(resultado.monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (!resultado.descripcion.trim()) {
      setError('Añade una descripción');
      return;
    }
    onGuardar({
      ...resultado,
      id: `mov-${Date.now()}`,
      monto: Number(resultado.monto),
      ts: Date.now() // Si se extrajo una fecha específica, podría parsearse aquí en el futuro
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Columna Izquierda: Imagen */}
        <div className="md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">Escáner IA</h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
          </div>
          
          <div 
            onClick={() => !loading && fileInputRef.current.click()} 
            className={`flex-1 min-h-[300px] border-2 border-dashed ${preview ? 'border-gray-200' : 'border-blue-300 bg-blue-50/50'} rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden relative`}
          >
            {preview ? (
              <img src={preview} alt="Documento" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-6">
                <Camera className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <p className="font-bold text-gray-700">Toca para subir un recibo</p>
                <p className="text-sm text-gray-500 mt-1">Soporta JPG y PNG</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-3"></div>
                <p className="font-bold text-blue-800 text-sm animate-pulse">Analizando con IA...</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          
          {preview && !resultado && !loading && (
            <button onClick={analizarConOpenAI} className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
              <Star className="w-5 h-5" /> Extraer datos automáticamente
            </button>
          )}
        </div>

        {/* Columna Derecha: Formulario (Resultados) */}
        <div className="md:w-1/2 p-6 flex flex-col">
          <div className="hidden md:flex justify-end mb-2">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
          </div>
          
          {!resultado ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <Receipt className="w-16 h-16 text-gray-200 mb-4" />
              <p className="font-bold">Sube una imagen y presiona Extraer</p>
              <p className="text-sm mt-2">La IA leerá automáticamente el monto, fecha y concepto del ticket.</p>
              {error && <p className="text-rose-500 text-sm font-bold mt-4 p-3 bg-rose-50 rounded-lg">{error}</p>}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-lg">
                <Check className="w-5 h-5 text-emerald-500" /> Revisa y confirma
              </h3>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                <div className="bg-gray-100 rounded-full p-1 flex">
                  {['Gasto', 'Ingreso'].map(t => (
                    <button key={t} onClick={() => setResultado({...resultado, tipo: t})} className={`flex-1 py-1.5 rounded-full text-sm font-bold ${resultado.tipo === t ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>{t}</button>
                  ))}
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Monto total</label>
                  <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 focus-within:border-blue-500">
                    <DollarSign className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
                    <input type="number" step="0.01" value={resultado.monto} onChange={e => setResultado({...resultado, monto: e.target.value})} className="outline-none w-full font-bold text-gray-900" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Descripción</label>
                  <textarea rows="4" value={resultado.descripcion} onChange={e => setResultado({...resultado, descripcion: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Categoría</label>
                    <select value={resultado.categoria} onChange={e => setResultado({...resultado, categoria: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-500 bg-white">
                      {['Sin categoría', 'General', 'Renta', 'Gestión', 'Nómina', 'Servicios', 'Mantenimiento', 'Alimentos', 'Marketing', 'Préstamos', 'Mobiliario o Equipo', 'Transporte'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Método</label>
                    <select value={resultado.metodo} onChange={e => setResultado({...resultado, metodo: e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-500 bg-white">
                      {['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                
                {error && <p className="text-rose-500 text-sm font-bold bg-rose-50 p-3 rounded-xl">{error}</p>}
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                <button onClick={() => setResultado(null)} className="px-5 py-3.5 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-700">Reescanear</button>
                <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Guardar registro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ PANEL: NUEVA TRANSACCIÓN ============
function NuevaTransaccion({ onClose, onGuardar, inicial }) {
  const editando = !!inicial;
  const [tipo, setTipo] = useState(inicial?.tipo || 'Gasto');
  const [pagado, setPagado] = useState(inicial?.pagado ?? true);
  const [monto, setMonto] = useState(inicial ? String(inicial.monto) : '');
  const [categoria, setCategoria] = useState(inicial?.categoria || 'Sin categoría');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || '');
  const esGasto = tipo === 'Gasto';
  const montoNum = parseFloat(monto) || 0;

  const guardar = () => {
    if (montoNum <= 0) return;
    onGuardar({ ...(inicial || {}), tipo, pagado, monto: montoNum, categoria, descripcion, metodo: inicial?.metodo || 'Efectivo' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">{editando ? 'Editar transacción' : 'Nueva transacción'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
        </div>

        <div className="flex justify-center mb-5">
          <div className="bg-gray-100 rounded-full p-1 flex">
            <button onClick={() => setPagado(false)} className={`px-5 py-2 rounded-full text-sm font-bold ${!pagado ? (esGasto ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white') : 'text-gray-600'}`}>Sin pagar</button>
            <button onClick={() => setPagado(true)} className={`px-5 py-2 rounded-full text-sm font-bold ${pagado ? (esGasto ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white') : 'text-gray-600'}`}>Pagado</button>
          </div>
        </div>

        <div className={`border-2 rounded-2xl py-5 text-center mb-5 ${esGasto ? 'border-rose-100' : 'border-emerald-100'}`}>
          <div className="flex items-center justify-center">
            <span className={`text-4xl font-black mr-1 ${esGasto ? 'text-rose-600' : 'text-emerald-600'}`}>$</span>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0"
              className={`text-5xl font-black outline-none w-40 text-center ${esGasto ? 'text-rose-600 placeholder-rose-200' : 'text-emerald-600 placeholder-emerald-200'}`} />
          </div>
        </div>

        <div className="flex justify-center mb-5">
          <div className="bg-gray-100 rounded-full p-1 flex">
            <button onClick={() => setTipo('Gasto')} className={`px-6 py-2 rounded-full text-sm font-bold ${esGasto ? 'bg-rose-600 text-white' : 'text-gray-600'}`}>Gasto</button>
            <button onClick={() => setTipo('Ingreso')} className={`px-6 py-2 rounded-full text-sm font-bold ${!esGasto ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}>Ingreso</button>
          </div>
        </div>

        <label className="text-sm font-bold text-gray-600 mb-1.5">Categoría</label>
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 font-semibold text-gray-800 bg-white">
          {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
        </select>

        <label className="text-sm font-bold text-gray-600 mb-1.5">Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej. Compra de jitomate"
          className="border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500 resize-none h-24" />

        <div className="mt-auto flex items-center gap-4">
          <button onClick={guardar} disabled={montoNum <= 0}
            className={`flex-1 text-white font-bold py-3.5 rounded-full disabled:bg-gray-200 disabled:text-gray-400 ${esGasto ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {editando ? 'Guardar cambios' : 'Añadir transacción'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ VISTA: MESAS (croquis funcional estilo Yimi) ============
function ViewMesas({ ajustes, ordenes, onAbrirLibre, onEditarCuenta, onCobrar, onVerTicket, onCancelarCuenta }) {
  const [sel, setSel] = useState(null); // mesa seleccionada (para el panel)
  const mesas = ajustes.mesas || [];
  const zonas = (ajustes.zonas && ajustes.zonas.length) ? ajustes.zonas : [...new Set(mesas.map(m => m.zona))];
  const cuentaDe = (num) => ordenes.find(o => o.mesa === num && !o.pagado && o.estadoEntrega !== 'Cancelado');
  const selOrden = sel ? cuentaDe(sel.num) : null;
  const nOcupadas = mesas.filter(m => cuentaDe(m.num)).length;

  const tocar = (m) => { const o = cuentaDe(m.num); if (o) setSel(m); else onAbrirLibre(m); };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Mesas</h1>
          <p className="text-gray-500 font-semibold text-sm">{nOcupadas} ocupada{nOcupadas === 1 ? '' : 's'} · {mesas.length - nOcupadas} libre{(mesas.length - nOcupadas) === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold">
          <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Libre</span>
          <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Ocupada</span>
        </div>
      </div>

      {mesas.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-gray-400 font-semibold">
          No hay mesas configuradas. Agrégalas en Ajustes → Mesas.
        </div>
      ) : zonas.map(zona => (
        <div key={zona} className="mb-7">
          <p className="font-bold text-gray-500 text-sm mb-3">{zona}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {mesas.filter(m => m.zona === zona).map(m => {
              const o = cuentaDe(m.num);
              const ocupada = !!o;
              return (
                <button key={m.id} onClick={() => tocar(m)}
                  className={`border-2 p-4 h-28 flex flex-col items-center justify-center gap-1 transition-colors ${m.forma === 'circle' ? 'rounded-full' : 'rounded-2xl'} ${ocupada ? 'border-rose-200 bg-rose-50 hover:bg-rose-100' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}>
                  <span className={`text-2xl font-black ${ocupada ? 'text-rose-700' : 'text-emerald-700'}`}>{m.num}</span>
                  <span className={`text-xs font-bold ${ocupada ? 'text-rose-600' : 'text-emerald-600'}`}>{ocupada ? money(o.total) : 'Libre'}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {sel && selOrden && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-black text-gray-900">Mesa {sel.num}</h2>
              <button onClick={() => setSel(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
            <p className="text-gray-500 font-semibold text-sm mb-4">Cuenta #{selOrden.folio} · {(selOrden.items || []).reduce((s, i) => s + i.cantidad, 0)} artículos</p>
            <div className="max-h-40 overflow-y-auto mb-3">
              {(selOrden.items || []).map(i => (
                <div key={i.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                  <span className="text-gray-700"><span className="font-bold mr-1">{i.cantidad}x</span>{i.nombre}</span>
                  <span className="font-bold text-gray-900">{money(i.precio * i.cantidad)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-black text-gray-900 mb-4"><span>Total</span><span>{money(selOrden.total)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { const m = sel; setSel(null); onEditarCuenta(m, selOrden); }} className="border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full text-sm">Agregar productos</button>
              <button onClick={() => { const o = selOrden; setSel(null); onVerTicket(o); }} className="border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full text-sm">Ver ticket</button>
              <button onClick={() => { const o = selOrden; setSel(null); onCancelarCuenta(o.id); }} className="border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3 rounded-full text-sm">Cancelar mesa</button>
              <button onClick={() => { const o = selOrden; setSel(null); onCobrar(o); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-full text-sm">Cobrar {money(selOrden.total)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ VISTA: FINANZAS ============
function ViewFinanzas({ movimientos, onNueva, onEditarMov, onEliminarMov, ventas = [], products = [], ajustes = {} }) {
  const [showNueva, setShowNueva] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [editando, setEditando] = useState(null);
  const [periodo, setPeriodo] = useState('30D');

  // Movimientos y ventas filtrados por el periodo elegido (Últimos 30 días / Hoy / Histórico).
  const movsFiltrados = useMemo(() => aplicarFiltroFecha(movimientos, periodo), [movimientos, periodo]);
  const ventasFiltradas = useMemo(() => aplicarFiltroFecha(ventas, periodo), [ventas, periodo]);

  const ingresos = movsFiltrados.filter(m => m.tipo === 'Ingreso' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const gastos = movsFiltrados.filter(m => m.tipo === 'Gasto' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const porCobrar = movsFiltrados.filter(m => m.tipo === 'Ingreso' && !m.pagado).reduce((s, m) => s + m.monto, 0);
  const porPagar = movsFiltrados.filter(m => m.tipo === 'Gasto' && !m.pagado).reduce((s, m) => s + m.monto, 0);
  const totalDia = ingresos - gastos;

  // Exporta un Excel real (.xlsx) con la información del negocio para analizar.
  const exportarExcel = () => {
    const XLSX = typeof window !== 'undefined' ? window.XLSX : null;
    if (!XLSX) { alert('El generador de Excel aún se está cargando. Intenta de nuevo en unos segundos.'); return; }
    const negocio = ajustes.nombre || 'Lumen Base';
    const hoyStr = new Date().toLocaleString('es-MX');
    const ventasPagadas = ventasFiltradas.filter(v => v.pagado);
    const costoVendido = ventasPagadas.reduce((s, v) => s + (v.items || []).reduce((ss, i) => ss + i.costo * i.cantidad, 0), 0);
    const nV = ventasPagadas.length;

    // 1) Resumen
    const resumen = [
      ['Negocio', negocio],
      ['Generado', hoyStr],
      [],
      ['Ingresos (cobrados)', ingresos],
      ['Gastos (pagados)', gastos],
      ['Costo de lo vendido', costoVendido],
      ['Utilidad neta', ingresos - costoVendido - gastos],
      ['Margen %', ingresos > 0 ? Math.round((ingresos - costoVendido - gastos) / ingresos * 1000) / 10 : 0],
      [],
      ['Número de ventas', nV],
      ['Ticket promedio', nV > 0 ? Math.round(ingresos / nV * 100) / 100 : 0],
      ['Por cobrar', porCobrar],
      ['Por pagar', porPagar],
      ['Productos en catálogo', products.length],
      ['Valor del inventario', products.reduce((s, p) => s + p.precio * p.stock, 0)],
    ];

    // 2) Ventas
    const hVentas = [['Folio', 'Fecha', 'Hora', 'Tipo', 'Cliente', 'Método', 'Pagado', 'Estado', 'Subtotal', 'Descuento', 'Impuesto', 'Total', 'Costo', 'Ganancia']];
    ventasFiltradas.forEach(v => {
      const costo = (v.items || []).reduce((s, i) => s + i.costo * i.cantidad, 0);
      const ts = getTimestamp(v);
      hVentas.push([v.folio, fmtFecha(ts), fmtHora(ts), v.entrega?.modo || 'En sitio', v.cliente || 'Mostrador', v.metodo || 'Pendiente',
        v.pagado ? 'Sí' : 'No', v.estadoEntrega || '', v.subtotal ?? v.total, v.descuento || 0, v.impuesto || 0, v.total, costo, (v.pagado ? v.total - costo : 0)]);
    });

    // 3) Detalle de artículos vendidos
    const hItems = [['Folio', 'Fecha', 'Hora', 'Producto', 'Cantidad', 'Precio', 'Importe', 'Costo unit.', 'Ganancia']];
    ventasFiltradas.forEach(v => { const ts = getTimestamp(v); (v.items || []).forEach(i => {
      hItems.push([v.folio, fmtFecha(ts), fmtHora(ts), i.nombre, i.cantidad, i.precio, i.precio * i.cantidad, i.costo, (i.precio - i.costo) * i.cantidad]);
    }); });

    // 4) Inventario
    const hInv = [['Producto', 'Categoría', 'Precio', 'Costo', 'Stock', 'Valor en stock', 'Margen %']];
    products.forEach(p => hInv.push([p.nombre, p.categoria || '', p.precio, p.costo, p.stock, p.precio * p.stock,
      p.precio > 0 ? Math.round((p.precio - p.costo) / p.precio * 1000) / 10 : 0]));

    // 5) Movimientos (finanzas)
    const hMov = [['Fecha', 'Hora', 'Tipo', 'Categoría', 'Descripción', 'Método', 'Pagado', 'Folio', 'Monto']];
    movsFiltrados.forEach(m => { const ts = getTimestamp(m); hMov.push([fmtFecha(ts), fmtHora(ts), m.esVenta ? 'Venta' : m.tipo, m.categoria || '', m.descripcion || '', m.metodo || '', m.pagado ? 'Sí' : 'No', m.folio || '', m.monto]); });

    // 6) Top productos por ingreso
    const mapa = {};
    ventasPagadas.forEach(v => (v.items || []).forEach(i => {
      if (!mapa[i.nombre]) mapa[i.nombre] = { u: 0, ing: 0 };
      mapa[i.nombre].u += i.cantidad; mapa[i.nombre].ing += i.precio * i.cantidad;
    }));
    const hTop = [['Producto', 'Unidades vendidas', 'Ingresos']];
    Object.entries(mapa).sort((a, b) => b[1].ing - a[1].ing).forEach(([n, d]) => hTop.push([n, d.u, d.ing]));

    const wb = XLSX.utils.book_new();
    const add = (nombreHoja, aoa) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nombreHoja);
    add('Resumen', resumen);
    add('Ventas', hVentas);
    add('Artículos vendidos', hItems);
    add('Inventario', hInv);
    add('Movimientos', hMov);
    add('Top productos', hTop);
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Lumen_${negocio.replace(/[^a-z0-9]+/gi, '-')}_${fecha}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black text-gray-900">Finanzas</h1>
      <p className="text-blue-600 font-bold text-sm mb-5 cursor-pointer hover:underline">Ver cuentas</p>

      <div className="bg-white rounded-3xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center border border-gray-200 rounded-full font-bold text-gray-800 text-sm">
            <button className="p-2.5 hover:bg-gray-50 rounded-l-full" onClick={() => setPeriodo(p => p === '30D' ? 'Hoy' : p === 'Hoy' ? 'Todo' : '30D')}><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 min-w-[120px] text-center">{periodo === '30D' ? 'Últimos 30 días' : periodo === 'Hoy' ? 'Hoy' : 'Histórico'}</span>
            <button className="p-2.5 hover:bg-gray-50 rounded-r-full" onClick={() => setPeriodo(p => p === '30D' ? 'Todo' : p === 'Todo' ? 'Hoy' : '30D')}><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center border border-gray-200 rounded-full px-4 py-2.5 w-60 focus-within:border-blue-400">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input placeholder="Buscar finanzas" className="outline-none text-sm w-full" />
          </div>
          <div className="flex-1" />
          <button onClick={exportarExcel} className="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold px-5 py-3 rounded-full flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
          <button onClick={() => setShowScanner(true)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-purple-600/25 flex items-center gap-2 text-sm mr-2">
            Escanear <Camera className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNueva(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-blue-600/25 flex items-center gap-2 text-sm">
            Transacción <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl px-6 py-4 flex items-center gap-10 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <div><p className="text-xs text-gray-500 font-semibold">Ingresos</p><p className="font-black text-gray-900">{money(ingresos)}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <div><p className="text-xs text-gray-500 font-semibold">Gastos</p><p className="font-black text-gray-900">{money(gastos)}</p></div>
          </div>
          <div><p className="text-xs text-gray-500 font-semibold">Por cobrar <span className="text-blue-600 font-bold cursor-pointer">Ver</span></p><p className="font-black text-gray-900">{money(porCobrar)}</p></div>
          <div><p className="text-xs text-gray-500 font-semibold">Por pagar <span className="text-blue-600 font-bold cursor-pointer">Ver</span></p><p className="font-black text-gray-900">{money(porPagar)}</p></div>
        </div>

        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-3 bg-gray-50/70">
            <p className="font-bold text-gray-700 text-sm">{periodo === 'Hoy' ? hoy() : periodo === '30D' ? 'Últimos 30 días' : 'Todo el histórico'}</p>
            <p className={`font-black text-sm ${totalDia >= 0 ? 'text-gray-400' : 'text-rose-500'}`}>{money(totalDia)}</p>
          </div>
          {movsFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 py-10 font-semibold">Sin movimientos en este periodo</p>
          ) : movsFiltrados.map(m => (
            <div key={m.id} className="flex items-center px-5 py-3.5 border-t border-gray-50 hover:bg-gray-50/50 text-sm">
              <span className="w-20 md:w-24 font-bold text-gray-900 shrink-0">{m.esVenta ? 'Venta' : m.tipo}</span>
              <span className="hidden md:block w-28 text-gray-600">{m.metodo}</span>
              <span className="hidden md:block w-32 text-gray-400">{m.categoria || '-'}</span>
              <span className="flex-1 text-gray-700 truncate pr-3 min-w-0">{m.descripcion}</span>
              {m.folio && <span className="text-xs font-bold bg-gray-900 text-white px-2 py-0.5 rounded mr-2 shrink-0">#{m.folio}</span>}
              {!m.pagado && <span className="hidden sm:inline text-[10px] font-bold text-rose-600 border border-rose-200 bg-rose-50 px-2 py-0.5 rounded-full mr-2 shrink-0">{m.tipo === 'Ingreso' ? 'Por cobrar' : 'Por pagar'}</span>}
              <span className={`font-black shrink-0 ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {m.tipo === 'Ingreso' ? '' : '-'}{money(m.monto)}
              </span>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                {!m.esVenta && (
                  <button onClick={() => setEditando(m)} title="Editar" className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">Editar</button>
                )}
                <button onClick={() => onEliminarMov(m)} title="Eliminar"
                  className="p-1.5 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onGuardar={t => { onNueva(t); setShowScanner(false); }} apiKey={ajustes.openaiApiKey} modelo={ajustes.openaiModelo} />}
      {showNueva && <NuevaTransaccion onClose={() => setShowNueva(false)} onGuardar={t => { onNueva(t); setShowNueva(false); }} />}
      {editando && <NuevaTransaccion inicial={editando} onClose={() => setEditando(null)} onGuardar={t => { onEditarMov(t); setEditando(null); }} />}
    </div>
  );
}

// ============ VISTA: REPORTES ============
function ViewReportes({ movimientos, ventas, onVerVenta, onEliminarVenta }) {
  const [kpi, setKpi] = useState('Ingresos');
  const [rango, setRango] = useState('Dia');
  const RANGOS = ['Hora', 'Dia', 'Semana', 'Mes'];
  const cambiarRango = (dir) => setRango(r => RANGOS[(RANGOS.indexOf(r) + dir + RANGOS.length) % RANGOS.length]);

  // Datos filtrados por el rango seleccionado (Hora / Día / Semana / Mes).
  const movsFiltrados = useMemo(() => aplicarFiltroFecha(movimientos, rango), [movimientos, rango]);
  const ventasFiltradas = useMemo(() => aplicarFiltroFecha(ventas, rango), [ventas, rango]);

  const ingresos = movsFiltrados.filter(m => m.tipo === 'Ingreso' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const gastos = movsFiltrados.filter(m => m.tipo === 'Gasto' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const ventasPagadas = ventasFiltradas.filter(v => v.pagado);
  const costoVendido = ventasPagadas.reduce((s, v) => s + (v.items||[]).reduce((ss, i) => ss + i.costo * i.cantidad, 0), 0);
  const nVentas = ventasPagadas.length;
  const kpis = {
    'Ingresos': ingresos,
    'Balance financiero': ingresos - gastos,
    'Ganancia': ingresos - costoVendido - gastos,
    'Ventas': nVentas,
    'Ticket promedio': nVentas > 0 ? ingresos / nVentas : 0,
  };

  const topProductos = useMemo(() => {
    const map = {};
    ventasPagadas.forEach(v => (v.items||[]).forEach(i => {
      map[i.nombre] = (map[i.nombre] || 0) + i.precio * i.cantidad;
    }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ventasFiltradas]);

  const chartData = useMemo(() => {
    const map = {};
    if (rango === 'Hora') {
      const labels = Array.from({length: 12}, (_,i) => i * 5);
      ventasPagadas.forEach(v => {
        const m = Math.floor(new Date(getTimestamp(v)).getMinutes() / 5) * 5;
        map[m] = (map[m]||0) + v.total;
      });
      return labels.map(l => ({ h: `${l}m`, v: map[l] || 0 }));
    } else if (rango === 'Dia') {
      const labels = Array.from({length: 24}, (_,i) => i);
      ventasPagadas.forEach(v => {
        const h = new Date(getTimestamp(v)).getHours();
        map[h] = (map[h]||0) + v.total;
      });
      return labels.map(l => ({ h: `${l}h`, v: map[l] || 0 }));
    } else if (rango === 'Semana') {
      const dias = ['D','L','M','X','J','V','S'];
      ventasPagadas.forEach(v => {
        const d = new Date(getTimestamp(v)).getDay();
        map[d] = (map[d]||0) + v.total;
      });
      return [1,2,3,4,5,6,0].map(d => ({ h: dias[d], v: map[d] || 0 }));
    } else {
      const labels = Array.from({length: 31}, (_,i) => i+1);
      ventasPagadas.forEach(v => {
        const d = new Date(getTimestamp(v)).getDate();
        map[d] = (map[d]||0) + v.total;
      });
      return labels.map(l => ({ h: l, v: map[l] || 0 }));
    }
  }, [ventasFiltradas, rango]);
  const maxChart = Math.max(1, ...chartData.map(x => x.v));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black text-gray-900 mb-6">Reportes</h1>
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-xl font-black text-gray-900">Ingresos</h2>
          <div className="flex items-center border border-gray-200 rounded-full font-bold text-gray-800 text-sm">
            <button onClick={() => cambiarRango(-1)} className="p-2.5 hover:bg-gray-50 rounded-l-full"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-4">{rango === 'Hora' ? 'Última hora' : rango === 'Dia' ? 'Hoy' : rango === 'Semana' ? 'Esta semana' : 'Este mes'}</span>
            <button onClick={() => cambiarRango(1)} className="p-2.5 hover:bg-gray-50 rounded-r-full"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="bg-gray-100 rounded-full p-1 flex text-sm font-bold">
            {['Hora', 'Dia', 'Semana', 'Mes'].map((t) => (
              <button key={t} onClick={() => setRango(t)} className={`px-4 py-1.5 rounded-full ${rango === t ? 'bg-gray-400/80 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-2 flex mb-6 overflow-x-auto">
          {Object.entries(kpis).map(([k, v]) => (
            <button key={k} onClick={() => setKpi(k)}
              className={`px-6 py-3 rounded-xl text-left min-w-[150px] transition-colors ${kpi === k ? 'bg-white shadow-sm border-b-2 border-blue-600' : ''}`}>
              <p className="text-xs text-gray-500 font-semibold whitespace-nowrap">{k}</p>
              <p className={`text-xl font-black ${kpi === k ? 'text-blue-600' : 'text-gray-400'}`}>{k === 'Ventas' ? v : money(v)}</p>
            </button>
          ))}
        </div>

        <div className="flex items-end gap-1.5 h-36 px-2 overflow-x-auto">
          {chartData.map(({ h, v }, idx) => (
            <div key={`${h}-${idx}`} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]">
              <div className="w-full bg-blue-600/90 rounded-t-md transition-all" style={{ height: `${(v / maxChart) * 110}px`, minHeight: v > 0 ? '6px' : '2px', opacity: v > 0 ? 1 : 0.15 }} />
              <span className="text-[10px] text-gray-400 font-semibold">{h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-gray-900">Mejores Productos</h3>
            <span className="text-blue-600 font-bold text-sm cursor-pointer hover:underline">Ver detalles</span>
          </div>
          {topProductos.length === 0 ? <p className="text-gray-400 text-center py-8 font-semibold">No hay datos en este periodo</p>
            : topProductos.map(([nombre, monto], i) => (
              <div key={nombre} className={`flex items-center justify-between px-4 py-2.5 rounded-xl mb-1 ${i === 0 ? 'bg-orange-50' : ''}`}>
                <span className="flex items-center gap-3 font-bold text-gray-800 text-sm"><span className="text-amber-500">{i + 1}</span> {nombre}</span>
                <span className="font-black text-gray-900 text-sm">{money(monto)}</span>
              </div>
            ))}
        </div>
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black text-gray-900">Últimas ventas</h3>
          </div>
          {ventas.length > 0 && <p className="text-xs text-gray-400 mb-3">Toca una venta para ver el detalle</p>}
          {ventasFiltradas.length === 0 ? <p className="text-gray-400 text-center py-8 font-semibold">No hay datos en este periodo</p>
            : ventasFiltradas.slice(0, 8).map(v => (
              <div key={v.id} className="flex items-center py-2.5 border-b border-gray-50 text-sm group">
                <button onClick={() => onVerVenta(v)} className="flex-1 flex items-center justify-between text-left hover:opacity-70 min-w-0">
                  <span className="font-bold text-gray-800 truncate">#{v.folio} · {fmtFechaHora(getTimestamp(v))}</span>
                  <span className="text-gray-500 mx-3 shrink-0">{v.metodo || 'Pendiente'}</span>
                  <span className={`font-black shrink-0 ${v.pagado ? 'text-emerald-600' : 'text-rose-500'}`}>{money(v.total)}</span>
                </button>
                <button onClick={() => onEliminarVenta(v)} title="Eliminar venta"
                  className="ml-3 p-1.5 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ============ VISTA: INICIO (dashboard estilo Yimi) ============
function ViewInicio({ ajustes, ventas, movimientos, products, go }) {
  const ventasPagadas = ventas.filter(v => v.pagado);
  const ingresos = movimientos.filter(m => m.tipo === 'Ingreso' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const gastos = movimientos.filter(m => m.tipo === 'Gasto' && m.pagado).reduce((s, m) => s + m.monto, 0);
  const costoVendido = ventasPagadas.reduce((s, v) => s + v.items.reduce((ss, i) => ss + i.costo * i.cantidad, 0), 0);
  const ganancia = ingresos - costoVendido - gastos;
  const ticketProm = ventasPagadas.length > 0 ? ingresos / ventasPagadas.length : 0;

  const topProducto = useMemo(() => {
    const map = {};
    ventasPagadas.forEach(v => v.items.forEach(i => { map[i.nombre] = (map[i.nombre] || 0) + i.precio * i.cantidad; }));
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : '—';
  }, [ventas]);

  // Etiquetas de los últimos 8 días (índice 7 = hoy) para la mini-gráfica.
  const dias = useMemo(() => {
    const L = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const arr = [];
    for (let i = 7; i >= 0; i--) { const dd = new Date(); dd.setDate(dd.getDate() - i); arr.push(L[dd.getDay()]); }
    return arr;
  }, []);

  const accesos = [
    { label: 'Nueva Venta', emoji: '💵', accion: () => go('vender') },
    { label: 'Nuevo Gasto', emoji: '🧾', accion: () => go('finanzas') },
    { label: 'Pedidos', emoji: '📋', accion: () => go('pedidos') },
    { label: 'Nuevo Producto', emoji: '📦', accion: () => go('crear-producto') },
    { label: 'Caja actual', emoji: '🖥️', accion: () => go('reportes') },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-gray-900">¡Bienvenido {ajustes.nombre}!</h1>
        <button onClick={() => go('ajustes')} className="flex items-center gap-3 hover:bg-white rounded-full px-3 py-2 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm">{ajustes.nombre.slice(0, 2).toUpperCase()}</div>
          <div className="text-left"><p className="text-sm font-bold text-gray-900">Editar negocio</p><p className="text-xs text-gray-500">{ajustes.nombre}</p></div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {accesos.map(a => (
          <button key={a.label} onClick={a.accion}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 text-left transition-all hover:-translate-y-0.5">
            <span className="text-4xl block mb-3">{a.emoji}</span>
            <span className="font-bold text-gray-900 text-sm">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Resumen últimos 7 días */}
      <div className="bg-white rounded-3xl shadow-sm p-8 mb-6">
        <p className="text-center font-bold text-gray-700">Últimos 7 días • {ventasPagadas.length} ventas</p>
        <p className="text-center text-5xl font-black text-gray-900 mt-1">{money(ingresos)}</p>
        <button onClick={() => go('reportes')} className="block mx-auto text-blue-600 font-bold text-sm mt-2 hover:underline">Ver reporte completo</button>
        <div className="flex items-end gap-2 h-32 mt-6 px-4">
          {dias.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-blue-600/90 rounded-t-md" style={{ height: `${i === 7 ? Math.max(ingresos > 0 ? 90 : 2, 2) : 2}px`, opacity: i === 7 && ingresos > 0 ? 1 : 0.15 }} />
              <span className="text-[10px] text-gray-400 font-semibold whitespace-nowrap">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 border-t border-gray-50 pt-6">
          <div><p className="text-sm font-bold text-blue-700">Producto Estrella</p><p className="font-black text-gray-900 text-lg truncate">{topProducto}</p></div>
          <div><p className="text-sm font-bold text-blue-700">Ganancia</p><p className="font-black text-gray-900 text-lg">{money(ganancia)}</p></div>
          <div><p className="text-sm font-bold text-blue-700">Empleado Estrella</p><p className="font-black text-gray-900 text-lg truncate">{ajustes.nombre}</p></div>
          <div><p className="text-sm font-bold text-blue-700">Ticket promedio</p><p className="font-black text-gray-900 text-lg">{money(ticketProm)}</p></div>
        </div>
      </div>

      {/* Ayuda */}
      <div className="bg-white rounded-3xl shadow-sm p-8 flex items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">¿Necesitas ayuda?</h2>
          <p className="text-gray-600 mb-5">Nuestro equipo está listo para resolver tus preguntas sobre las funciones de tu punto de venta.</p>
          <div className="flex gap-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-blue-600/25">Ir al centro de ayuda</button>
            <button className="border border-gray-200 hover:bg-gray-50 font-bold px-6 py-3 rounded-full">Hablar con soporte</button>
          </div>
        </div>
        <span className="text-7xl">🧭</span>
      </div>
    </div>
  );
}

// ============ TOGGLE (switch estilo Yimi) ============
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${on ? 'bg-blue-600 justify-end' : 'bg-gray-200 justify-start'}`}>
      <span className="w-6 h-6 bg-white rounded-full shadow flex items-center justify-center">
        {on ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
      </span>
    </button>
  );
}

// ============ VISTA: AJUSTES (Configuraciones estilo Yimi) ============
// Card e Input a nivel de módulo: si se definen dentro del componente se
// recrean en cada render y los inputs pierden el foco a cada tecla.
const AjCard = ({ title, children }) => (
  <div className="bg-white rounded-3xl shadow-sm p-6 mb-5">
    {title && <h3 className="font-black text-gray-900 text-lg mb-4">{title}</h3>}
    {children}
  </div>
);
const AjInput = ({ d, set, label, k, placeholder, req }) => (
  <div className="mb-4">
    <label className="text-sm font-bold text-gray-700 block mb-1.5">{label} {req && <span className="text-rose-500">*</span>}</label>
    <input value={d[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder || label}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
  </div>
);

function OpenAIModelSelector({ d, set }) {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarModelos = async () => {
    if (!d.openaiApiKey) {
      setError('Primero ingresa tu API Key arriba');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`https://api.openai.com/v1/models`, {
        headers: { 'Authorization': `Bearer ${d.openaiApiKey}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const validos = (data.data || [])
        .map(m => m.id)
        .filter(id => id.includes('gpt-4o') || id.includes('gpt-4-turbo'));
      
      setModelos(validos);
      if (validos.length > 0 && !validos.includes(d.openaiModelo)) {
        set('openaiModelo', validos[0]);
      }
    } catch(err) {
      if (err.message.includes('Incorrect API key')) setError('API Key no válida.');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold text-gray-700">Modelo de IA (Avanzado)</label>
        <button onClick={cargarModelos} disabled={loading} className="text-xs font-bold text-blue-600 hover:underline">
          {loading ? 'Cargando...' : 'Cargar modelos disponibles'}
        </button>
      </div>
      
      {modelos.length > 0 ? (
        <select value={d.openaiModelo} onChange={e => set('openaiModelo', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-500 bg-white">
          {modelos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : (
        <input value={d.openaiModelo} onChange={e => set('openaiModelo', e.target.value)} placeholder="gpt-4o-mini" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium" />
      )}
      
      {error && <p className="text-rose-500 text-xs font-bold mt-2">{error}</p>}
      <p className="text-xs text-gray-500 mt-2">Haz clic en "Cargar modelos" para ver los modelos de visión disponibles en tu cuenta de OpenAI.</p>
    </div>
  );
}

function ViewAjustes({ ajustes, onGuardar, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'General');
  const [d, setD] = useState(ajustes);
  const [nuevaZona, setNuevaZona] = useState('');
  const [modalImpresora, setModalImpresora] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const logoRef = useRef(null);
  const set = (k, v) => { setGuardado(false); setD(prev => ({ ...prev, [k]: v })); };
  const cambios = JSON.stringify(d) !== JSON.stringify(ajustes);
  const Card = AjCard;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-black text-gray-900 mb-6">Configuraciones</h1>
      <div className="flex items-center gap-2 mb-6">
        {['General', 'Mesas', 'Impresoras', 'Ticket', 'IA'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-colors ${tab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-gray-700 hover:bg-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'General' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div>
            <Card>
              <div onClick={() => logoRef.current.click()} className="bg-gray-50 rounded-2xl h-40 flex items-center justify-center cursor-pointer hover:bg-gray-100 mb-5 overflow-hidden">
                {d.logo ? <img src={d.logo} className="h-full object-contain" alt="logo" /> : (
                  <span className="bg-white shadow-sm rounded-full px-5 py-2.5 font-bold text-blue-600 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Añade tu logo</span>
                )}
              </div>
              <input type="file" ref={logoRef} className="hidden" accept="image/*" onChange={e => { if (e.target.files[0]) imagenADataURL(e.target.files[0], 400, url => set('logo', url)); }} />
              <h3 className="font-black text-gray-900 text-lg mb-4">Contacto</h3>
              <AjInput d={d} set={set} label="Nombre del negocio" k="nombre" req />
              <label className="text-sm font-bold text-gray-700 block mb-1.5">WhatsApp para pedidos</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 mb-4 gap-2 focus-within:border-blue-500">
                <span className="font-bold text-gray-700 shrink-0">🇲🇽 +52</span>
                <input value={d.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Número" className="outline-none w-full" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-4 mt-6">Dirección</h3>
              <AjInput d={d} set={set} label="Calle y número" k="calle" req />
              <AjInput d={d} set={set} label="Detalles" k="detallesDir" req />
            </Card>
          </div>
          <div>
            <Card title="Enlaces de contacto">
              <AjInput d={d} set={set} label="Instagram" k="instagram" req />
              <AjInput d={d} set={set} label="Facebook" k="facebook" req />
              <AjInput d={d} set={set} label="Email" k="email" req />
            </Card>
            <Card title="Sobre tu negocio">
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Descripción extra <span className="text-rose-500">*</span></label>
              <textarea value={d.descripcion} onChange={e => set('descripcion', e.target.value)}
                placeholder="Usa este espacio para anunciar cambios importantes en tu negocio."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 resize-none h-24 mb-4" />
              <AjInput d={d} set={set} label="Link a tu Google Business" k="googleBusiness" req />
            </Card>
          </div>
          <div>
            <Card title="General">
              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-gray-900">Permitir vender sin stock</span>
                <Toggle on={d.venderSinStock} onChange={v => set('venderSinStock', v)} />
              </div>
              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-gray-900">Utilizar turnos de caja</span>
                <Toggle on={d.turnosCaja} onChange={v => set('turnosCaja', v)} />
              </div>
              <p className="font-bold text-gray-900 mb-2">Transacciones canceladas (En pedidos)</p>
              <div className="bg-gray-100 rounded-full p-1 flex mb-2">
                {['Mostrar tachadas', 'Esconder'].map(o => (
                  <button key={o} onClick={() => set('canceladas', o)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold ${d.canceladas === o ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>{o}</button>
                ))}
              </div>
            </Card>
            <Card title="Preferencias">
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Moneda</label>
              <select value={d.moneda} onChange={e => set('moneda', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none bg-white font-semibold">
                {['MXN $', 'USD $', 'EUR €'].map(m => <option key={m}>{m}</option>)}
              </select>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-900">Mostrar partes decimales</span>
                <Toggle on={d.decimales} onChange={v => set('decimales', v)} />
              </div>
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Zona horaria</label>
              <select value={d.zona} onChange={e => set('zona', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none bg-white font-semibold">
                {['America/Mexico_City', 'America/Monterrey', 'America/Tijuana', 'America/Cancun'].map(z => <option key={z}>{z}</option>)}
              </select>
            </Card>
            <Card title="Impuesto">
              <AjInput d={d} set={set} label="Descripción" k="impuestoDesc" />
              <div className="bg-gray-100 rounded-full p-1 flex mb-3">
                {['Porcentaje', 'Fijo'].map(o => (
                  <button key={o} onClick={() => set('impuestoModo', o)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold ${d.impuestoModo === o ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>{o}</button>
                ))}
              </div>
              <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 mb-3 focus-within:border-blue-500">
                <span className="text-gray-400 font-bold mr-2">{d.impuestoModo === 'Porcentaje' ? '%' : '$'}</span>
                <input type="number" value={d.impuestoValor || ''} onChange={e => set('impuestoValor', parseFloat(e.target.value) || 0)} placeholder="0" className="w-full outline-none font-bold" />
              </div>
              <div className="bg-gray-100 rounded-full p-1 flex">
                {['Añadido al precio', 'Incluido en el precio'].map(o => (
                  <button key={o} onClick={() => set('impuestoApp', o)}
                    className={`flex-1 py-2 rounded-full text-[11px] font-bold ${d.impuestoApp === o ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>{o}</button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Mesas' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-900 text-lg">Croquis de mesas</h3>
            <div className="flex items-center gap-3"><span className="font-bold text-gray-700 text-sm">Activar mesas</span>
              <Toggle on={d.activarMesas} onChange={v => set('activarMesas', v)} /></div>
          </div>
          <div className={`${d.activarMesas ? '' : 'opacity-40 pointer-events-none'}`}>
            {d.zonas.map(zona => (
              <div key={zona} className="mb-6">
                <p className="font-bold text-gray-500 text-sm mb-3">{zona}</p>
                <div className="bg-[linear-gradient(#eef2f7_1px,transparent_1px),linear-gradient(90deg,#eef2f7_1px,transparent_1px)] bg-[size:24px_24px] border border-gray-100 rounded-2xl p-6 flex flex-wrap gap-6">
                  {d.mesas.filter(m => m.zona === zona).map(m => (
                    <button key={m.id} title="Doble click para redondear"
                      onDoubleClick={() => set('mesas', d.mesas.map(x => x.id === m.id ? { ...x, forma: x.forma === 'circle' ? 'rect' : 'circle' } : x))}
                      className={`bg-gray-400/80 hover:bg-gray-500/80 text-white font-black text-xl flex items-center justify-center transition-all ${m.forma === 'circle' ? 'w-20 h-20 rounded-full' : 'w-32 h-20 rounded-xl'}`}>
                      {m.num}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 font-semibold mb-4">Redondea con doble click</p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => set('mesas', [...d.mesas, { id: `m${Date.now()}`, num: d.mesas.length + 1, forma: 'rect', zona: d.zonas[d.zonas.length - 1] }])}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full text-sm">Añadir mesa</button>
              <input value={nuevaZona} onChange={e => setNuevaZona(e.target.value)} placeholder="Nombre de zona"
                className="border border-gray-200 rounded-full px-4 py-2.5 outline-none focus:border-blue-500 text-sm" />
              <button onClick={() => { if (nuevaZona) { set('zonas', [...d.zonas, nuevaZona]); setNuevaZona(''); } }}
                className="border border-gray-200 hover:bg-gray-50 font-bold px-5 py-2.5 rounded-full text-sm">Crear zona</button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'Impresoras' && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900 text-lg">Tus impresoras</h3>
              <span className="text-blue-600 font-bold text-sm cursor-pointer hover:underline">Ver tutorial</span>
            </div>
            {d.impresoras.map(imp => (
              <div key={imp.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><Printer className="w-5 h-5 text-gray-500" /></div>
                  <div>
                    <p className="font-bold text-gray-900">{imp.nombre}</p>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">● {imp.estado}</span>
                  </div>
                </div>
                <button onClick={() => setModalImpresora(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full text-sm">Conectar</button>
              </div>
            ))}
            <button onClick={() => setModalImpresora(true)} className="text-blue-600 font-bold text-sm mt-4 hover:underline">Conectar impresora</button>
          </Card>
          <Card title="Tus áreas de ventas">
            <p className="text-gray-500 text-sm -mt-2 mb-4">Envía tickets a distintas impresoras para que se preparen distintos productos.</p>
            {d.areasVenta.map(a => (
              <div key={a} className="flex items-center justify-between py-3 border-b border-gray-50">
                <span className="font-bold text-gray-900">{a}</span>
                <button className="text-blue-600 font-bold text-sm hover:underline">Editar</button>
              </div>
            ))}
            <button onClick={() => set('areasVenta', [...d.areasVenta, `Área ${d.areasVenta.length + 1}`])}
              className="text-blue-600 font-bold text-sm mt-4 hover:underline">Añadir área de ventas</button>
          </Card>
          {modalImpresora && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalImpresora(false)}>
              <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7 text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black text-gray-900 mb-3">Nueva impresora</h3>
                <div className="bg-gray-50 rounded-2xl py-8 px-4 mb-4">
                  <Printer className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-bold text-gray-700 mb-1">No se encontraron dispositivos compatibles</p>
                  <p className="text-xs text-gray-500">Conecta los dispositivos y verifica que compartan la misma red.</p>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-full mb-2">Descargar aplicación</button>
                <button onClick={() => setModalImpresora(false)} className="w-full border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Contactar a soporte</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'Ticket' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div>
            <Card title="Información del negocio">
              <div className="grid grid-cols-2 gap-y-3 mb-5">
                {[['Nombre del negocio', !!d.nombre], ['Número de teléfono', !!d.whatsapp], ['Domicilio', !!d.calle], ['Acerca del negocio', !!d.descripcion], ['Logo', !!d.logo], ['WhatsApp', !!d.whatsapp], ['Redes sociales', !!(d.instagram || d.facebook)]].map(([lbl, ok]) => (
                  <span key={lbl} className={`flex items-center gap-2 text-sm font-semibold ${ok ? 'text-gray-900' : 'text-gray-400'}`}>
                    {ok ? <Check className="w-4 h-4 text-blue-600" /> : <X className="w-4 h-4 text-gray-300" />} {lbl}
                  </span>
                ))}
              </div>
              <button onClick={() => setTab('General')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-full">Llenar información del negocio</button>
            </Card>
            <Card title="Mostrar datos del cliente">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm font-semibold">Nombre, dirección y teléfono</span>
                <Toggle on={d.mostrarDatosCliente} onChange={v => set('mostrarDatosCliente', v)} />
              </div>
            </Card>
            <Card title="Encabezado y pie de página">
              <AjInput d={d} set={set} label="Encabezado" k="encabezado" placeholder="Texto arriba del ticket" />
              <AjInput d={d} set={set} label="Pie de página" k="pie" placeholder="Gracias por su compra" />
              <label className="text-sm font-bold text-gray-700 block mb-1.5">Elige un color</label>
              <div className="flex gap-2">
                {['#232F55', '#2563eb', '#3FA8C2', '#15803d', '#b91c1c', '#111827'].map(c => (
                  <button key={c} onClick={() => set('colorTicket', c)}
                    className={`w-8 h-8 rounded-full ${d.colorTicket === c ? 'ring-2 ring-offset-2 ring-blue-600' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </Card>
          </div>
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <div className="bg-gray-100 rounded-full p-1 flex w-fit mx-auto mb-5">
              <span className="px-5 py-2 rounded-full text-sm font-bold bg-gray-800 text-white">Ticket</span>
              <span className="px-5 py-2 text-sm font-bold text-gray-600">Factura</span>
            </div>
            <div className="border border-gray-100 rounded-xl p-5 shadow-inner [clip-path:polygon(0_8px,2%_0,4%_8px,6%_0,8%_8px,10%_0,12%_8px,14%_0,16%_8px,18%_0,20%_8px,22%_0,24%_8px,26%_0,28%_8px,30%_0,32%_8px,34%_0,36%_8px,38%_0,40%_8px,42%_0,44%_8px,46%_0,48%_8px,50%_0,52%_8px,54%_0,56%_8px,58%_0,60%_8px,62%_0,64%_8px,66%_0,68%_8px,70%_0,72%_8px,74%_0,76%_8px,78%_0,80%_8px,82%_0,84%_8px,86%_0,88%_8px,90%_0,92%_8px,94%_0,96%_8px,98%_0,100%_8px,100%_100%,0_100%)]">
              <p className="text-right text-2xl font-black mb-3" style={{ color: d.colorTicket }}>Ticket</p>
              {d.encabezado && <p className="text-xs text-gray-500 mb-2">{d.encabezado}</p>}
              <p className="font-black text-gray-900">{d.nombre || 'Tu negocio'}</p>
              <p className="text-xs text-gray-500 mb-2">{d.whatsapp ? `+52 ${d.whatsapp} - ` : ''}{d.calle || 'Domicilio completo'}</p>
              {d.mostrarDatosCliente && <p className="text-xs text-gray-700 font-bold mb-2 border-t border-gray-100 pt-2">Nombre del cliente<br /><span className="font-normal text-gray-500">+52 999-000-000 - Domicilio completo</span></p>}
              <div className="border-t border-gray-100 pt-2 text-xs text-gray-800">
                <p className="font-bold mb-1">1 items (Cantidad: 1)</p>
                <div className="flex justify-between"><span>1x Producto vendido</span><span className="font-bold">$9.99</span></div>
                <div className="flex justify-between mt-1"><span>Subtotal:</span><span>$9.99</span></div>
                {d.impuestoValor > 0 && <div className="flex justify-between"><span>{d.impuestoDesc} ({d.impuestoModo === 'Porcentaje' ? `${d.impuestoValor}%` : money(d.impuestoValor)}):</span><span>{d.impuestoModo === 'Porcentaje' ? money(9.99 * d.impuestoValor / 100) : money(d.impuestoValor)}</span></div>}
                <div className="flex justify-between font-black text-sm mt-1"><span>Total:</span><span>{money(d.impuestoValor > 0 && d.impuestoApp === 'Añadido al precio' ? (d.impuestoModo === 'Porcentaje' ? 9.99 * (1 + d.impuestoValor / 100) : 9.99 + d.impuestoValor) : 9.99)}</span></div>
              </div>
              <p className="text-center text-xs font-bold mt-3" style={{ color: d.colorTicket }}>{d.pie || 'Gracias por su compra'}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'IA' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <Card title="Inteligencia Artificial (OpenAI ChatGPT)">
            <p className="text-sm text-gray-600 mb-4">Ingresa tu clave de API de OpenAI para habilitar el escaneo inteligente de recibos y facturas con ChatGPT en la sección de Finanzas.</p>
            <AjInput d={d} set={set} label="OpenAI API Key" k="openaiApiKey" placeholder="sk-proj-..." />
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-600 font-bold text-sm hover:underline mt-2 mb-6 inline-block">Obtener mi API Key de OpenAI</a>
            <OpenAIModelSelector d={d} set={set} />
          </Card>
        </div>
      )}

      {/* Barra Deshacer / Guardar */}
      {(cambios || guardado) && (
        <div className="sticky bottom-4 mt-6 bg-white rounded-full shadow-2xl border border-gray-100 px-6 py-3 flex items-center justify-between max-w-md mx-auto">
          {guardado ? (
            <span className="flex items-center gap-2 font-bold text-emerald-600 mx-auto"><Check className="w-5 h-5" /> Ajustes guardados</span>
          ) : (
            <>
              <button onClick={() => setD(ajustes)} className="flex items-center gap-2 font-bold text-gray-600 hover:text-gray-900"><RotateCcw className="w-4 h-4" /> Deshacer</button>
              <button onClick={() => { onGuardar(d); setGuardado(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-full">Guardar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============ MODAL: CONFIRMACIÓN ============
function ConfirmModal({ titulo, texto, textoOk, onOk, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-7 text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-gray-900 mb-2">{titulo}</h3>
        <p className="text-gray-500 text-sm mb-6">{texto}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cancelar</button>
          <button onClick={onOk} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-full">{textoOk || 'Eliminar'}</button>
        </div>
      </div>
    </div>
  );
}

// ============ APP PRINCIPAL ============
function PosApp({ negocioId, negocioNombre, sesion, negocios, rol, onCambiarNegocio, onCerrarSesion }) {
  const [ajustes, setAjustes] = useState(AJUSTES_DEFAULT);
  const NEGOCIO = ajustes.nombre;
  // Recuerda la sección al recargar la página (no vuelve a Inicio).
  const VISTAS_OK = ['inicio', 'vender', 'pedidos', 'mesas', 'productos', 'finanzas', 'reportes', 'ajustes', 'crear-producto'];
  const [vista, setVista] = useState(() => {
    try { const v = localStorage.getItem('lumen_pos_vista'); return VISTAS_OK.includes(v) ? v : 'inicio'; }
    catch (e) { return 'inicio'; }
  });
  useEffect(() => {
    try { if (VISTAS_OK.includes(vista)) localStorage.setItem('lumen_pos_vista', vista); } catch (e) { /* ignore */ }
  }, [vista]);
  const AJUSTES_TABS_OK = ['General', 'Mesas', 'Impresoras', 'Ticket'];
  const [ajustesTab, setAjustesTab] = useState(() => {
    try { const t = localStorage.getItem('lumen_pos_ajustes_tab'); return AJUSTES_TABS_OK.includes(t) ? t : 'General'; }
    catch (e) { return 'General'; }
  });
  useEffect(() => {
    try { if (AJUSTES_TABS_OK.includes(ajustesTab)) localStorage.setItem('lumen_pos_ajustes_tab', ajustesTab); } catch (e) { /* ignore */ }
  }, [ajustesTab]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [clientes, setClientes] = useState(INITIAL_CLIENTES);
  const [cart, setCart] = useState([]);
  const [mesaActiva, setMesaActiva] = useState(null);       // mesa que se está atendiendo (o null)
  const [editandoCuenta, setEditandoCuenta] = useState(null); // pedido abierto de una mesa en edición
  const [cliente, setCliente] = useState(null);
  const [descuento, setDescuento] = useState(0);
  const [entrega, setEntrega] = useState(ENTREGA_DEFAULT);
  const [nota, setNota] = useState('');
  const [ventas, setVentas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [folio, setFolio] = useState(1);

  // ===== Persistencia por negocio: carga al iniciar/cambiar, guarda ante cada cambio =====
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    setCargado(false);
    (async () => {
      try {
        const e = await cargarEstado(negocioId);
        // Reinicia a valores base y aplica lo guardado (evita mezclar entre negocios)
        setProducts(e && e.products ? e.products : INITIAL_PRODUCTS);
        setClientes(e && e.clientes ? e.clientes : INITIAL_CLIENTES);
        setVentas(e && e.ventas ? e.ventas : []);
        setOrdenes(e && e.ordenes ? e.ordenes : []);
        setMovimientos(e && e.movimientos ? e.movimientos : []);
        // Nombre del negocio: usa el guardado si el dueño lo personalizó;
        // si no (o si quedó el genérico "Lumen Base"), usa el nombre real del negocio.
        const guardado = e && e.ajustes ? e.ajustes.nombre : null;
        const nombreNegocio = (guardado && guardado !== 'Lumen Base') ? guardado : (negocioNombre || 'Lumen Base');
        setAjustes({ ...AJUSTES_DEFAULT, ...(e && e.ajustes ? e.ajustes : {}), nombre: nombreNegocio });
        setFolio(e && e.folio ? e.folio : 1);
      } catch (err) { console.warn('No se pudo cargar estado guardado:', err); }
      setCargado(true);
    })();
  }, [negocioId]);
  useEffect(() => {
    if (!cargado) return;
    guardarEstado(negocioId, { products, clientes, ventas, ordenes, movimientos, ajustes, folio });
  }, [cargado, negocioId, products, clientes, ventas, ordenes, movimientos, ajustes, folio]);
  // Si las mesas se desactivan mientras estás en esa sección, regresa a Inicio
  // (solo tras cargar el estado, para no redirigir durante la carga inicial).
  useEffect(() => { if (cargado && !ajustes.activarMesas && vista === 'mesas') setVista('inicio'); }, [cargado, ajustes.activarMesas, vista]);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [showClientes, setShowClientes] = useState(false);
  const [showProgramar, setShowProgramar] = useState(false);
  const [showDescuento, setShowDescuento] = useState(false);
  const [showNota, setShowNota] = useState(false);
  const [showPago, setShowPago] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [showTicket, setShowTicket] = useState(null);
  const [ordenCobro, setOrdenCobro] = useState(null);
  const [productoEditar, setProductoEditar] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // { titulo, texto, textoOk, onOk }

  const addToCart = (p) => setCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    if (ex) {
      if (!ajustes.venderSinStock && ex.cantidad >= p.stock) return prev;
      return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
    }
    return [...prev, { ...p, cantidad: 1 }];
  });

  const updateQty = (id, d) => setCart(prev => prev
    .map(i => i.id === id ? { ...i, cantidad: i.cantidad + d } : i)
    .filter(i => i.cantidad > 0));

  const subtotalCarrito = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const baseImponible = Math.max(0, subtotalCarrito - descuento);
  const impuestoMonto = cart.length > 0 && ajustes.impuestoValor > 0 && ajustes.impuestoApp === 'Añadido al precio'
    ? (ajustes.impuestoModo === 'Porcentaje' ? baseImponible * ajustes.impuestoValor / 100 : ajustes.impuestoValor)
    : 0;
  const totalCarrito = baseImponible + impuestoMonto + (entrega.tarifa || 0);

  const descontarStock = (items) => setProducts(prev => prev.map(p => {
    const it = items.find(c => c.id === p.id);
    return it ? { ...p, stock: Math.max(0, p.stock - it.cantidad) } : p;
  }));

  const resetCarrito = () => {
    setCart([]); setCliente(null); setDescuento(0); setEntrega(ENTREGA_DEFAULT); setNota(''); setShowPago(false);
    setMesaActiva(null); setEditandoCuenta(null);
  };

  const crearOrden = (extra) => {
    const ahoraTs = Date.now();
    return {
      id: `V-${ahoraTs}`, folio, ts: ahoraTs, fecha: horaActual(), hora24: new Date(ahoraTs).getHours(),
      items: [...cart], subtotal: subtotalCarrito, descuento, impuesto: impuestoMonto,
      impuestoDesc: ajustes.impuestoDesc, total: totalCarrito,
      cliente: cliente?.nombre || null, entrega: { ...entrega }, nota,
      mesa: mesaActiva ? mesaActiva.num : null, ...extra,
    };
  };

  const registrarMovimiento = (orden, pagado) => setMovimientos(prev => [{
    id: `M-${orden.id}-${Date.now()}`, ts: orden.ts, tipo: 'Ingreso', pagado, monto: orden.total, metodo: orden.metodo || 'Pendiente',
    categoria: '-', descripcion: `Items: ${orden.items.map(i => `${i.cantidad} ${i.nombre}`).join(', ')}`,
    esVenta: true, folio: orden.folio,
  }, ...prev]);

  // Cobro inmediato
  const registrarVenta = (metodo, recibido, propina) => {
    const esCredito = metodo === 'Venta a crédito';
    const total = totalCarrito + (propina || 0);
    const orden = crearOrden({
      metodo, total, pagado: !esCredito,
      estadoEntrega: entrega.modo === 'En sitio' ? 'Entregado' : 'Pendiente',
      cambio: metodo === 'Efectivo' ? Math.max(0, recibido - total) : 0,
    });
    setVentas(prev => [orden, ...prev]);
    setOrdenes(prev => [orden, ...prev]);
    registrarMovimiento(orden, !esCredito);
    descontarStock(cart);
    setFolio(f => f + 1);
    resetCarrito();
    setVentaExitosa(orden);
  };

  // Cobrar y posponer entrega / Guardar pedido → pago pendiente
  const guardarPedidoPendiente = () => {
    if (cart.length === 0) return;
    const orden = crearOrden({ metodo: null, pagado: false, estadoEntrega: 'Pendiente', cambio: 0 });
    setVentas(prev => [orden, ...prev]);
    setOrdenes(prev => [orden, ...prev]);
    registrarMovimiento(orden, false);
    descontarStock(cart);
    setFolio(f => f + 1);
    resetCarrito();
    setVentaExitosa(orden);
  };

  // Registrar cobro de pedido pendiente
  // ===== MESAS: abrir una mesa libre, editar su cuenta, guardarla o salir =====
  const abrirMesaLibre = (mesa) => { resetCarrito(); setEditandoCuenta(null); setMesaActiva(mesa); setVista('vender'); };
  const editarCuentaMesa = (mesa, orden) => {
    setCart((orden.items || []).map(i => ({ ...i })));
    setEditandoCuenta(orden); setMesaActiva(mesa); setVista('vender');
  };
  const salirMesa = () => { resetCarrito(); setVista('mesas'); };
  // Elegir/quitar mesa DESDE la pantalla de venta (sin cambiar de sección).
  const elegirMesaVender = (mesa) => { setMesaActiva(mesa); if (mesa) setEntrega(ENTREGA_DEFAULT); };
  const guardarCuentaMesa = () => {
    if (cart.length === 0) return;
    if (editandoCuenta) {
      // Actualiza la cuenta abierta: ajusta stock (repone lo viejo, descuenta lo nuevo).
      restaurarStock(editandoCuenta.items || []);
      descontarStock(cart);
      const parche = { items: [...cart], subtotal: subtotalCarrito, descuento, impuesto: impuestoMonto, total: totalCarrito, cliente: cliente?.nombre || null, nota };
      setOrdenes(prev => prev.map(o => o.id === editandoCuenta.id ? { ...o, ...parche } : o));
      setVentas(prev => prev.map(o => o.id === editandoCuenta.id ? { ...o, ...parche } : o));
      setMovimientos(prev => prev.map(m => (m.folio === editandoCuenta.folio && m.esVenta)
        ? { ...m, monto: totalCarrito, descripcion: `Items: ${cart.map(i => `${i.cantidad} ${i.nombre}`).join(', ')}` } : m));
    } else {
      const orden = crearOrden({ metodo: null, pagado: false, estadoEntrega: 'Pendiente', cambio: 0 });
      setVentas(prev => [orden, ...prev]);
      setOrdenes(prev => [orden, ...prev]);
      registrarMovimiento(orden, false);
      descontarStock(cart);
      setFolio(f => f + 1);
    }
    resetCarrito(); setVista('mesas');
  };

  // Cobrar un pedido pendiente con el modal de pago COMPLETO (método, propina, efectivo/cambio).
  const cobrarOrden = (metodo, recibido, propina) => {
    const o = ordenCobro;
    if (!o) return;
    const esCredito = metodo === 'Venta a crédito';
    const nuevoTotal = o.total + (propina || 0);
    const cambio = metodo === 'Efectivo' ? Math.max(0, (recibido || 0) - nuevoTotal) : 0;
    const pagado = !esCredito;
    const parche = { pagado, metodo, cambio, total: nuevoTotal, propina: propina || 0 };
    setOrdenes(prev => prev.map(x => x.id === o.id ? { ...x, ...parche } : x));
    setVentas(prev => prev.map(x => x.id === o.id ? { ...x, ...parche } : x));
    setMovimientos(prev => prev.map(m => m.folio === o.folio && m.esVenta ? { ...m, pagado, metodo, monto: nuevoTotal } : m));
    setOrdenCobro(null);
  };

  const avanzarEstado = (id) => setOrdenes(prev => prev.map(o => {
    if (o.id !== id) return o;
    const esReparto = o.entrega?.modo === 'Reparto';
    const sig = { 'Pendiente': 'Confirmado', 'Confirmado': esReparto ? 'En camino' : 'Entregado', 'En camino': 'Entregado' };
    return { ...o, estadoEntrega: sig[o.estadoEntrega] || o.estadoEntrega };
  }));

  // Devuelve al inventario los productos de una orden/venta
  const restaurarStock = (items) => setProducts(prev => prev.map(p => {
    const it = (items || []).find(c => c.id === p.id);
    return it ? { ...p, stock: p.stock + it.cantidad } : p;
  }));

  // Cancelar pedido: marca estado Cancelado, anula la venta/ingreso y devuelve stock (queda como registro)
  const cancelarPedido = (id) => {
    const o = ordenes.find(x => x.id === id);
    if (!o) return;
    setConfirmar({
      titulo: 'Cancelar pedido', textoOk: 'Sí, cancelar',
      texto: `El pedido #${o.folio} quedará como Cancelado, se anula su venta y se devuelve el stock. Esta acción no se puede deshacer.`,
      onOk: () => {
        setOrdenes(prev => prev.map(x => x.id === id ? { ...x, estadoEntrega: 'Cancelado', pagado: false } : x));
        setVentas(prev => prev.filter(v => v.folio !== o.folio));
        setMovimientos(prev => prev.filter(m => !(m.esVenta && m.folio === o.folio)));
        restaurarStock(o.items);
        setConfirmar(null);
      },
    });
  };

  // Eliminar un pedido cancelado de la lista (el stock ya se devolvió al cancelar)
  const eliminarPedido = (id) => {
    const o = ordenes.find(x => x.id === id);
    if (!o) return;
    setConfirmar({
      titulo: 'Eliminar pedido', textoOk: 'Sí, eliminar',
      texto: `Se quitará el pedido cancelado #${o.folio} de la lista. Esta acción no se puede deshacer.`,
      onOk: () => { setOrdenes(prev => prev.filter(x => x.id !== id)); setConfirmar(null); },
    });
  };

  // Limpiar TODOS los pedidos cancelados de una vez
  const limpiarCanceladas = () => {
    const n = ordenes.filter(o => o.estadoEntrega === 'Cancelado').length;
    if (n === 0) return;
    setConfirmar({
      titulo: 'Limpiar canceladas', textoOk: `Sí, eliminar ${n}`,
      texto: `Se quitarán ${n} pedido(s) cancelado(s) de la lista. Esta acción no se puede deshacer.`,
      onOk: () => { setOrdenes(prev => prev.filter(o => o.estadoEntrega !== 'Cancelado')); setConfirmar(null); },
    });
  };

  // Eliminar venta (desde Reportes): borra del historial, quita el pedido y devuelve stock
  const eliminarVenta = (venta) => {
    setConfirmar({
      titulo: 'Eliminar venta', textoOk: 'Sí, eliminar',
      texto: `Se borrará la venta #${venta.folio} del historial y de finanzas, y se devolverá el stock. Esta acción no se puede deshacer.`,
      onOk: () => {
        setVentas(prev => prev.filter(v => v.id !== venta.id));
        setOrdenes(prev => prev.filter(o => o.folio !== venta.folio));
        setMovimientos(prev => prev.filter(m => !(m.esVenta && m.folio === venta.folio)));
        restaurarStock(venta.items);
        setConfirmar(null);
      },
    });
  };

  // Eliminar un movimiento de Finanzas. Si es una venta, revierte todo (venta + stock).
  const eliminarMovimiento = (mov) => {
    if (mov.esVenta) {
      const venta = ventas.find(v => v.folio === mov.folio);
      if (venta) { eliminarVenta(venta); return; }
    }
    setConfirmar({
      titulo: 'Eliminar movimiento', textoOk: 'Sí, eliminar',
      texto: `Se eliminará este ${mov.tipo === 'Ingreso' ? 'ingreso' : 'gasto'} de ${money(mov.monto)}${mov.descripcion ? ` (${mov.descripcion})` : ''}. Esta acción no se puede deshacer.`,
      onOk: () => { setMovimientos(prev => prev.filter(m => m.id !== mov.id)); setConfirmar(null); },
    });
  };

  // Editar un movimiento manual en su lugar (conserva su id y fecha).
  const editarMovimiento = (mov) => setMovimientos(prev => prev.map(m => m.id === mov.id ? { ...m, ...mov } : m));

  const guardarProducto = (p) => {
    if (p.id) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x));
    else setProducts(prev => [{ ...p, id: Date.now().toString(), fav: false }, ...prev]);
    setProductoEditar(null);
    setVista('productos');
  };

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
    ...(ajustes.activarMesas ? [{ id: 'mesas', label: 'Mesas', icon: Utensils }] : []),
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'finanzas', label: 'Finanzas', icon: Landmark },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  const esFullPage = vista === 'crear-producto';
  const irA = (v) => { if (v === 'ajustes') setAjustesTab('General'); setVista(v); setMenuAbierto(false); };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-gray-900 overflow-hidden">
      {/* Fondo oscuro del cajón en móvil */}
      {!esFullPage && menuAbierto && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMenuAbierto(false)} />
      )}
      {!esFullPage && (
        <aside className={`w-64 md:w-60 bg-slate-50 border-r border-gray-100 flex flex-col shrink-0 p-3 z-40
          fixed inset-y-0 left-0 md:static transform transition-transform duration-200
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="px-3 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LumenLogo size={46} />
              <div className="leading-none">
                <p className="text-xl font-semibold tracking-tight" style={{ color: '#3FA8C2' }}>Lumen</p>
                <p className="text-xl font-black tracking-tight" style={{ color: '#232F55' }}>BASE</p>
              </div>
            </div>
            <button onClick={() => setMenuAbierto(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <button onClick={() => irA('vender')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold mb-4 transition-colors ${vista === 'vender' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Zap className="w-5 h-5" /> Vender
          </button>
          <nav className="space-y-1">
            {navItems.map(n => (
              <button key={n.id} onClick={() => irA(n.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-colors ${vista === n.id ? 'bg-white shadow-sm text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                <n.icon className="w-5 h-5" /> {n.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-3 py-3 space-y-2">
            {rol === 'agencia' && negocios && negocios.length > 1 && (
              <select value={negocioId} onChange={e => onCambiarNegocio && onCambiarNegocio(e.target.value)}
                className="w-full text-xs font-bold border border-gray-200 rounded-lg px-2 py-2 bg-white outline-none focus:border-blue-500">
                {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre || n.id}</option>)}
              </select>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm">{(NEGOCIO || 'L').slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="text-xs font-bold text-gray-900 truncate">{NEGOCIO}</p><p className="text-xs text-gray-500 truncate">{sesion ? sesion.user.email : 'Local'}</p></div>
            </div>
            {onCerrarSesion && (
              <button onClick={onCerrarSesion} className="w-full text-xs font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg py-2 transition-colors">Cerrar sesión</button>
            )}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-hidden bg-slate-100 flex flex-col min-w-0">
        {/* Barra superior solo en móvil */}
        {!esFullPage && (
          <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 shrink-0">
            <button onClick={() => setMenuAbierto(true)} className="p-1.5 rounded-lg hover:bg-gray-100"><Menu className="w-6 h-6 text-gray-700" /></button>
            <div className="flex items-center gap-2">
              <LumenLogo size={30} />
              <span className="font-black tracking-tight" style={{ color: '#232F55' }}>Lumen<span style={{ color: '#3FA8C2' }}> BASE</span></span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
        {vista === 'inicio' && (
          <div className="h-full overflow-y-auto">
            <ViewInicio ajustes={ajustes} ventas={ventas} movimientos={movimientos} products={products}
              go={(v) => { if (v === 'crear-producto') setProductoEditar(null); setVista(v); }} />
          </div>
        )}
        {vista === 'vender' && (
          <ViewVender
            products={products} cart={cart} addToCart={addToCart} updateQty={updateQty}
            cliente={cliente} setShowClientes={setShowClientes}
            descuento={descuento} entrega={entrega} nota={nota}
            cobrar={() => setShowPago(true)} guardarPedido={mesaActiva ? guardarCuentaMesa : guardarPedidoPendiente}
            guardarLabel={mesaActiva ? (editandoCuenta ? 'Actualizar cuenta' : 'Guardar cuenta') : 'Guardar Pedido'}
            ocultarCobrar={!!editandoCuenta}
            mesaBanner={(mesaActiva && editandoCuenta) ? { num: mesaActiva.num, onSalir: salirMesa } : null}
            mesasActivas={ajustes.activarMesas} mesas={ajustes.mesas} mesaSel={mesaActiva} onElegirMesa={elegirMesaVender}
            limpiarCarrito={resetCarrito}
            goNuevoProducto={() => { setProductoEditar(null); setVista('crear-producto'); }}
            setShowProgramar={setShowProgramar} setShowDescuento={setShowDescuento} setShowNota={setShowNota}
            impuesto={{ monto: impuestoMonto, desc: ajustes.impuestoDesc }} permitirSinStock={ajustes.venderSinStock}
            onTipoPedido={(m) => {
              if (m === 'En sitio') setEntrega(ENTREGA_DEFAULT);
              else { setEntrega(prev => ({ ...prev, modo: m })); setShowProgramar(true); }
            }}
          />
        )}
        {vista === 'mesas' && ajustes.activarMesas && (
          <div className="h-full overflow-y-auto">
            <ViewMesas ajustes={ajustes} ordenes={ordenes}
              onAbrirLibre={abrirMesaLibre}
              onEditarCuenta={editarCuentaMesa}
              onCobrar={o => setOrdenCobro(o)}
              onVerTicket={o => setShowTicket(o)}
              onCancelarCuenta={cancelarPedido} />
          </div>
        )}
        {vista === 'pedidos' && (
          <div className="h-full overflow-y-auto">
            <ViewPedidos ordenes={ordenes} goVender={() => setVista('vender')}
              onVerTicket={o => setShowTicket(o)}
              onRegistrarCobro={o => setOrdenCobro(o)}
              onAvanzarEstado={avanzarEstado}
              onCancelar={cancelarPedido}
              onEliminar={eliminarPedido}
              onLimpiarCanceladas={limpiarCanceladas} />
          </div>
        )}
        {vista === 'productos' && (
          <div className="h-full overflow-y-auto">
            <ViewProductos products={products}
              onNuevo={() => { setProductoEditar(null); setVista('crear-producto'); }}
              onEditar={p => { setProductoEditar({ ...p, precio: String(p.precio), costo: String(p.costo), stock: String(p.stock), stockMin: String(p.stockMin || 5), codigo: p.codigo || '', sku: p.sku || '' }); setVista('crear-producto'); }}
              onEliminar={id => setProducts(prev => prev.filter(p => p.id !== id))}
              onToggleFav={id => setProducts(prev => prev.map(p => p.id === id ? { ...p, fav: !p.fav } : p))}
              onStock={(id, d) => setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + d) } : p))}
            />
          </div>
        )}
        {vista === 'crear-producto' && (
          <div className="h-full bg-slate-50">
            <CrearProducto inicial={productoEditar} onGuardar={guardarProducto} onVolver={() => setVista(productoEditar ? 'productos' : 'vender')} />
          </div>
        )}
        {vista === 'finanzas' && (
          <div className="h-full overflow-y-auto">
            <ViewFinanzas movimientos={movimientos} ventas={ventas} products={products} ajustes={ajustes}
              onNueva={t => setMovimientos(prev => [{ ...t, id: `M-${Date.now()}`, ts: Date.now() }, ...prev])}
              onEditarMov={editarMovimiento} onEliminarMov={eliminarMovimiento} />
          </div>
        )}
        {vista === 'reportes' && (
          <div className="h-full overflow-y-auto">
            <ViewReportes movimientos={movimientos} ventas={ventas}
              onVerVenta={v => setShowTicket(v)} onEliminarVenta={eliminarVenta} />
          </div>
        )}
        {vista === 'ajustes' && (
          <div className="h-full overflow-y-auto">
            <ViewAjustes key={ajustesTab} initialTab={ajustesTab} ajustes={ajustes} onGuardar={setAjustes} />
          </div>
        )}
        </div>
      </main>

      {showClientes && (
        <ClientesPanel clientes={clientes}
          onClose={() => setShowClientes(false)}
          onSelect={c => { setCliente(c); setShowClientes(false); }}
          onCrear={c => { setClientes(prev => [c, ...prev]); setCliente(c); setShowClientes(false); }} />
      )}
      {showProgramar && (
        <ProgramarPedidoModal entrega={entrega} cliente={cliente}
          onAbrirClientes={() => setShowClientes(true)}
          onClose={() => setShowProgramar(false)}
          onGuardar={e => { setEntrega(e); setShowProgramar(false); }} />
      )}
      {showDescuento && (
        <DescuentoModal subtotal={subtotalCarrito} descuento={descuento}
          onClose={() => setShowDescuento(false)}
          onAplicar={d => { setDescuento(d); setShowDescuento(false); }} />
      )}
      {showNota && (
        <NotaModal nota={nota} onClose={() => setShowNota(false)} onGuardar={t => { setNota(t); setShowNota(false); }} />
      )}
      {showPago && (
        <PagoModal total={totalCarrito} tieneCliente={!!cliente}
          onClose={() => setShowPago(false)} onPagar={registrarVenta}
          onPosponer={guardarPedidoPendiente} />
      )}
      {ventaExitosa && (
        <SuccessModal venta={ventaExitosa} primeraVenta={ventas.length === 1}
          onContinuar={() => setVentaExitosa(null)}
          onVerTicket={() => { setShowTicket(ventaExitosa); setVentaExitosa(null); }} />
      )}
      {showTicket && (
        <TicketPanel venta={showTicket} ajustes={ajustes} onClose={() => setShowTicket(null)}
          onPersonalizar={() => { setShowTicket(null); setAjustesTab('Ticket'); setVista('ajustes'); }} />
      )}
      {ordenCobro && (
        <PagoModal total={ordenCobro.total} tieneCliente={!!ordenCobro.cliente}
          onClose={() => setOrdenCobro(null)} onPagar={cobrarOrden} />
      )}
      {confirmar && (
        <ConfirmModal titulo={confirmar.titulo} texto={confirmar.texto} textoOk={confirmar.textoOk}
          onOk={confirmar.onOk} onClose={() => setConfirmar(null)} />
      )}
    </div>
  );
}

// ============ PANTALLA DE LOGIN ============
function LoginScreen({ onEntrar, cargando, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <LumenLogo size={64} />
          <p className="text-2xl font-semibold tracking-tight mt-2" style={{ color: '#3FA8C2' }}>Lumen<span className="font-black" style={{ color: '#232F55' }}> BASE</span></p>
          <p className="text-sm text-gray-500 mt-1">Punto de Venta</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); onEntrar(email.trim(), password); }}>
          <label className="text-sm font-bold text-gray-700 block mb-1.5">Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-blue-500" placeholder="tucorreo@ejemplo.com" />
          <label className="text-sm font-bold text-gray-700 block mb-1.5">Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-2 outline-none focus:border-blue-500" placeholder="••••••••" />
          {error && <p className="text-rose-600 text-sm font-semibold mb-3">{error}</p>}
          <button type="submit" disabled={cargando || !email || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-full mt-3 shadow-lg shadow-blue-600/25 disabled:shadow-none">
            {cargando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-5">Usa la misma cuenta de tu panel Lumen Base.</p>
      </div>
    </div>
  );
}

// ============ PANTALLA: SIN NEGOCIO ASIGNADO ============
function SinNegocio({ email, onCerrarSesion }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
        <LumenLogo size={56} />
        <h2 className="text-xl font-black text-gray-900 mt-3 mb-2">Sin negocio asignado</h2>
        <p className="text-gray-500 text-sm mb-5">La cuenta <b>{email}</b> aún no está vinculada a ningún negocio. Pide a tu agencia que la vincule desde Ajustes en Lumen Base.</p>
        <button onClick={onCerrarSesion} className="w-full border border-gray-200 hover:bg-gray-50 font-bold py-3 rounded-full">Cerrar sesión</button>
      </div>
    </div>
  );
}

// ============ PUERTA DE AUTENTICACIÓN (export principal) ============
export default function App() {
  const [estado, setEstado] = useState('cargando'); // cargando | login | listo | sin-negocio
  const [sesion, setSesion] = useState(null);
  const [rol, setRol] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [negocioId, setNegocioId] = useState(null);
  const [errorLogin, setErrorLogin] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Si no hay Supabase configurado, funciona en modo local (?cliente= o 'demo')
  const modoLocal = !hayConfigSupabase();

  async function aplicarSesion(s) {
    if (!s) { setEstado('login'); return; }
    setSesion(s);
    const { rol: r, negocioId: nid, negocios: negs } = await resolverNegocios(s);
    setRol(r); setNegocios(negs);
    // Restaura el negocio que estaba seleccionado antes de recargar
    // (salvo que la URL traiga ?cliente=, que tiene prioridad).
    let elegido = nid;
    try {
      const urlp = new URLSearchParams(window.location.search);
      const tieneUrl = urlp.get('cliente') || urlp.get('negocioId') || urlp.get('negocio');
      if (!tieneUrl) {
        const g = localStorage.getItem('lumen_pos_negocio');
        if (g && negs.some(n => n.id === g)) elegido = g;
      }
    } catch (e) { /* ignore */ }
    if (elegido) { setNegocioId(elegido); try { localStorage.setItem('lumen_pos_negocio', elegido); } catch (e) {} setEstado('listo'); }
    else { setEstado('sin-negocio'); }
  }

  // Cambiar de negocio (agencia): recuerda la elección para la próxima recarga.
  const cambiarNegocio = (id) => {
    setNegocioId(id);
    try { localStorage.setItem('lumen_pos_negocio', id); } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (modoLocal) {
      let nid = 'demo';
      try {
        const p = new URLSearchParams(window.location.search);
        const v = p.get('cliente') || p.get('negocioId');
        if (v) nid = v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        else {
          const g = localStorage.getItem('lumen_pos_negocio');
          if (g) nid = g;
        }
      } catch (e) { /* ignore */ }
      setNegocioId(nid);
      try { localStorage.setItem('lumen_pos_negocio', nid); } catch (e) {}
      setEstado('listo');
      return;
    }
    (async () => {
      try { await aplicarSesion(await getSesion()); }
      catch (e) { console.warn(e); setEstado('login'); }
    })();
  }, []);

  const entrar = async (email, password) => {
    setEntrando(true); setErrorLogin('');
    try {
      const s = await iniciarSesion(email, password);
      await aplicarSesion(s);
    } catch (e) {
      setErrorLogin(e.message && /invalid/i.test(e.message) ? 'Correo o contraseña incorrectos.' : (e.message || 'No se pudo iniciar sesión.'));
    } finally { setEntrando(false); }
  };

  const salir = async () => { await cerrarSesion(); setSesion(null); setNegocioId(null); setNegocios([]); setRol(null); setEstado('login'); };

  if (estado === 'cargando') {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-pulse"><LumenLogo size={72} /></div></div>;
  }
  if (estado === 'login') return <LoginScreen onEntrar={entrar} cargando={entrando} error={errorLogin} />;
  if (estado === 'sin-negocio') return <SinNegocio email={sesion ? sesion.user.email : ''} onCerrarSesion={salir} />;

  return (
    <PosApp
      key={negocioId}
      negocioId={negocioId}
      negocioNombre={(negocios.find(n => n.id === negocioId) || {}).nombre}
      sesion={sesion}
      negocios={negocios}
      rol={rol}
      onCambiarNegocio={modoLocal ? null : cambiarNegocio}
      onCerrarSesion={modoLocal ? null : salir}
    />
  );
}
