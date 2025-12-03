import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function LoteDetalle({ id }) {
  // el id del lote viene directamente de Astro
  const loteId = id;

  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [lote, setLote] = useState(null);
  const [embotellados, setEmbotellados] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingEmbotellados, setLoadingEmbotellados] = useState(false);
  const [error, setError] = useState("");

  // formulario lote
  const [formLote, setFormLote] = useState({
    codLote: "",
    campanaAnio: "",
    fechaCreacion: "",
    notas: "",
  });
  const [formLoteError, setFormLoteError] = useState("");
  const [savingLote, setSavingLote] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // formulario embotellado
  const [nuevoEmbotellado, setNuevoEmbotellado] = useState({
    fecha: "",
    botellasAfectadas: "",
    detalle: "",
  });
  const [savingEmbotellado, setSavingEmbotellado] = useState(false);
  const [embotelladoError, setEmbotelladoError] = useState("");

  // ========= carga inicial auth =========
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);

    // leer ?modo=edit de la URL para entrar ya en edición si viene desde "Editar"
    try {
      const params = new URLSearchParams(window.location.search);
      setModoEdicion(params.get("modo") === "edit");
    } catch (e) {
      console.error("Error leyendo modo edición en LoteDetalle", e);
    }
  }, []);

  // ========= carga lote + embotellados cuando hay auth =========
  useEffect(() => {
    if (!authData || !loteId) return;
    cargarLote();
    cargarEmbotellados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, loteId]);

  // ========= helpers =========
  function syncFormFromLote(data) {
    setFormLote({
      codLote: data.codLote || "",
      campanaAnio: data.campanaAnio != null ? String(data.campanaAnio) : "",
      fechaCreacion: data.fechaCreacion || "",
      notas: data.notas || "",
    });
  }

  // ========= llamadas a API =========
  function cargarLote() {
    const auth = authData || getAuthDataOrRedirect();
    if (!auth || !loteId) return;

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/${loteId}`;

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
          throw new Error("Error al cargar el lote");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setLote(data);
        syncFormFromLote(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error desconocido al cargar el lote");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function cargarEmbotellados() {
    const auth = authData || getAuthDataOrRedirect();
    if (!auth || !loteId) return;

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/${loteId}/embotellados`;

    setLoadingEmbotellados(true);
    setEmbotelladoError("");

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
          throw new Error("Error al cargar los embotellados del lote");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setEmbotellados(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
        setEmbotelladoError(
          err.message || "Error al cargar los embotellados"
        );
      })
      .finally(() => {
        setLoadingEmbotellados(false);
      });
  }

  // ========= handlers lote =========
  function handleChangeLote(e) {
    const { name, value } = e.target;
    setFormLote((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmitLote(e) {
    e.preventDefault();
    if (!authData || !lote) return;

    setSaveMessage("");
    setError("");
    setFormLoteError("");

    // Validaciones en JS
    const codTrim = formLote.codLote.trim();
    if (!codTrim) {
      setFormLoteError("El código de lote es obligatorio.");
      return;
    }
    if (codTrim.length > 60) {
      setFormLoteError(
        "El código de lote no puede superar los 60 caracteres."
      );
      return;
    }

    let campNum = null;
    if (formLote.campanaAnio !== "") {
      const parsed = parseInt(formLote.campanaAnio, 10);
      const currentYear = new Date().getFullYear();
      if (
        Number.isNaN(parsed) ||
        parsed < 1900 ||
        parsed > currentYear + 1
      ) {
        setFormLoteError(
          `El año de campaña debe estar entre 1900 y ${currentYear + 1}.`
        );
        return;
      }
      campNum = parsed;
    }

    if (formLote.notas && formLote.notas.length > 1000) {
      setFormLoteError(
        "Las notas no pueden superar los 1000 caracteres."
      );
      return;
    }

    setSavingLote(true);

    const { token, slug } = authData;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/${lote.id}`;

    const body = {
      codLote: codTrim,
      campanaAnio: campNum,
      fechaCreacion: formLote.fechaCreacion || null,
      notas: formLote.notas.trim() || null,
    };

    fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al guardar los cambios del lote");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setLote(data);
        syncFormFromLote(data);
        setSaveMessage("Cambios del lote guardados correctamente.");
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error al guardar los cambios del lote");
      })
      .finally(() => {
        setSavingLote(false);
      });
  }

  function volverAlListado() {
    window.location.href = "/app/inventario/lotes";
  }

  // ========= handlers embotellado =========
  function handleChangeEmbotellado(e) {
    const { name, value } = e.target;
    setNuevoEmbotellado((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmitEmbotellado(e) {
    e.preventDefault();
    if (!authData || !lote) return;

    const fecha = nuevoEmbotellado.fecha;
    const botellasNum = parseInt(nuevoEmbotellado.botellasAfectadas, 10);
    const detalle = nuevoEmbotellado.detalle || "";

    if (!fecha) {
      alert("Indica la fecha del embotellado.");
      return;
    }
    if (Number.isNaN(botellasNum) || botellasNum <= 0) {
      alert("Introduce un nº de botellas válido (≥ 1).");
      return;
    }

    const { token, slug } = authData;
    const fechaDateTime = `${fecha}T00:00:00`;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/${lote.id}/embotellados`;

    const body = {
      fecha: fechaDateTime,
      botellasProducidas: botellasNum, // ✅ cambio aquí
      detalle,
    };

    setSavingEmbotellado(true);
    setEmbotelladoError("");

    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
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
          let msg = "Error al registrar el embotellado.";
          try {
            const json = JSON.parse(text);
            if (json.message) msg = json.message;
          } catch { }
          throw new Error(msg);
        }
        return res.json();
      })
      .then(() => {
        cargarLote();
        cargarEmbotellados();
        setNuevoEmbotellado({
          fecha: "",
          botellasAfectadas: "",
          detalle: "",
        });
      })
      .catch((err) => {
        console.error(err);
        setEmbotelladoError(
          err.message || "Error al registrar el embotellado"
        );
      })
      .finally(() => {
        setSavingEmbotellado(false);
      });
  }


  // ========= permisos y modo edición =========
  const isAdmin = userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  const puedeEditarLote = isAdmin && modoEdicion;
  const puedeRegistrarEmbotellado =
    isAdmin ||
    userRole === "OPERARIO" ||
    userRole === "ROLE_OPERARIO";

  function activarEdicionLote() {
    if (!isAdmin) return;
    setModoEdicion(true);
    setFormLoteError("");
    setSaveMessage("");
    setError("");
  }

  function cancelarEdicionLote() {
    if (!isAdmin) return;
    setModoEdicion(false);
    if (lote) {
      // volvemos a los datos originales del lote
      syncFormFromLote(lote);
    }
    setFormLoteError("");
    setSaveMessage("");
    setError("");
  }

  // ========= render =========
  if (loading && !lote) {
    return (
      <div className="container-fluid px-0">
        <p>Cargando lote...</p>
      </div>
    );
  }

  if (error && !lote) {
    return (
      <div className="container-fluid px-0">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={volverAlListado}>
          Volver al listado
        </button>
      </div>
    );
  }

  if (!lote) return null;

  return (
    <div className="container-fluid px-0">
      {/* CABECERA */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            type="button"
            className="btn btn-link btn-sm px-0"
            onClick={volverAlListado}
          >
            &larr; Volver al listado
          </button>
          <h2 className="h4 mb-0 mt-1">{lote.codLote}</h2>
          <div className="small text-muted">
            Vino: <strong>{lote.productoNombre}</strong> · Campaña:{" "}
            <strong>{lote.campanaAnio || "-"}</strong> · Botellas disponibles:{" "}
            <strong>{lote.botellasDisponibles ?? 0}</strong>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {puedeEditarLote && (
            <span className="badge bg-primary">Modo edición</span>
          )}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={modoEdicion ? cancelarEdicionLote : activarEdicionLote}
            >
              {modoEdicion ? "Cancelar edición" : "Editar lote"}
            </button>
          )}
        </div>
      </div>

      {/* MENSAJES */}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {formLoteError && (
        <div className="alert alert-danger py-2">{formLoteError}</div>
      )}
      {saveMessage && (
        <div className="alert alert-success py-2">{saveMessage}</div>
      )}

      {/* FORM LOTE */}
      <div className="card mb-3">
        <div className="card-header">Datos del lote</div>
        <div className="card-body">
          <form noValidate onSubmit={handleSubmitLote}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Código lote</label>
                <input
                  type="text"
                  className="form-control"
                  name="codLote"
                  value={formLote.codLote}
                  onChange={handleChangeLote}
                  disabled={!puedeEditarLote}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Campaña</label>
                <input
                  type="number"
                  className="form-control"
                  name="campanaAnio"
                  value={formLote.campanaAnio}
                  onChange={handleChangeLote}
                  disabled={!puedeEditarLote}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Fecha creación</label>
                <input
                  type="date"
                  className="form-control"
                  name="fechaCreacion"
                  value={formLote.fechaCreacion || ""}
                  onChange={handleChangeLote}
                  disabled={!puedeEditarLote}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Notas</label>
                <textarea
                  className="form-control"
                  rows={3}
                  name="notas"
                  value={formLote.notas}
                  onChange={handleChangeLote}
                  disabled={!puedeEditarLote}
                />
              </div>
            </div>

            {puedeEditarLote && (
              <div className="mt-3 d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingLote}
                >
                  {savingLote ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* EMBOTELLADOS */}
      <div className="card">
        <div className="card-header">Embotellados de este lote</div>
        <div className="card-body">
          {embotelladoError && (
            <div className="alert alert-danger py-2">{embotelladoError}</div>
          )}

          {loadingEmbotellados ? (
            <p>Cargando embotellados...</p>
          ) : embotellados.length === 0 ? (
            <p className="mb-3">
              Todavía no hay embotellados registrados para este lote.
            </p>
          ) : (
            <div className="table-responsive mb-3">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th className="text-end">Botellas producidas</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {embotellados.map((e) => (
                    <tr key={e.id}>
                      {/* mostramos solo la parte de fecha si viene con hora */}
                      <td>{e.fecha ? String(e.fecha).slice(0, 10) : ""}</td>
                      <td className="text-end">
                        {e.botellasProducidas ?? e.botellasAfectadas ?? 0}
                      </td>

                      <td>{e.detalle || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {puedeRegistrarEmbotellado && (
            <>
              <hr />
              <h6 className="mb-3">Registrar nuevo embotellado</h6>
              <form
                className="row g-2 align-items-end"
                noValidate
                onSubmit={handleSubmitEmbotellado}
              >
                <div className="col-md-3">
                  <label className="form-label form-label-sm">Fecha</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    name="fecha"
                    value={nuevoEmbotellado.fecha}
                    onChange={handleChangeEmbotellado}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Botellas producidas
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    name="botellasAfectadas"
                    value={nuevoEmbotellado.botellasAfectadas}
                    onChange={handleChangeEmbotellado}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label form-label-sm">
                    Detalle / notas
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    name="detalle"
                    value={nuevoEmbotellado.detalle}
                    onChange={handleChangeEmbotellado}
                    placeholder="Ej: primer embotellado, 6 bot/caja..."
                  />
                </div>

                <div className="col-md-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm w-100"
                    disabled={savingEmbotellado}
                  >
                    {savingEmbotellado
                      ? "Guardando..."
                      : "Añadir embotellado"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoteDetalle;
