import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function LotesList() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros (en cliente)
  const [productoFiltro, setProductoFiltro] = useState("ALL"); // id de vino o ALL
  const [campanaFiltro, setCampanaFiltro] = useState("ALL");
  const [soloConStock, setSoloConStock] = useState(false);
  const [search, setSearch] = useState("");

  const isAdmin =
    userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // ============= cargar lotes =============
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes`;

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
          throw new Error("Error al cargar los lotes");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        console.log("🍾 Lotes cargados:", data);
        setLotes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error desconocido al cargar los lotes");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ============= derivados: resumen y filtros =============
  const totalLotes = lotes.length;
  const lotesConStock = lotes.filter(
    (l) => (l.botellasDisponibles ?? 0) > 0
  ).length;
  const botellasTotales = lotes.reduce(
    (acc, l) => acc + (l.botellasDisponibles ?? 0),
    0
  );

  const searchNorm = search.trim().toLowerCase();

  // opciones de vino (para el select)
  const vinosUnicosMap = new Map();
  lotes.forEach((l) => {
    if (l.productoId != null && !vinosUnicosMap.has(l.productoId)) {
      vinosUnicosMap.set(l.productoId, l.productoNombre || "Vino sin nombre");
    }
  });
  const vinosOpciones = Array.from(vinosUnicosMap.entries()).map(
    ([id, nombre]) => ({ id, nombre })
  );

  // opciones de campaña
  const campanasOpciones = Array.from(
    new Set(
      lotes
        .map((l) => l.campanaAnio)
        .filter((c) => c != null && c !== "")
    )
  ).sort();

  // aplicar filtros (en cliente)
  let listaFiltrada = [...lotes];

  if (productoFiltro !== "ALL") {
    const prodIdNum = parseInt(productoFiltro, 10);
    listaFiltrada = listaFiltrada.filter((l) => l.productoId === prodIdNum);
  }

  if (campanaFiltro !== "ALL") {
    listaFiltrada = listaFiltrada.filter(
      (l) => String(l.campanaAnio) === String(campanaFiltro)
    );
  }

  if (soloConStock) {
    listaFiltrada = listaFiltrada.filter(
      (l) => (l.botellasDisponibles ?? 0) > 0
    );
  }

  if (searchNorm) {
    listaFiltrada = listaFiltrada.filter((l) => {
      const cod = l.codLote?.toLowerCase() || "";
      const notas = l.notas?.toLowerCase() || "";
      const vino = l.productoNombre?.toLowerCase() || "";
      return (
        cod.includes(searchNorm) ||
        notas.includes(searchNorm) ||
        vino.includes(searchNorm)
      );
    });
  }

  function handleLimpiarFiltros() {
    setProductoFiltro("ALL");
    setCampanaFiltro("ALL");
    setSoloConStock(false);
    setSearch("");
  }

  function irVerLote(id) {
    // un único detalle de lote; dentro ya hay botón de Editar
    window.location.href = `/app/inventario/lotes/${id}`;
  }

  function handleEliminarLote(id) {
    if (!isAdmin) {
      alert("Solo un usuario ADMIN puede eliminar lotes.");
      return;
    }

    if (!authData) return;

    const { token, slug } = authData;

    if (
      !window.confirm(
        "¿Seguro que quieres eliminar este lote? Si tiene embotellados o stock, no se podrá borrar."
      )
    ) {
      return;
    }

    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/${id}`;

    fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.ok || res.status === 204) {
          // borrado correcto
          setLotes((prev) => prev.filter((l) => l.id !== id));
          return;
        }

        // Leemos el texto que venga del backend y lo traducimos a algo amigable
        return res.text().then((t) => {
          const texto = (t || "").toLowerCase();

          let msg =
            "No se ha podido eliminar el lote. Comprueba que no tenga embotellados ni stock.";

          if (texto.includes("ya tiene eventos")) {
            msg =
              "No puedes eliminar este lote porque ya tiene embotellados u otros eventos registrados.";
          } else if (texto.includes("tiene botellas disponibles")) {
            msg =
              "No puedes eliminar este lote porque todavía tiene botellas disponibles. Deja el stock a 0 antes de borrarlo.";
          }

          throw new Error(msg);
        });
      })
      .catch((err) => {
        console.error(err);
        alert(err.message);
      });
  }

  // ============= render =============
  if (!authData && loading) {
    return <p>Cargando lotes...</p>;
  }

  return (
    <div className="container-fluid px-0">
      {/* CABECERA */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="h4 mb-1">Lotes de vino</h2>
          <div className="small text-muted">
            Lotes totales: <strong>{totalLotes}</strong> · Lotes con stock:{" "}
            <strong>{lotesConStock}</strong> · Botellas totales:{" "}
            <strong>{botellasTotales}</strong>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              (window.location.href = "/app/inventario/lotes/nuevo")
            }
          >
            + Nuevo lote
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <label className="form-label form-label-sm">
                Vino (producto)
              </label>
              <select
                className="form-select form-select-sm"
                value={productoFiltro}
                onChange={(e) => setProductoFiltro(e.target.value)}
              >
                <option value="ALL">Todos los vinos</option>
                {vinosOpciones.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label form-label-sm">Campaña</label>
              <select
                className="form-select form-select-sm"
                value={campanaFiltro}
                onChange={(e) => setCampanaFiltro(e.target.value)}
              >
                <option value="ALL">Todas</option>
                {campanasOpciones.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label form-label-sm">
                Buscar por código, notas o vino
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: ALT-23-01, crianza..."
              />
            </div>

            <div className="col-md-2 mt-3 mt-md-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="soloConStock"
                  checked={soloConStock}
                  onChange={(e) => setSoloConStock(e.target.checked)}
                />
                <label
                  className="form-check-label small"
                  htmlFor="soloConStock"
                >
                  Solo lotes con stock
                </label>
              </div>
            </div>

            <div className="col-md-1 mt-3 mt-md-4 text-md-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO */}
      <div className="card">
        <div className="card-body">
          {loading && <p>Cargando lotes...</p>}
          {error && <p className="text-danger">{error}</p>}

          {!loading && !error && (
            <>
              {listaFiltrada.length === 0 ? (
                <p className="mb-0">
                  No hay lotes que coincidan con los filtros.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código lote</th>
                        <th>Campaña</th>
                        <th>Fecha creación</th>
                        <th>Vino</th>
                        <th className="text-end">Botellas disponibles</th>
                        <th>Notas</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map((lote) => {
                        let fechaCreacionStr = lote.fechaCreacion || "";
                        if (lote.fechaCreacion) {
                          try {
                            fechaCreacionStr = new Date(
                              lote.fechaCreacion
                            ).toLocaleDateString();
                          } catch {
                            fechaCreacionStr = lote.fechaCreacion;
                          }
                        }

                        return (
                          <tr key={lote.id}>
                            <td>{lote.codLote}</td>
                            <td>{lote.campanaAnio}</td>
                            <td>{fechaCreacionStr}</td>
                            <td>{lote.productoNombre}</td>
                            <td className="text-end">
                              {lote.botellasDisponibles ?? 0}
                            </td>
                            <td>{lote.notas || "-"}</td>
                            <td className="text-end">
                              <div
                                className="btn-group btn-group-sm"
                                role="group"
                              >
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => irVerLote(lote.id)}
                                >
                                  Ver / editar
                                </button>

                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() =>
                                      handleEliminarLote(lote.id)
                                    }
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
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

export default LotesList;
