// src/components/AppHome.jsx
import React, { useEffect, useState } from "react";
import { getAuthDataOrRedirect } from "../lib/auth";

export default function AppHome() {
  const [authData, setAuthData] = useState(null);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); // mientras comprobamos auth

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUser(auth.user || null);
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="container py-4">
        <p>Cargando tu sesión...</p>
      </div>
    );
  }

  if (!authData || !user) {
    window.location.href = "/login";
    return null;
  }

  const role = authData.role || user.rol || user.role || "-";
  const bodegaNombre =
    user.bodegaNombre ||
    (user.bodega && user.bodega.nombre) ||
    "Sin nombre de bodega";
  const bodegaSlug =
    user.bodegaSlug ||
    (user.bodega && (user.bodega.slug || user.bodegaSlug)) ||
    "-";
  const bodegaId =
    user.bodegaId || (user.bodega && user.bodega.id) || "-";

  return (
    <main className="container py-4">
      {/* CABECERA */}
      <header className="mb-4">
        <h1 className="h3 mb-2">Bienvenido a VinOps</h1>
        <p className="mb-1">
          Sesión iniciada como{" "}
          <strong>{user.username || user.email || "Usuario"}</strong>{" "}
          (<span className="text-muted">{role}</span>)
        </p>
        <p className="text-muted mb-0">
          Bodega actual: <strong>{bodegaNombre}</strong> ({bodegaSlug})
        </p>
      </header>

      {/* INFO BODEGA */}
      <section className="card mb-4">
        <div className="card-header">Tu bodega</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="small text-muted">Nombre</div>
              <div>{bodegaNombre}</div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">Slug</div>
              <div>
                <code>{bodegaSlug}</code>
              </div>
            </div>
            <div className="col-md-4">
              <div className="small text-muted">ID</div>
              <div>{bodegaId}</div>
            </div>
          </div>
        </div>
      </section>

      {/* MÓDULOS PRINCIPALES */}
      <section>
        <h2 className="h5 mb-3">Módulos principales</h2>

        <div className="row g-3">
          <div className="col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h6">Viñedo</h3>
                <p className="small text-muted mb-3">
                  Parcelas, tratamientos, muestreos y vendimias.
                </p>
                <a
                  href="/app/vinedo"
                  className="btn btn-outline-primary btn-sm mt-auto"
                >
                  Ir a Viñedo
                </a>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h6">Bodega</h3>
                <p className="small text-muted mb-3">
                  (Más adelante) Depósitos, movimientos de vino, trasiegos…
                </p>
                <button className="btn btn-outline-secondary btn-sm mt-auto" disabled>
                  En construcción
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h6">Inventario</h3>
                <p className="small text-muted mb-3">
                  Productos (vino/material), lotes y embotellados.
                </p>
                <a
                  href="/app/inventario"
                  className="btn btn-outline-primary btn-sm mt-auto"
                >
                  Ir a Inventario
                </a>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h6">Comercial</h3>
                <p className="small text-muted mb-3">
                  Clientes, entregas y albaranes (borrador → confirmado → entregado).
                </p>
                <a
                  href="/app/comercial"
                  className="btn btn-outline-primary btn-sm mt-auto"
                >
                  Ir a Comercial
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted small mt-3 mb-0">
          Más adelante afinamos este panel como “home” general: indicadores,
          avisos de stock, próximas entregas, etc.
        </p>
      </section>
    </main>
  );
}
