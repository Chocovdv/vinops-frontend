// src/components/clientes/ClientesList.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";

function ClientesList() {
  const [authData, setAuthData] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [tipo, setTipo] = useState("TODOS"); // TODOS | PROFESIONAL | PARTICULAR
  const [estado, setEstado] = useState("SOLO_ACTIVOS"); // SOLO_ACTIVOS | SOLO_INACTIVOS | TODOS
  const [q, setQ] = useState("");

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, tipo, estado, q]);

  const fetchClientes = async () => {
    setLoading(true);
    setError("");

    const { token, slug } = authData;

    const params = new URLSearchParams();

    if (tipo === "PROFESIONAL" || tipo === "PARTICULAR") {
      params.append("tipo", tipo);
    }

    if (estado === "SOLO_ACTIVOS") {
      params.append("activos", "true");
    } else if (estado === "SOLO_INACTIVOS") {
      params.append("activos", "false");
    }

    const qTrim = q.trim();
    if (qTrim.length > 0) {
      params.append("q", qTrim);
    }

    const url = `${API_BASE_URL}/api/${slug}/clientes/filtrado?${params.toString()}`;

    try {
      const resp = await fetch(url, {
        headers: authHeaders(token),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Error al cargar clientes (${resp.status})`);
      }

      const data = await resp.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoCliente = () => {
    window.location.href = "/app/clientes/nuevo";
  };

  const handleVerEditar = (id) => {
    window.location.href = `/app/clientes/${id}`;
  };

  const handleLimpiarFiltros = (e) => {
    e.preventDefault();
    setTipo("TODOS");
    setEstado("SOLO_ACTIVOS");
    setQ("");
  };

  if (!authData) {
    return null;
  }

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Clientes</h2>
        <button className="btn btn-primary" onClick={handleNuevoCliente}>
          + Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <form
            className="row g-3"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="col-md-3">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="PROFESIONAL">Profesionales</option>
                <option value="PARTICULAR">Particulares</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="SOLO_ACTIVOS">Solo activos</option>
                <option value="SOLO_INACTIVOS">Solo inactivos</option>
                <option value="TODOS">Activos e inactivos</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Buscar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nombre, NIF, localidad, notas..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleLimpiarFiltros}
              >
                Limpiar filtros
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading && <p>Cargando clientes...</p>}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card">
          <div className="card-body">
            {clientes.length === 0 ? (
              <p className="mb-0">
                No se han encontrado clientes con esos filtros.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Teléfono</th>
                      <th>Email</th>
                      <th>Localidad</th>
                      <th>Estado</th>
                      <th style={{ width: "1%" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nombre}</td>
                        <td>
                          {c.tipo === "PROFESIONAL"
                            ? "Profesional"
                            : "Particular"}
                        </td>
                        <td>{c.telefono || "-"}</td>
                        <td>{c.email || "-"}</td>
                        <td>{c.localidad || "-"}</td>
                        <td>
                          {c.activo ? (
                            <span className="badge bg-success">Activo</span>
                          ) : (
                            <span className="badge bg-secondary">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleVerEditar(c.id)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientesList;
