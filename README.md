# 🍔 Carbon & Cheddar Lota — Sistema POS & Delivery

> Sistema de punto de venta (POS) interactivo y plataforma de pedidos web para el restaurant **Carbon & Cheddar**, ubicado en Lota, Chile. Inspirado en la interfaz de Loyverse y optimizado para funcionar como Progressive Web App (PWA) instalable en cualquier dispositivo.

---

## 📋 Descripción General

Este sistema integra dos interfaces en una sola aplicación web:

- **Panel de Cajero / POS (Personal del local):** Cuadrícula de productos al estilo Loyverse, gestión del ticket de venta con descuentos por ítem, selección de tamaño para papas fritas, calculadora de vuelto en efectivo, cola de pedidos online entrantes y generación de boleta en el formato oficial del local.

- **Portal de Pedidos para Clientes:** Menú interactivo con descripción de cada producto, precios con IVA incluido (19%), control de stock en tiempo real, carro de compras y formulario de retiro en local. Al enviar, el pedido aparece automáticamente en la cola del cajero.

---

## ✨ Funcionalidades Principales

### Panel del Personal (POS)
| Función | Descripción |
|---|---|
| 🛒 Ticket de Venta | Agrega, edita y elimina productos directamente en el ticket |
| 🗑️ Eliminación Directa | Botón de papelera por ítem para retirar de la boleta al instante |
| 💸 Descuento por Ítem | Haz clic sobre cualquier producto del ticket para aplicar un descuento individual (0% a 50%) |
| 📊 Descuento General | Selector de descuento sobre el total completo del ticket (0% a 20%) |
| 🔥 Detección de Combos | Detecta automáticamente Hamburguesa + Acompañamiento + Bebida y propone 10% de descuento |
| 💵 Calculadora de Vuelto | Calcula el vuelto automático al recibir efectivo, con botones de montos rápidos |
| 🧾 Boleta Oficial | Genera el ticket en el formato estándar del local, desglosando descuentos por línea |
| 🔔 Pedidos Online | Cola de pedidos enviados por clientes desde el portal web con estado "Pendiente/Preparando/Completado" |
| 🍟 Variantes de Tamaño | Selector de tamaño (Individual, Mediana, Grande) para todas las variedades de papas fritas |

### Portal del Cliente
| Función | Descripción |
|---|---|
| 🗂️ Filtro por Categoría | Filtra entre Burgers, Completos, Almuerzos, Niños, Sides, Drinks y Desserts |
| 📦 Control de Stock | Muestra el stock real y advierte cuando hay menos de 5 unidades disponibles |
| 🛍️ Carro de Compras | Añade y ajusta cantidades en tiempo real |
| 📝 Formulario de Retiro | Ingresa nombre, teléfono y tiempo estimado de retiro |
| 📄 Descarga Carta PDF | Exporta el menú completo en formato PDF usando el sistema de impresión nativo del navegador |

### Panel de Administración (rol: Admin)
| Función | Descripción |
|---|---|
| 🔐 PIN de Seguridad | El acceso al panel de Admin requiere PIN de 4 dígitos (`1234` en modo simulación) |
| 📦 Gestión de Inventario | Edita nombre, precio, descripción, categoría y stock de cualquier producto |
| ➕ Carga Rápida de Stock | Agrega +5 unidades al stock de cualquier ítem con un solo clic |
| ⚠️ Alertas de Stock Crítico | Destacado visual en rojo/naranja para productos con menos de 5 unidades |
| 📊 Informes de Ventas | Métricas del día: ingresos totales, cantidad de pedidos, ticket promedio |
| 💳 Desglose por Pago | Distribución visual de ventas por Efectivo, Tarjeta y Transferencia |
| 📝 Entrega de Turno | Minuta automática listo para copiar al portapapeles y enviar por WhatsApp o correo |

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Uso |
|---|---|
| **React 19** | Framework principal de la interfaz |
| **Vite 8** | Bundler y servidor de desarrollo |
| **CSS Variables + Vanilla CSS** | Sistema de diseño en modo oscuro con variables HSL personalizadas |
| **Google Fonts - Outfit** | Tipografía moderna premium |
| **LocalStorage + Custom Hook** | Persistencia del menú, pedidos e inventario con sincronización entre pestañas |
| **PWA (Service Worker + Manifest)** | Instalación en Android, iOS y escritorio como aplicación nativa |
| **@media print** | Exportación del menú a PDF sin dependencias externas |

---

## 📁 Estructura del Proyecto

```
carbon-cheddar-pos/
├── public/
│   ├── manifest.json       → Configuración de la PWA (íconos, tema, nombre)
│   └── sw.js               → Service Worker para funcionamiento offline
├── src/
│   ├── components/
│   │   ├── CustomerView.jsx  → Vista pública del cliente (menú + carro + PDF)
│   │   ├── POSView.jsx       → Panel del cajero estilo Loyverse
│   │   ├── InventoryView.jsx → Gestión de inventario (solo Admin)
│   │   └── ReportsView.jsx   → Reportes y cierre de turno (solo Admin)
│   ├── data/
│   │   └── menu.js           → Carta oficial de Carbon & Cheddar con variantes de papas
│   ├── hooks/
│   │   └── useLocalStorage.js → Hook personalizado de persistencia con sync multi-pestaña
│   ├── App.jsx               → Enrutador principal y gestión de roles (Cajero / Admin)
│   ├── main.jsx              → Punto de entrada y registro del Service Worker
│   └── index.css             → Hoja de estilos global (modo oscuro, responsive, @media print)
├── index.html                → HTML base con SEO, manifest y meta tags
├── vite.config.js
└── package.json
```

---

## 🚀 Instalación y Ejecución

### Pre-requisitos
- **Node.js** versión 18 o superior
- **npm** versión 9 o superior

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Macaperalta35/Carbonycheddarlot.git
cd Carbonycheddarlot

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo local
npm run dev
```

Abre tu navegador en `http://localhost:5173` para acceder al sistema.

### Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo con HMR (recarga instantánea)
npm run build    # Compilar para producción (genera carpeta /dist)
npm run preview  # Previsualizar el bundle de producción localmente
```

---

## 👤 Roles de Usuario

| Rol | Cómo acceder | Permisos |
|---|---|---|
| **Cajero** | Predeterminado al abrir la aplicación | Ventas, pedidos online, cobros |
| **Administrador** | Selector de rol → ingresar PIN `1234` | Todo lo anterior + Inventario, Reportes y cierre de turno |
| **Cliente** | Clic en el botón "Ver Menú Cliente" | Menú interactivo, pedidos para retirar, descarga de carta PDF |

> ⚠️ **Nota:** El PIN `1234` es el PIN de simulación para demostración. En un entorno de producción real, se recomienda conectar un sistema de autenticación seguro (ej. JWT, Clerk, Firebase Auth).

---

## 🗂️ Carta de Productos

El sistema incluye las categorías y productos reales de **Carbon & Cheddar Lota**:

| Categoría | Productos |
|---|---|
| 🍔 Burgers | Hamburguesa Carbon, Cheddar, Doble, Bacon, Veggie, A lo Pobre |
| 🥖 Completos | Completo Italiano, Dinámico, Americano |
| 🍽️ Almuerzos | Pasta del Día, Lasaña, Ensaladas, Milanesa Lotina, Fetuccinis |
| 👶 Niños | Salchipapas, Mini Burger Cheddar, Fetuccini Boloñesa (todos con Refreskid) |
| 🍟 Sides (Papas Fritas) | 10 variedades con tamaños Individual / Mediana / Grande |
| 🥤 Drinks | Coca-Cola, Agua Mineral, Jugo Natural, Milkshake, Cerveza Artesanal |
| 🍰 Desserts | Helado, Torta del Día, Brownie |

> 💰 **Todos los precios incluyen el 19% de IVA.**

---

## 📱 Instalación como App (PWA)

El sistema está configurado como Progressive Web App. Para instalarlo en tu dispositivo:

- **Android:** Abre el sitio en Chrome → Menú (⋮) → "Agregar a pantalla de inicio"
- **iPhone / iPad:** Abre el sitio en Safari → Botón de Compartir → "Agregar a inicio"
- **Windows / Mac:** Abre el sitio en Chrome/Edge → Icono de instalación en la barra de direcciones

---

## 📞 Contacto del Local

| Dato | Información |
|---|---|
| 📍 Ubicación | Lota Alto, Biobío, Chile |
| 📱 Teléfono | +56 9 8417 0433 |
| 📸 Instagram | [@carbonycheddarlota](https://instagram.com/carbonycheddarlota) |

---

## 📄 Licencia

Este proyecto fue desarrollado específicamente para uso interno de **Carbon & Cheddar Lota**. Todos los derechos del diseño gráfico del local (logo, menú) pertenecen al restaurant.

---

*Sistema desarrollado con ❤️ por Lilith para Carbon & Cheddar Lota.*
