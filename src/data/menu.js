export const initialMenu = [
  // --- HAMBURGUESAS ---
  {
    id: 1,
    name: "Hamburguesa Carbon",
    price: 6500,
    category: "Burgers",
    emoji: "🍔",
    description: "Nuestra hamburguesa clásica ahumada, lechuga, tomate, cebolla caramelizada y salsa secreta.",
    stock: 12
  },
  {
    id: 2,
    name: "Hamburguesa Cheddar",
    price: 7200,
    category: "Burgers",
    emoji: "🧀",
    description: "Doble queso cheddar derretido, pepinillos, cebolla morada y salsa de la casa.",
    stock: 15
  },
  {
    id: 3,
    name: "Hamburguesa Doble",
    price: 9500,
    category: "Burgers",
    emoji: "🍖",
    description: "Doble carne de vacuno, doble cheddar, tocino crocante y aderezo especial.",
    stock: 3
  },
  {
    id: 4,
    name: "Hamburguesa Bacon",
    price: 8000,
    category: "Burgers",
    emoji: "🥓",
    description: "Carne premium, abundante tocino ahumado, queso cheddar y salsa BBQ.",
    stock: 8
  },
  {
    id: 5,
    name: "Hamburguesa Veggie",
    price: 7800,
    category: "Burgers",
    emoji: "🌱",
    description: "Medallón de lentejas y quinoa, palta, tomate, rúcula y lactonesa de ajo.",
    stock: 6
  },
  {
    id: 21,
    name: "Hamburguesa a lo Pobre",
    price: 7990,
    category: "Burgers",
    emoji: "🍳",
    description: "Hamburguesa casera de 120gr, cebolla caramelizada, huevo frito y papas fritas. Incluye ensalada pequeña o sopa de zapallo.",
    stock: 10
  },

  // --- COMPLETOS ---
  {
    id: 6,
    name: "Completo Italiano",
    price: 4500,
    category: "Completos",
    emoji: "🥖",
    description: "Salchicha premium, abundante palta molida, tomate picado y mayonesa casera.",
    stock: 20
  },
  {
    id: 7,
    name: "Completo Dinámico",
    price: 5000,
    category: "Completos",
    emoji: "🌭",
    description: "Tomate, palta, chucrut, salsa americana, salsa verde y mayonesa.",
    stock: 4
  },
  {
    id: 8,
    name: "Completo Americano",
    price: 5500,
    category: "Completos",
    emoji: "🇺🇸",
    description: "Salchicha, tocino picado, cebolla grillada, pepinillos, queso fundido y mostaza dulce.",
    stock: 10
  },

  // --- ALMUERZOS ---
  {
    id: 22,
    name: "Pasta del Día",
    price: 3990,
    category: "Almuerzos",
    emoji: "🍝",
    description: "Deliciosa pasta de la casa del día. Incluye un Refreskid en sobre.",
    stock: 15
  },
  {
    id: 23,
    name: "Lasaña Individual",
    price: 6000,
    category: "Almuerzos",
    emoji: "🍲",
    description: "Lasaña boloñesa de la casa en porción individual. Incluye un Ice Tea en lata.",
    stock: 8
  },
  {
    id: 24,
    name: "Ensalada César con Pollo",
    price: 6500,
    category: "Almuerzos",
    emoji: "🥗",
    description: "Pechuga de pollo a la plancha, lechuga, crutones, queso parmesano y aderezo César. Incluye Ice Tea.",
    stock: 12
  },
  {
    id: 25,
    name: "Ensalada Primavera con Pollo",
    price: 6500,
    category: "Almuerzos",
    emoji: "🥗",
    description: "Mix de vegetales de temporada, pechuga de pollo, aderezo suave de hierbas. Incluye Ice Tea.",
    stock: 10
  },
  {
    id: 26,
    name: "Milanesa Lotina",
    price: 7990,
    category: "Almuerzos",
    emoji: "🥩",
    description: "Carne de vacuno apanada con papas fritas y ensalada mixta. Encima lleva cheddar fundido y tocino.",
    stock: 7
  },
  {
    id: 27,
    name: "Fetuccini Mar y Tierra",
    price: 7990,
    category: "Almuerzos",
    emoji: "🍝",
    description: "Fetuccini con camarones salteados y salsa blanca. Incluye ensalada o sopa de zapallo a elección.",
    stock: 8
  },
  {
    id: 28,
    name: "Fetuccini del Bosque",
    price: 7990,
    category: "Almuerzos",
    emoji: "🍄",
    description: "Fetuccini con champiñones salteados y salsa blanca cremosa. Incluye ensalada o sopa de zapallo.",
    stock: 9
  },

  // --- MENÚ NIÑOS ---
  {
    id: 29,
    name: "Salchipapas (Niños)",
    price: 5000,
    category: "Niños",
    emoji: "🍟",
    description: "Papas fritas crujientes con salchichas picadas. Incluye un Refreskid en sobre.",
    stock: 20
  },
  {
    id: 30,
    name: "Mini Burger Cheddar (Niños)",
    price: 5000,
    category: "Niños",
    emoji: "🍔",
    description: "Hamburguesa de vacuno pequeña, queso cheddar y papas fritas chicas. Incluye Refreskid.",
    stock: 14
  },
  {
    id: 31,
    name: "Fetuccini Boloñesa (Niños)",
    price: 5000,
    category: "Niños",
    emoji: "🍝",
    description: "Fetuccini corto con salsa boloñesa casera de vacuno. Incluye Refreskid en sobre.",
    stock: 15
  },

  // --- NUESTRAS PAPAS FRITAS (CON VARIANTES) ---
  {
    id: 32,
    name: "Papas del Obrero",
    price: 3500, // Precio base (Individual)
    category: "Sides",
    emoji: "🍟",
    description: "Porción de nuestras papas fritas crujientes tradicionales.",
    stock: 25,
    variants: [
      { name: "Individual", price: 3500 },
      { name: "Mediana", price: 6500 },
      { name: "Grande", price: 8500 }
    ]
  },
  {
    id: 33,
    name: "Papas Mexicanas",
    price: 6500,
    category: "Sides",
    emoji: "🌶️",
    description: "Carne mechada, guacamole fresco, nachos crujientes, salsa Doritos y cebollín picado.",
    stock: 15,
    variants: [
      { name: "Individual", price: 6500 },
      { name: "Mediana", price: 9500 },
      { name: "Grande", price: 15000 }
    ]
  },
  {
    id: 34,
    name: "Papas del Obrero y Cheddar",
    price: 4500,
    category: "Sides",
    emoji: "🧀",
    description: "Papas fritas tradicionales bañadas en salsa de queso cheddar derretido y cebollín.",
    stock: 18,
    variants: [
      { name: "Individual", price: 4500 },
      { name: "Mediana", price: 7500 },
      { name: "Grande", price: 10000 }
    ]
  },
  {
    id: 35,
    name: "Papas Oro y Carbon",
    price: 6500,
    category: "Sides",
    emoji: "🍖",
    description: "Papas fritas cubiertas con abundante carne mechada, salsa cheddar y cebollín.",
    stock: 16,
    variants: [
      { name: "Individual", price: 6500 },
      { name: "Mediana", price: 9500 },
      { name: "Grande", price: 15000 }
    ]
  },
  {
    id: 36,
    name: "Papas Cheddar & Champiñones",
    price: 5500,
    category: "Sides",
    emoji: "🍄",
    description: "Salsa de queso cheddar tibia, champiñones salteados a la plancha y cebollín.",
    stock: 10,
    variants: [
      { name: "Individual", price: 5500 },
      { name: "Mediana", price: 8500 },
      { name: "Grande", price: 11500 }
    ]
  },
  {
    id: 37,
    name: "Salchipapas del Túnel",
    price: 4500,
    category: "Sides",
    emoji: "🌭",
    description: "Gran porción de papas fritas con abundantes salchichas cortadas y fritas.",
    stock: 22,
    variants: [
      { name: "Individual", price: 4500 },
      { name: "Mediana", price: 7500 },
      { name: "Grande", price: 10000 }
    ]
  },
  {
    id: 38,
    name: "Papas Camaron",
    price: 6500,
    category: "Sides",
    emoji: "🍤",
    description: "Papas fritas cubiertas de salsa blanca cremosa, camarones ecuatorianos y cebollín.",
    stock: 12,
    variants: [
      { name: "Individual", price: 6500 },
      { name: "Mediana", price: 9500 },
      { name: "Grande", price: 15000 }
    ]
  },
  {
    id: 39,
    name: "Papas Brazileñas",
    price: 7000,
    category: "Sides",
    emoji: "🥑",
    description: "Carne mechada, queso fundido, palta picada, choclo dulce y mayonesa casera de ajo.",
    stock: 11,
    variants: [
      { name: "Individual", price: 7000 },
      { name: "Mediana", price: 10500 },
      { name: "Grande", price: 15000 }
    ]
  },
  {
    id: 40,
    name: "Papas Mechada Queso Fundido",
    price: 6500,
    category: "Sides",
    emoji: "🧀",
    description: "Base de papas con carne mechada jugosa, queso fundido y mayonesa cheddar-tocino.",
    stock: 14,
    variants: [
      { name: "Individual", price: 6500 },
      { name: "Mediana", price: 9500 },
      { name: "Grande", price: 15000 }
    ]
  },
  {
    id: 41,
    name: "Papas con Longaniza",
    price: 6500,
    category: "Sides",
    emoji: "🥓",
    description: "Trozos de longaniza artesanal local, cebolla caramelizada, mayonesa cheddar-tocino y cebollín.",
    stock: 15,
    variants: [
      { name: "Individual", price: 6500 },
      { name: "Mediana", price: 9500 },
      { name: "Grande", price: 15000 }
    ]
  },

  // --- BEBIDAS Y POSTRES ---
  {
    id: 13,
    name: "Coca-Cola 350ml",
    price: 1500,
    category: "Drinks",
    emoji: "🥤",
    description: "Refresco helado tradicional de 350ml en lata.",
    stock: 30
  },
  {
    id: 14,
    name: "Agua Mineral",
    price: 1200,
    category: "Drinks",
    emoji: "💧",
    description: "Agua mineral embotellada de vertiente, con o sin gas.",
    stock: 22
  },
  {
    id: 15,
    name: "Jugo Natural",
    price: 2000,
    category: "Drinks",
    emoji: "🍹",
    description: "Exprimido natural del día: elige entre Frambuesa, Frutilla o Mango.",
    stock: 14
  },
  {
    id: 16,
    name: "Milkshake",
    price: 3500,
    category: "Drinks",
    emoji: "🥤",
    description: "Batido espeso de helado artesanal con crema chantilly. Vainilla, Chocolate o Frutilla.",
    stock: 7
  },
  {
    id: 17,
    name: "Cerveza Artesanal",
    price: 4500,
    category: "Drinks",
    emoji: "🍺",
    description: "Cerveza local de la zona del Biobío, estilo Golden Ale o Stout (para mayores de 18).",
    stock: 11
  },
  {
    id: 18,
    name: "Helado",
    price: 2500,
    category: "Desserts",
    emoji: "🍦",
    description: "Copa de helado con dos sabores a elección, salsa de chocolate y mostacillas.",
    stock: 15
  },
  {
    id: 19,
    name: "Torta del Día",
    price: 3000,
    category: "Desserts",
    emoji: "🍰",
    description: "Porción de torta casera del día (Tres Leches / Amor).",
    stock: 5
  },
  {
    id: 20,
    name: "Brownie",
    price: 2800,
    category: "Desserts",
    emoji: "🍫",
    description: "Brownie de chocolate belga tibio con nueces y una bola de helado de vainilla.",
    stock: 8
  }
];
