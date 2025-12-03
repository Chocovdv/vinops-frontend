// src/components/vinedo/ParcelasList.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";
import TiempoBodega from "./TiempoBodega.jsx";

function ParcelasList() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const isAdmin = userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);
    cargarParcelas(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function extraerMensajeError(resp, mensajePorDefecto) {
    try {
      const data = await resp.json();

      if (data) {
        if (data.fieldErrors && typeof data.fieldErrors === "object") {
          const fieldMsgs = Object.values(data.fieldErrors)
            .filter(Boolean)
            .join(" ");
          if (fieldMsgs) return fieldMsgs;
        }
        if (data.message) return data.message;
        if (data.error && data.message) {
          return `${data.error}: ${data.message}`;
        }
        if (typeof data === "string") return data;
      }
    } catch {
      try {
        const text = await resp.text();
        if (text) return text;
      } catch {
        // ignoramos
      }
    }
    return mensajePorDefecto;
  }

  async function cargarParcelas(auth) {
    const authToUse = auth || authData || getAuthDataOrRedirect();
    if (!authToUse) return;

    const { token, slug, role } = authToUse;
    setUserRole(role || null);

    setLoading(true);
    setError("");

    const url = `${API_BASE_URL}/api/${slug}/vinedo/parcelas`;

    try {
      const res = await fetch(url, {
        headers: authHeaders(token),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al cargar las parcelas."
        );
        throw new Error(msg);
      }

      const data = await res.json();
      setParcelas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar las parcelas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEliminarParcela(parcelaId) {
    if (!isAdmin) return;

    const ok = window.confirm(
      "¿Seguro que quieres eliminar esta parcela? Se borrarán también sus registros."
    );
    if (!ok) return;

    const auth = authData || getAuthDataOrRedirect();
    if (!auth) return;

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${parcelaId}`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: authHeaders(token),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (res.status !== 204 && !res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al eliminar la parcela."
        );
        throw new Error(msg);
      }

      setParcelas((prev) => prev.filter((p) => p.id !== parcelaId));
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al eliminar la parcela.");
    }
  }

  function handleSearchChange(e) {
    setSearch(e.target.value);
  }

  function handleLimpiarFiltros() {
    setSearch("");
  }

  const filteredParcelas = parcelas.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.variedadPrincipal &&
        p.variedadPrincipal.toLowerCase().includes(q)) ||
      (p.notas && p.notas.toLowerCase().includes(q))
    );
  });

  // ===== Render =====
  if (loading) {
    return (
      <div className="container-fluid px-0">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div
            className="spinner-border me-2"
            role="status"
            aria-hidden="true"
          />
          <span>Cargando parcelas…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid px-0">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0">
      <div className="card parcelas-card shadow-sm">
        <div className="card-body">
          {/* Cabecera */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
            <div>
              <h2 className="h4 mb-1">Parcelas</h2>
              <div className="small text-muted">
                Gestiona las parcelas de viñedo asociadas a esta bodega.
              </div>
            </div>
            {isAdmin && (
              <div className="mt-2 mt-md-0">
                <a
                  href="/app/vinedo/parcelas/nueva"
                  className="btn btn-primary btn-sm"
                >
                  + Nueva parcela
                </a>
              </div>
            )}
          </div>

          {/* Tiempo en la bodega */}
          <TiempoBodega />

          {/* Buscador + limpiar */}
          <div className="mb-3">
            <label className="form-label">Buscar</label>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Nombre, variedad principal o notas…"
                value={search}
                onChange={handleSearchChange}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleLimpiarFiltros}
                disabled={!search.trim()}
              >
                Limpiar filtros
              </button>
            </div>
            <div className="form-text">
              El filtro se aplica sobre el nombre, la variedad principal y las
              notas de la parcela.
            </div>
          </div>

          {/* Tabla */}
          {filteredParcelas.length === 0 ? (
            <div className="alert alert-info mb-0">
              {parcelas.length === 0
                ? "No hay parcelas registradas todavía."
                : "No hay parcelas que coincidan con el filtro de búsqueda."}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0 parcelas-table align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Superficie</th>
                    <th>Variedad principal</th>
                    <th>Altitud</th>
                    <th>Notas</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParcelas.map((parcela) => (
                    <tr key={parcela.id}>
                      <td>{parcela.nombre}</td>
                      <td>
                        {parcela.superficieHa != null
                          ? `${parcela.superficieHa} ha`
                          : "-"}
                      </td>
                      <td>{parcela.variedadPrincipal || "-"}</td>
                      <td>
                        {parcela.altitudM != null
                          ? `${parcela.altitudM} m`
                          : "-"}
                      </td>
                      <td>{parcela.notas || "-"}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <a
                            href={`/app/vinedo/parcelas/${parcela.id}`}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            Ver
                          </a>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                handleEliminarParcela(parcela.id)
                              }
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ParcelasList;
