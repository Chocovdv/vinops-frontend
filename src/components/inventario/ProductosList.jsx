import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function ProductosList() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pestaña activa: "VINO" | "MATERIAL"
  const [tab, setTab] = useState("VINO");

  // buscador
  const [search, setSearch] = useState("");

  // solo para materiales
  const [soloStockCritico, setSoloStockCritico] = useState(false);

  const isAdmin =
    userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // ============= auth inicial =============
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);
  }, []);

  // ============= cargar productos activos cuando hay auth =============
  useEffect(() => {
    if (!authData) return;
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  function cargarProductos() {
    const auth = authData || getAuthDataOrRedirect();
    if (!auth) return;

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/productos`;

    setLoading(true);
    setError("");

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return null;
        }
        if (!res.ok) {
          throw new Error("Error al cargar los productos");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        console.log("📦 Productos activos:", data);
        setProductos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error desconocido al cargar productos");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // ============= acciones =============
  function handleVerProducto(id) {
    // un único detalle; dentro aparecerá botón de Editar
    window.location.href = `/app/inventario/productos/${id}`;
  }

  function handleEliminarProducto(id) {
    if (!isAdmin) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres desactivar este producto?"
    );
    if (!confirmar) return;

    const auth = authData || getAuthDataOrRedirect();
    if (!auth) return;
    const { token, slug } = auth;

    const url = `${API_BASE_URL}/api/${slug}/inventario/productos/${id}/desactivar`;

    fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return null;
        }
        if (!res.ok) {
          throw new Error("Error al desactivar el producto");
        }
        return res.text();
      })
      .then(() => {
        // Lo quitamos del listado (GET /productos devuelve solo activos)
        setProductos((prev) => prev.filter((p) => p.id !== id));
      })
      .catch((err) => {
        console.error(err);
        alert(
          err.message ||
            "No se ha podido desactivar el producto en este momento."
        );
      });
  }

  // ============= helpers de negocio =============
  function esStockCritico(p) {
    if (p.tipoProducto !== "MATERIAL") return false;
    if (p.stockUnidades == null || p.stockMinimoUnidades == null) return false;
    return p.stockUnidades <= p.stockMinimoUnidades;
  }

  const vinos = productos.filter((p) => p.tipoProducto === "VINO");
  const materiales = productos.filter((p) => p.tipoProducto === "MATERIAL");
  const materialesCriticos = materiales.filter(esStockCritico);

  const searchNorm = search.trim().toLowerCase();

  let listaFiltrada = tab === "VINO" ? vinos : materiales;

  if (searchNorm) {
    listaFiltrada = listaFiltrada.filter((p) => {
      const nombre = p.nombre?.toLowerCase() || "";
      const desc = p.descripcion?.toLowerCase() || "";
      const fam = p.familiaMaterial?.toLowerCase() || "";
      return (
        nombre.includes(searchNorm) ||
        desc.includes(searchNorm) ||
        fam.includes(searchNorm)
      );
    });
  }

  if (tab === "MATERIAL" && soloStockCritico) {
    listaFiltrada = listaFiltrada.filter(esStockCritico);
  }

  function handleLimpiarBusqueda() {
    setSearch("");
    setSoloStockCritico(false);
  }

  // ============= render =============
  return (
    <div className="container-fluid px-0">
      {/* CABECERA */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 mb-1">Inventario</h2>
          <div className="small text-muted">
            Vinos: <strong>{vinos.length}</strong> · Materiales:{" "}
            <strong>{materiales.length}</strong> · Stock crítico:{" "}
            <strong>{materialesCriticos.length}</strong>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              (window.location.href = "/app/inventario/productos/nuevo")
            }
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {/* PESTAÑAS VINO / MATERIAL */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={"nav-link " + (tab === "VINO" ? "active" : "")}
            onClick={() => setTab("VINO")}
          >
            Vinos
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={"nav-link " + (tab === "MATERIAL" ? "active" : "")}
            onClick={() => setTab("MATERIAL")}
          >
            Materiales
          </button>
        </li>
      </ul>

      {/* FILTROS SENCILLOS */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <label className="form-label form-label-sm">
                Buscar por nombre / descripción / familia
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: crianza, botella, caja…"
              />
            </div>

            {tab === "MATERIAL" && (
              <div className="col-md-3">
                <div className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="soloCritico"
                    checked={soloStockCritico}
                    onChange={(e) => setSoloStockCritico(e.target.checked)}
                  />
                  <label
                    className="form-check-label small"
                    htmlFor="soloCritico"
                  >
                    Solo materiales en stock crítico
                  </label>
                </div>
              </div>
            )}

            <div className="col-md-3 mt-3 mt-md-4">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleLimpiarBusqueda}
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO */}
      <div className="card">
        <div className="card-body">
          {loading && <p>Cargando productos…</p>}
          {error && <p className="text-danger">{error}</p>}

          {!loading && !error && (
            <>
              {listaFiltrada.length === 0 ? (
                <p className="mb-0">
                  No hay {tab === "VINO" ? "vinos" : "materiales"} que
                  coincidan con la búsqueda.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      {tab === "VINO" ? (
                        <tr>
                          <th>Nombre</th>
                          <th className="text-end">Precio prof.</th>
                          <th className="text-end">Precio part.</th>
                          <th>Descripción</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      ) : (
                        <tr>
                          <th>Nombre</th>
                          <th>Familia</th>
                          <th className="text-end">Stock</th>
                          <th className="text-end">Stock mín.</th>
                          <th>Estado stock</th>
                          <th className="text-end">Acciones</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {listaFiltrada.map((p) => {
                        if (tab === "VINO") {
                          return (
                            <tr key={p.id}>
                              <td>
                                <div className="d-flex flex-column">
                                  <span>{p.nombre}</span>
                                  {p.descripcion && (
                                    <small className="text-muted">
                                      {p.descripcion}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td className="text-end">
                                {p.precioProfesional != null
                                  ? p.precioProfesional.toFixed(2) + " €"
                                  : "-"}
                              </td>
                              <td className="text-end">
                                {p.precioParticular != null
                                  ? p.precioParticular.toFixed(2) + " €"
                                  : "-"}
                              </td>
                              <td>
                                {p.descripcion || (
                                  <span className="text-muted">
                                    Sin descripción
                                  </span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => handleVerProducto(p.id)}
                                  >
                                    Ver / editar
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() =>
                                        handleEliminarProducto(p.id)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        } else {
                          const critico = esStockCritico(p);
                          return (
                            <tr key={p.id}>
                              <td>
                                <div className="d-flex flex-column">
                                  <span>{p.nombre}</span>
                                  {p.descripcion && (
                                    <small className="text-muted">
                                      {p.descripcion}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td>
                                {p.familiaMaterial
                                  ? p.familiaMaterial.replace("_", " ")
                                  : "-"}
                              </td>
                              <td className="text-end">
                                {p.stockUnidades ?? "-"}
                              </td>
                              <td className="text-end">
                                {p.stockMinimoUnidades ?? "-"}
                              </td>
                              <td>
                                {critico ? (
                                  <span className="badge bg-danger">
                                    Crítico
                                  </span>
                                ) : (
                                  <span className="badge bg-success">OK</span>
                                )}
                              </td>
                              <td className="text-end">
                                <div className="btn-group btn-group-sm">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => handleVerProducto(p.id)}
                                  >
                                    Ver / editar
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() =>
                                        handleEliminarProducto(p.id)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductosList;
