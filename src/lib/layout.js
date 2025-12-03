// src/lib/layout.js
import { getAuthData, getAuthDataOrRedirect, logoutAndRedirect } from "./auth";

/**
 * Inicializa el layout privado de VinOps:
 * - Pone el nombre de la bodega en la topbar.
 * - Pone el nombre/usuario en el menú.
 * - Muestra el enlace "Usuarios" solo si es ADMIN.
 * - Configura el botón de "Cerrar sesión".
 */
export function initPrivateLayout() {
  try {
    const spanBodega = document.getElementById("topbar-bodega");
    const spanUsername = document.getElementById("topbar-username");
    const usuariosLink = document.getElementById("nav-usuarios");
    const logoutBtn = document.getElementById("btn-logout");

    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    const { user, role } = auth;
    const isAdmin = role === "ADMIN";

    // ====== MOSTRAR / OCULTAR BOTÓN USUARIOS ======
    if (usuariosLink) {
      if (isAdmin) {
        // admin -> quitamos d-none para que se vea
        usuariosLink.classList.remove("d-none");
      } else {
        // operario -> nos aseguramos de que sigue oculto
        usuariosLink.classList.add("d-none");
      }
    }

    // ========= BODEGA EN LA TOPBAR =========
    const nombreBodega =
      (user.bodega &&
        (user.bodega.nombre || user.bodega.name || user.bodegaNombre)) ||
      user.bodegaNombre ||
      "tu bodega";

    if (spanBodega) {
      spanBodega.textContent = nombreBodega;
    }

    // ========= NOMBRE / USERNAME EN EL MENÚ =========
    if (spanUsername) {
      spanUsername.textContent =
        user.nombre || user.username || user.email || "Mi cuenta";
    }

    // ========= CERRAR SESIÓN =========
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        logoutAndRedirect("/"); // vuelve a la landing
      });
    }
  } catch (e) {
    console.error("Error al inicializar layout VinOps", e);
  }
}

/**
 * En la landing pública:
 * si ya hay sesión, redirige a /app.
 */
export function redirectIfAlreadyLoggedIn() {
  try {
    const auth = getAuthData();
    if (auth) {
      window.location.href = "/app";
    }
  } catch (e) {
    console.error("Error comprobando sesión en página pública", e);
  }
}
