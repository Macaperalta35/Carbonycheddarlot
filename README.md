# 🍔 Carbon & Cheddar Lota — Sistema POS & Pedidos

> Sistema de punto de venta (POS), gestión de restaurant y pedidos online para **Carbon & Cheddar**, ubicado en Lota, Chile. Funciona como **Progressive Web App (PWA)** instalable, con base de datos en la nube (**Supabase**) y sincronización en tiempo real entre dispositivos.

---

## 🆕 Novedades recientes

Cambios incorporados en la rama de desarrollo (ver detalle de cada uno más abajo):

| # | Cambio | Dónde |
|---|---|---|
| 🛍️ | **Pedido online del cliente** con botón "Enviar pedido" (carrito + datos de retiro) que llega al POS en *Pedidos Online* | [CustomerView.jsx](src/components/CustomerView.jsx) |
| 📲 | **Botón "Instalar app"** ahora visible también para el cliente (Android/Chrome automático; iPhone con instrucciones) | [InstallButton.jsx](src/components/InstallButton.jsx) |
| 🥬 | **Insumos y recetas**: inventario de ingredientes + receta por producto; al vender, descuenta los insumos automáticamente | [InsumosView.jsx](src/components/InsumosView.jsx) · [recetas.js](src/lib/recetas.js) |
| 🌓 | **Modo claro / oscuro** con interruptor persistente (botón de accesibilidad ♿) | [AccessibilityWidget.jsx](src/components/AccessibilityWidget.jsx) |
| 📶 | **Sesión offline**: el login del personal se mantiene al recargar y los datos quedan cacheados para funcionar sin internet | [useSupabaseData.js](src/hooks/useSupabaseData.js) |
| 👤 | **Registro / login de clientes por email** (Supabase Auth) con **consentimiento** y política de privacidad | [auth.js](src/lib/auth.js) · [CustomerView.jsx](src/components/CustomerView.jsx) |
| 🔒 | **Guía de seguridad y cumplimiento legal (Chile)** — Ley 19.628 / 21.719 / 21.663 | [docs/SEGURIDAD.md](docs/SEGURIDAD.md) |

---

## 📋 Descripción General

El sistema integra dos experiencias en una sola app web:

- **Personal del local (POS):** acceso por URL con `?pos=1`. Ventas, inventario, insumos, compras, egresos, reportes, carta y configuración, según el rol.
- **Cliente:** acceso por la URL normal (sin `?pos=1`). Ve la carta, instala la app y hace pedidos online para retirar.

Los datos se guardan en **Supabase** (PostgreSQL + Realtime + Auth) y, si no hay conexión o no está configurado, la app usa **localStorage** como respaldo offline automático.

---

## ✨ Funcionalidades

### 🧾 Ventas / POS
| Función | Descripción |
|---|---|
| Ticket de venta | Agrega, edita y elimina productos; cantidades y notas |
| Descuento por ítem y general | Descuentos individuales y sobre el total |
| Calculadora de vuelto | Vuelto automático en efectivo con montos rápidos |
| Medios de pago | Efectivo, Tarjeta y Transferencia |
| Pedidos Online | Cola de pedidos del cliente (Pendiente → Preparando → Completado) |
| Impresión térmica Bluetooth | Boleta por impresora ESC/POS vía Bluetooth |
| Descuento de insumos | Al cobrar, descuenta los ingredientes según la receta |

### 🛍️ Portal del Cliente
| Función | Descripción |
|---|---|
| Carta de imágenes | Galería de la carta con visor ampliable |
| Pedido online | Filtro por categoría, carrito y envío del pedido |
| Cuenta de cliente | Registro / inicio de sesión por email |
| Instalar app | Botón para instalar la PWA en el celular |
| Privacidad | Consentimiento de datos y política de privacidad visibles |

### 🔑 Administración
| Módulo | Descripción | Componente |
|---|---|---|
| 📦 Inventario | Stock, precios y datos de cada producto | [InventoryView.jsx](src/components/InventoryView.jsx) |
| 🥬 Insumos & Recetas | Inventario de ingredientes y receta por producto | [InsumosView.jsx](src/components/InsumosView.jsx) |
| 🛒 Compras | Registro de boletas/facturas de proveedores | [ComprasView.jsx](src/components/ComprasView.jsx) |
| 💸 Egresos | Gastos y servicios (luz, agua, gas, etc.) | [EgresosView.jsx](src/components/EgresosView.jsx) |
| 📊 Reportes | Métricas de ventas, egresos y resultado | [ReportsView.jsx](src/components/ReportsView.jsx) |
| 📄 Carta PDF | Gestión y exportación de la carta digital | [CartaView.jsx](src/components/CartaView.jsx) |
| ⚙️ Configuración | PIN de acceso y ajustes (solo Super Admin) | [SettingsView.jsx](src/components/SettingsView.jsx) |

---

## 👤 Roles de Usuario

| Rol | Cómo acceder | Permisos |
|---|---|---|
| **Cajero** | Por defecto al abrir con `?pos=1` | Ventas, pedidos online, Carta PDF |
| **Administrador** | Selector de rol → PIN (`1234` por defecto) | Todo lo del cajero + Inventario, Insumos, Compras, Egresos, Reportes |
| **Super Admin** | Selector de rol → PIN (`9999` por defecto) | Todo lo anterior + Configuración |
| **Cliente** | URL sin `?pos=1` | Carta, pedidos online (con cuenta), instalar app |

> ⚠️ Los PIN se pueden cambiar en **Configuración**. Se guardan en el navegador; para producción revisa el endurecimiento recomendado en [docs/SEGURIDAD.md](docs/SEGURIDAD.md).

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **React 19 + Vite 8** | Interfaz y bundler |
| **Supabase** (`@supabase/supabase-js`) | Base de datos PostgreSQL, Realtime y Auth |
| **PWA** (Service Worker + Manifest) | Instalación y funcionamiento offline |
| **Web Bluetooth** | Impresión térmica ESC/POS |
| **pdfjs-dist / qrcode** | Carta en PDF y códigos QR |
| **CSS Variables** | Temas claro/oscuro y accesibilidad |

---

## 📁 Estructura del Proyecto

```
Carbonycheddarlot/
├── public/
│   └── sw.js                      → Service Worker (offline/PWA)
├── src/
│   ├── components/
│   │   ├── CustomerView.jsx       → Vista del cliente (carta + pedido online + login)
│   │   ├── POSView.jsx            → Punto de venta del personal
│   │   ├── InventoryView.jsx      → Inventario de productos
│   │   ├── InsumosView.jsx        → Insumos y recetas
│   │   ├── ComprasView.jsx        → Compras a proveedores
│   │   ├── EgresosView.jsx        → Egresos y servicios
│   │   ├── ReportsView.jsx        → Reportes y cierre
│   │   ├── CartaView.jsx          → Carta digital / PDF
│   │   ├── SettingsView.jsx       → Configuración (Super Admin)
│   │   ├── AccessibilityWidget.jsx→ Accesibilidad + tema claro/oscuro
│   │   └── InstallButton.jsx      → Instalación de la PWA
│   ├── hooks/
│   │   ├── useSupabaseData.js     → Datos en Supabase con respaldo offline
│   │   ├── useLocalStorage.js     → Persistencia local
│   │   └── useCartaImages.js      → Imágenes de la carta
│   ├── lib/
│   │   ├── supabase.js            → Cliente de Supabase
│   │   ├── auth.js                → Login de clientes (email)
│   │   └── recetas.js             → Descuento de insumos por receta
│   ├── services/
│   │   └── bluetoothPrinter.js    → Impresión térmica Bluetooth
│   ├── data/
│   │   ├── menu.js                → Carta de productos
│   │   └── insumos.js             → Insumos iniciales
│   └── App.jsx                    → Enrutador, roles y estado global
├── supabase/
│   └── schema.sql                 → Esquema de la base de datos
├── docs/
│   └── SEGURIDAD.md               → Seguridad y cumplimiento legal (Chile)
└── package.json
```

---

## 🚀 Instalación y Ejecución

### Requisitos
- **Node.js** 18+ y **npm** 9+

### Pasos
```bash
git clone https://github.com/Macaperalta35/Carbonycheddarlot.git
cd Carbonycheddarlot
npm install
npm run dev
```
Abre `http://localhost:5173`. Para el panel del personal usa `http://localhost:5173/?pos=1`.

### Comandos
```bash
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para producción (carpeta /dist)
npm run preview  # Previsualizar el build
npm run deploy   # Publicar en GitHub Pages
```

---

## ☁️ Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta [supabase/schema.sql](supabase/schema.sql) (es re-ejecutable sin errores).
3. Crea un archivo `.env` en la raíz con tus credenciales (*Project Settings → API*):
   ```
   VITE_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
   ```
4. Para el **login de clientes**: *Authentication → Providers → Email* habilitado. Para registro inmediato, desactiva *"Confirm email"*.

> Si no configuras Supabase, la app funciona igual usando `localStorage` (sin sincronización entre dispositivos).

---

## 🖨️ Impresión Térmica (Bluetooth)

Desde el POS puedes conectar una impresora térmica **ESC/POS** por Bluetooth (Web Bluetooth) para imprimir la boleta. Funciona en **Chrome/Edge en Android, Windows, Mac y Linux**. En iPhone/iPad se usa la impresión del sistema (AirPrint) como respaldo.

---

## 🔒 Seguridad y Privacidad

El sistema maneja datos de clientes (nombre, email, teléfono) bajo la legislación chilena (**Ley 19.628**, **Ley 21.719**, **Ley 21.663**). Incluye consentimiento y política de privacidad para el cliente.

➡️ Revisa el checklist y los pendientes de endurecimiento en **[docs/SEGURIDAD.md](docs/SEGURIDAD.md)**.

---

## 📱 Instalar como App (PWA)

- **Android:** Chrome → botón "Instalar app" o Menú (⋮) → "Agregar a pantalla de inicio".
- **iPhone / iPad:** Safari → Compartir → "Agregar a inicio".
- **Windows / Mac:** Chrome/Edge → ícono de instalación en la barra de direcciones.

---

## 📞 Contacto del Local

| Dato | Información |
|---|---|
| 📍 Dirección | Carlos Cousiño 215, Lota Alto, Biobío, Chile |
| 📱 Teléfono | +56 9 8417 0433 |
| 📸 Instagram | [@carbonycheddarlota](https://instagram.com/carbonycheddarlota) |

---

## 📄 Licencia

Proyecto de uso interno para **Carbon & Cheddar Lota**. Los derechos del diseño gráfico (logo, carta) pertenecen al restaurant.

---

*Hecho con ❤️ por LILITH para Carbon & Cheddar Lota.*
