# Seguridad y cumplimiento legal (Chile)

Guía para alinear Carbon & Cheddar POS con la **Ley 19.628** y la nueva
**Ley 21.719** (protección de datos personales) y la **Ley 21.663**
(marco de ciberseguridad).

## Ya implementado
- ✅ **Consentimiento** explícito al registrarse el cliente (checkbox obligatorio).
- ✅ **Política de privacidad** visible en la vista del cliente (finalidad, derechos, contacto).
- ✅ **Login de clientes** con Supabase Auth (contraseñas gestionadas y cifradas por Supabase, nunca en texto plano).
- ✅ Datos mínimos: solo se piden nombre, email y teléfono (principio de minimización).

## Pendiente / recomendado (requiere decisión o pruebas)

### 1. PIN del personal en texto plano  ⚠️ ALTA PRIORIDAD
Hoy los PIN de admin/superadmin se guardan sin cifrar en el navegador
(`carbon_cheddar_pins_v1`). Recomendación:
- Migrar la autenticación del **personal** a Supabase Auth (usuarios con rol), o
- Como mínimo, guardar solo un **hash** (SHA-256) del PIN y comparar hashes.
- No se cambió automáticamente para no arriesgar el acceso de administrador sin
  poder probarlo; hacerlo en una rama y validar antes de publicar.

### 2. Políticas de acceso (RLS) demasiado abiertas  ⚠️ ALTA PRIORIDAD
Las políticas actuales son `FOR ALL TO anon` en todas las tablas: cualquiera con
la clave pública (visible en el navegador) podría leer/editar ventas, egresos, etc.
Recomendación:
- `orders`: permitir a `anon` solo **INSERT** (crear pedido) y **SELECT** de lo propio; el resto solo para personal autenticado.
- `menu_items`: solo **SELECT** para `anon`; escritura solo personal.
- `egresos`, `compras`, `insumos`, `recetas`: **sin acceso** para `anon`; solo personal autenticado.
- Implica autenticar al personal con Supabase Auth y escribir políticas por rol.

### 3. Otras medidas
- **HTTPS** obligatorio en producción (ya lo da el hosting tipo Vercel/Netlify).
- **Retención de datos**: definir por cuánto tiempo se guardan pedidos/clientes y purgar lo innecesario.
- **Derechos ARCO** (acceso, rectificación, cancelación, oposición): habilitar un canal para que el cliente solicite ver/borrar sus datos (hoy se ofrece por teléfono).
- **Notificación de incidentes**: la Ley 21.663 exige reportar breches a la autoridad; tener un procedimiento básico.
- **Registro de actividades**: log de accesos de administrador.
- Revisar todo con un asesor legal antes de operar con datos de clientes a escala.

> Nota: esta guía es orientativa y técnica; la conformidad legal final debe
> validarla un abogado especializado en protección de datos.
