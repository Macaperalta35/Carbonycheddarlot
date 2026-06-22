// Autenticación de clientes con Supabase Auth (email + contraseña).
// Si Supabase no está configurado, expone funciones que fallan de forma
// controlada (sin romper la app).
//
// REQUIERE en el panel de Supabase:
//   Authentication → Providers → Email = habilitado.
//   (Opcional) Desactivar "Confirm email" para login inmediato sin correo.

import { supabase, isConfigured } from "./supabase";

export const authAvailable = isConfigured;

export async function registerCustomer({ email, password, name, phone }) {
  if (!supabase) return { error: "Sistema de cuentas no disponible." };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name?.trim() || "", phone: phone?.trim() || "" } },
  });
  if (error) return { error: error.message };
  // Si "Confirm email" está activo, no hay sesión hasta confirmar el correo.
  return { user: data.user, session: data.session, needsConfirmation: !data.session };
}

export async function loginCustomer({ email, password }) {
  if (!supabase) return { error: "Sistema de cuentas no disponible." };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

export async function logoutCustomer() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Llama al callback cada vez que cambia la sesión. Devuelve una función para desuscribir.
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data?.subscription?.unsubscribe?.();
}
