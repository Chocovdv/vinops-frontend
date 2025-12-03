// src/components/usuarios/UsuariosList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

const ROLES = [
  { value: "TODOS", label: "Todos" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "OPERARIO", label: "OPERARIO" },
];

function UsuariosList() {
  const [authData, setAuthData] = useState(null);

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [textoFiltro, setTextoFiltro] = useState("");
  const [rolFiltro, setRolFiltro] = useState("TODOS");
  const [soloActivos, setSoloActivos] = useState(true);

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  const cargarUsuarios = async () => {
    if (!authData) return;

    setLoading(true);
    setError("");

    const { token, slug } = authData;

    try {
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Error al cargar usuarios");
      }

      const data = await resp.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const irA = (path) => {
    window.location.href = path;
  };

  const handleNuevo = () => {
    irA("/app/usuarios/nuevo");
  };

  const handleVerDetalle = (id) => {
    irA(`/app/usuarios/${id}`);
  };

  async function handleEliminarUsuario(id, username) {
    if (!authData) return;

    if (!isAdmin) {
      alert("Solo los administradores pueden eliminar usuarios.");
      return;
    }

    const myUser = authData.user;
    if (myUser && (myUser.id === id || myUser.username === username)) {
      alert(
        "No puedes eliminar tu propio usuario desde aquí. Pide a otro administrador que lo haga."
      );
      return;
    }

    if (
      !window.confirm(
        `¿Seguro que quieres eliminar el usuario "${username}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios/${id}`;

      const resp = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Error al eliminar usuario");
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert(
        err.message ||
          "Error al eliminar el usuario. Puede que estés intentando borrarte a ti mismo."
      );
    }
  }

  const usuariosFiltrados = useMemo(() => {
    let lista = [...usuarios];

    if (soloActivos) {
      lista = lista.filter((u) => u.activo);
    }

    if (rolFiltro !== "TODOS") {
      lista = lista.filter((u) => u.rol === rolFiltro);
    }

    const q = textoFiltro.trim().toLowerCase();
    if (q !== "") {
      lista = lista.filter((u) => {
        const username = u.username?.toLowerCase() || "";
        const nombre = u.nombre?.toLowerCase() || "";
        const email = u.email?.toLowerCase() || "";
        return (
          username.includes(q) || nombre.includes(q) || email.includes(q)
        );
      });
    }

    lista.sort((a, b) => {
      if (a.rol === b.rol) {
        return (a.nombre || "").localeCompare(b.nombre || "");
      }
      if (a.rol === "ADMIN") return -1;
      if (b.rol === "ADMIN") return 1;
      return (a.rol || "").localeCompare(b.rol || "");
    });

    return lista;
  }, [usuarios, rolFiltro, soloActivos, textoFiltro]);

  if (!authData) return null;

  if (!isAdmin) {
    return (
      <div className="alert alert-warning">
        Este módulo solo está disponible para usuarios con rol{" "}
        <strong>ADMIN</strong>.
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 mb-0">Usuarios de la bodega</h2>
        <button className="btn btn-sm btn-success" onClick={handleNuevo}>
          + Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-md-4">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Username, nombre o email..."
              value={textoFiltro}
              onChange={(e) => setTextoFiltro(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label">Rol</label>
            <select
              className="form-select form-select-sm"
              value={rolFiltro}
              onChange={(e) => setRolFiltro(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="soloActivosCheckbox"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
              />
              <label
                className="form-check-label"
                htmlFor="soloActivosCheckbox"
              >
                Solo activos
              </label>
            </div>
          </div>

          <div className="col-12 col-md-2 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100 mt-2 mt-md-0"
              onClick={() => {
                setTextoFiltro("");
                setRolFiltro("TODOS");
                setSoloActivos(true);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p>Cargando usuarios...</p>}

      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Username</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Activo</th>
                <th>Debe cambiar contraseña</th>
                <th style={{ width: "160px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    No hay usuarios para los filtros seleccionados.
                  </td>
                </tr>
              )}

              {usuariosFiltrados.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol}</td>
                  <td>
                    {u.activo ? (
                      <span className="badge bg-success">Sí</span>
                    ) : (
                      <span className="badge bg-secondary">No</span>
                    )}
                  </td>
                  <td>
                    {u.mustChangePassword ? (
                      <span className="badge bg-warning text-dark">
                        Sí
                      </span>
                    ) : (
                      <span className="badge bg-secondary">No</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => handleVerDetalle(u.id)}
                      >
                        Ver/Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() =>
                          handleEliminarUsuario(u.id, u.username)
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UsuariosList;
