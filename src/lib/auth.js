// src/lib/auth.js

// URL base de tu API Spring Boot
export const API_BASE_URL = "http://localhost:8080";

/**
 * Lee token y usuario de localStorage.
 * - Si falta algo, devuelve null.
 * - Si está todo OK, devuelve { token, user, slug, role }.
 */
export function getAuthData() {
  const token = localStorage.getItem("vinops_token");
  const userJson = localStorage.getItem("vinops_user");

  if (!token || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);

    // Sacamos el slug de la bodega de varias posibles propiedades
    const slug =
      user.bodegaSlug ||
      (user.bodega && (user.bodega.slug || user.bodegaSlug)) ||
      null;

    // Rol del usuario (ADMIN / OPERARIO)
    const role = user.rol || user.role || null;

    if (!slug) {
      console.error("No se ha podido determinar la bodega (slug).");
      return null;
    }

    return { token, user, slug, role };
  } catch (e) {
    console.error("Error parseando vinops_user", e);
    return null;
  }
}

/**
 * Igual que getAuthData, pero si algo va mal redirige a /login.
 */
export function getAuthDataOrRedirect() {
  const auth = getAuthData();

  if (!auth) {
    window.location.href = "/login";
    return null;
  }

  return auth;
}

/**
 * Cabeceras típicas autenticadas para la API JSON.
 */
export function authHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

/**
 * Construye una URL de la API a partir del slug y la ruta.
 */
export function buildApiUrl(slug, path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/api/${slug}${normalizedPath}`;
}

/**
 * Limpia la sesión y redirige (por defecto a "/").
 */
export function logoutAndRedirect(to = "/") {
  try {
    localStorage.removeItem("vinops_token");
    localStorage.removeItem("vinops_user");
  } catch (e) {
    console.error("Error limpiando sesión VinOps", e);
  }
  window.location.href = to;
}
