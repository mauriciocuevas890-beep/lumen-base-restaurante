# Lumen Base Restaurante — Punto de Venta

Punto de venta (POS) web para restaurantes, hecho en React. Multi‑cliente con
Supabase (cada negocio ve solo sus datos), instalable como app (PWA) y con
sincronización en la nube.

**Demo en vivo:** https://lumen-base-restaurante.netlify.app

## Funcionalidades

- Ventas rápidas con carrito, descuentos, impuestos y notas.
- Tipos de pedido: **En sitio**, **Reparto** y Pickup.
- **Mesas**: activables desde Ajustes; croquis por zonas, cuenta por mesa,
  cobro con el modal de pago completo y liberación al cobrar.
- **Pedidos** con estados (Pendiente → Confirmado → En camino → Entregado),
  filtros por Abiertos / Completados / Todos y fecha‑hora de cada pedido.
- **Cobro** con efectivo (cambio), tarjeta, transferencia, monedero, crédito y propina.
- **Finanzas**: ingresos, gastos, por cobrar/pagar; crear, **editar y eliminar**
  movimientos; exportación a **Excel**; filtro por Hoy / Últimos 30 días / Histórico.
- **Reportes** por Hora / Día / Semana / Mes con KPIs y mejores productos.
- **Comprobantes** (Ticket y Factura): imprimir, **descargar** como imagen y **compartir**.
- Inventario con control de stock (una venta cancelada devuelve stock).
- Configuración de negocio, mesas, impresoras y personalización del ticket.

## Estructura

```
src/                 Código fuente
  App.jsx            Aplicación completa (React, un solo archivo)
  persistencia.js    Capa de datos: localStorage + Supabase por negocio
  main.jsx           Punto de entrada
  index.html         Plantilla base
  vite.config.js     Configuración de build
  package.json       Dependencias
  supabase_schema.sql Esquema de base de datos + reglas de seguridad (RLS)
  .env.example       Variables de entorno de ejemplo

dist/                Build listo para publicar (lo que corre en Netlify)
  index.html         App compilada en un solo archivo
  manifest.webmanifest, iconos PNG (PWA)
```

## Publicar

La forma más simple: arrastra la carpeta `dist/` a **Netlify Drop**
(https://app.netlify.com/drop) o súbela a cualquier hosting estático.

## Tecnologías

React 18 · Tailwind CSS (CDN) · Supabase (Postgres + Auth) · SheetJS (Excel) ·
html2canvas (compartir/descargar ticket) · esbuild / Vite.

## Configuración de Supabase

La app lee `window.LUMEN_CONFIG` (URL y clave **publicable/anon** de Supabase).
La clave anon es pública por diseño: la seguridad real vive en las reglas RLS
del archivo `src/supabase_schema.sql`, que aíslan los datos de cada negocio.
