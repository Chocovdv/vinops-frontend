import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function LoteNuevo() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [vinos, setVinos] = useState([]);
  const [loadingVinos, setLoadingVinos] = useState(true);
  const [errorVinos, setErrorVinos] = useState("");

  // campos del formulario
  const [productoId, setProductoId] = useState("");
  const [productoFijado, setProductoFijado] = useState(false);
  const [codLote, setCodLote] = useState("");
  const [campanaAnio, setCampanaAnio] = useState("");
  const [fechaCreacion, setFechaCreacion] = useState("");
  const [notas, setNotas] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const isAdmin =
    userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // ============= helpers =============
  function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function leerProductoIdDeQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("productoId");
      if (pid) {
        return pid;
      }
    } catch (e) {
      console.error("Error leyendo querystring en LoteNuevo:", e);
    }
    return null;
  }

  // ============= carga inicial: auth + vinos =============
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);

    setLoadingVinos(true);
    setErrorVinos("");

    const { token, slug } = auth;
    const vinosUrl = `${API_BASE_URL}/api/${slug}/inventario/productos/vinos`;

    const productoIdQuery = leerProductoIdDeQuery();
    if (productoIdQuery) {
      setProductoId(String(productoIdQuery));
      setProductoFijado(true);
    }

    fetch(vinosUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return null;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Error al cargar los vinos");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setVinos(Array.isArray(data) ? data : []);

        // si solo hay un vino y no viene preseleccionado por query,
        // lo seleccionamos por defecto
        if (!productoIdQuery && data.length === 1) {
          setProductoId(String(data[0].id));
        }

        // fecha de creación por defecto = hoy
        setFechaCreacion((prev) => prev || todayISODate());

        // campaña por defecto = año actual
        setCampanaAnio((prev) => prev || String(new Date().getFullYear()));
      })
      .catch((err) => {
        console.error(err);
        setErrorVinos(
          err.message ||
            "No se han podido cargar los vinos para crear el lote."
        );
      })
      .finally(() => setLoadingVinos(false));
  }, []);

  // ============= submit =============
  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    // solo ADMIN puede crear lotes (coincide con el @PreAuthorize del backend)
    if (!isAdmin) {
      setFormError("Solo un usuario ADMIN puede crear lotes.");
      return;
    }

    if (!productoId) {
      setFormError("Debes seleccionar un vino para el lote.");
      return;
    }

    if (!codLote.trim()) {
      setFormError("El código de lote es obligatorio.");
      return;
    }

    if (!campanaAnio.trim()) {
      setFormError("El año de campaña es obligatorio.");
      return;
    }

    const campNum = parseInt(campanaAnio, 10);
    if (Number.isNaN(campNum) || campNum < 1900 || campNum > 3000) {
      setFormError("El año de campaña no es válido.");
      return;
    }

    if (!fechaCreacion) {
      setFormError("La fecha de creación es obligatoria.");
      return;
    }

    const auth = authData || getAuthDataOrRedirect();
    if (!auth) return;
    const { token, slug } = auth;

    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes`;

    // Coincide 1:1 con LoteCreateUpdateDto del backend
    const body = {
      productoId: parseInt(productoId, 10),
      codLote: codLote.trim(),
      campanaAnio: campNum,
      fechaCreacion,
      notas: notas.trim() || null,
    };

    setSaving(true);

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return null;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Error al crear el lote");
        }
        return res.json();
      })
      .then((loteCreado) => {
        if (!loteCreado) return;
        // redirigimos al detalle del lote recién creado
        window.location.href = `/app/inventario/lotes/${loteCreado.id}`;
      })
      .catch((err) => {
        console.error(err);
        setFormError(
          err.message || "No se ha podido crear el lote en este momento."
        );
      })
      .finally(() => setSaving(false));
  }

  // Si ya sabemos el rol y no es ADMIN, mostramos solo el mensaje de permiso
  if (userRole && !isAdmin) {
    return (
      <p className="text-danger">
        No tienes permisos para crear lotes. Solo un usuario ADMIN puede
        hacerlo.
      </p>
    );
  }

  function volverAlListado() {
    window.location.href = "/app/inventario/lotes";
  }

  return (
    <div className="container-fluid px-0">
      <a
        href="/app/inventario/lotes"
        className="small text-decoration-none d-inline-block mb-2"
      >
        ← Volver al listado
      </a>

      <h2 className="h4 mb-1">Nuevo lote</h2>
      <p className="text-muted mb-3">
        Define el vino, código, campaña y fecha de creación del nuevo lote.
      </p>

      <div className="card">
        <div className="card-body">
          {errorVinos && (
            <p className="text-danger small mb-3">{errorVinos}</p>
          )}

          {loadingVinos ? (
            <p>Cargando vinos…</p>
          ) : vinos.length === 0 ? (
            <p className="mb-0">
              No hay vinos disponibles para crear lotes. Crea primero un
              producto de tipo VINO.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              {formError && (
                <p className="text-danger small mb-3">{formError}</p>
              )}

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label form-label-sm">
                    Vino (producto)
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    required
                    disabled={productoFijado}
                  >
                    <option value="">Selecciona un vino…</option>
                    {vinos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                  {productoFijado && (
                    <small className="text-muted">
                      Este lote se creará para el vino seleccionado desde la
                      pantalla anterior.
                    </small>
                  )}
                </div>

                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Código de lote
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={codLote}
                    onChange={(e) => setCodLote(e.target.value)}
                    placeholder="Ej: ALT-CR-24-01"
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Campaña (año)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={campanaAnio}
                    onChange={(e) => setCampanaAnio(e.target.value)}
                    placeholder="Ej: 2024"
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Fecha de creación
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={fechaCreacion}
                    onChange={(e) => setFechaCreacion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label form-label-sm">Notas</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Información adicional sobre este lote…"
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={volverAlListado}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                >
                  {saving ? "Creando lote…" : "Crear lote"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoteNuevo;
