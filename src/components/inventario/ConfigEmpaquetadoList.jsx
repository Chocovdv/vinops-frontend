// src/components/inventario/ConfigEmpaquetadoList.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

// Helper para errores de la API
async function buildErrorFromResponse(response) {
  let message = `Error ${response.status}`;
  try {
    const data = await response.json();
    if (data) {
      if (data.message) message = data.message;
      else if (data.error) message = data.error;
    }
  } catch {
    // ignoramos errores de parseo
  }
  const error = new Error(message);
  error.status = response.status;
  return error;
}

function ConfigEmpaquetadoList() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [configs, setConfigs] = useState([]); // configuraciones de empaquetado
  const [materialesCaja, setMaterialesCaja] = useState([]); // productos MATERIAL (CAJA / ESTUCHE)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form alta
  const [formNuevo, setFormNuevo] = useState({
    cajaMaterialId: "",
    botellasPorCaja: "",
  });
  const [erroresNuevo, setErroresNuevo] = useState({});
  const [savingNuevo, setSavingNuevo] = useState(false);

  // Form edición
  const [editId, setEditId] = useState(null);
  const [formEdit, setFormEdit] = useState({
    cajaMaterialId: "",
    botellasPorCaja: "",
  });
  const [erroresEdit, setErroresEdit] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin =
    userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // === Auth ===
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
    setUserRole(auth.role || null);
  }, []);

  // === Carga inicial ===
  useEffect(() => {
    if (!authData) return;
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  // Limpiar mensaje de éxito auto
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(id);
  }, [success]);

  async function cargarDatosIniciales() {
    const { token, slug } = authData;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      // Configs de empaquetado + lista de materiales
      const [respConfigs, respMateriales] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/${slug}/inventario/config-empaquetado`,
          { headers }
        ),
        fetch(
          `${API_BASE_URL}/api/${slug}/inventario/productos/materiales`,
          { headers }
        ),
      ]);

      for (const res of [respConfigs, respMateriales]) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }
      }

      if (!respConfigs.ok) throw await buildErrorFromResponse(respConfigs);
      if (!respMateriales.ok)
        throw await buildErrorFromResponse(respMateriales);

      const [configsData, materialesData] = await Promise.all([
        respConfigs.json(),
        respMateriales.json(),
      ]);

      const configsOrdenadas = Array.isArray(configsData)
        ? [...configsData].sort((a, b) =>
            (a.cajaMaterialNombre || "").localeCompare(
              b.cajaMaterialNombre || "",
              "es",
              { sensitivity: "base" }
            )
          )
        : [];
      setConfigs(configsOrdenadas);

      // Solo materiales tipo CAJA / ESTUCHE
      const materialesCajaFiltrados = Array.isArray(materialesData)
        ? materialesData
            .filter(
              (m) =>
                m.tipoProducto === "MATERIAL" &&
                (m.familiaMaterial === "CAJA" ||
                  m.familiaMaterial === "ESTUCHE") &&
                m.activo
            )
            .sort((a, b) =>
              (a.nombre || "").localeCompare(b.nombre || "", "es", {
                sensitivity: "base",
              })
            )
        : [];
      setMaterialesCaja(materialesCajaFiltrados);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al cargar la configuración de empaquetado. Inténtalo de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // ALTA
  // =====================================================

  function handleNuevoChange(e) {
    const { name, value } = e.target;
    setFormNuevo((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarNuevo() {
    const errs = {};

    if (!formNuevo.cajaMaterialId) {
      errs.cajaMaterialId = "La caja / estuche es obligatoria.";
    }
    if (formNuevo.botellasPorCaja === "") {
      errs.botellasPorCaja = "Las botellas por caja son obligatorias.";
    } else {
      const n = Number(formNuevo.botellasPorCaja);
      if (!Number.isInteger(n) || n < 1) {
        errs.botellasPorCaja =
          "Las botellas por caja deben ser un número entero mayor o igual que 1.";
      }
    }

    setErroresNuevo(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCrearConfig(e) {
    e.preventDefault();
    if (!authData) return;
    if (!validarNuevo()) return;

    const { token, slug } = authData;
    setSavingNuevo(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        cajaMaterialId: Number(formNuevo.cajaMaterialId),
        botellasPorCaja: Number(formNuevo.botellasPorCaja),
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/config-empaquetado`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const nuevaConfig = await resp.json();

      setConfigs((prev) =>
        [...prev, nuevaConfig].sort((a, b) =>
          (a.cajaMaterialNombre || "").localeCompare(
            b.cajaMaterialNombre || "",
            "es",
            { sensitivity: "base" }
          )
        )
      );

      setFormNuevo({
        cajaMaterialId: "",
        botellasPorCaja: "",
      });
      setErroresNuevo({});
      setSuccess("Configuración de empaquetado creada correctamente.");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al guardar la configuración de empaquetado. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingNuevo(false);
    }
  }

  // =====================================================
  // EDICIÓN
  // =====================================================

  function iniciarEdicion(config) {
    setEditId(config.id);
    setFormEdit({
      cajaMaterialId: String(config.cajaMaterialId || ""),
      botellasPorCaja:
        config.botellasPorCaja != null ? String(config.botellasPorCaja) : "",
    });
    setErroresEdit({});
  }

  function cancelarEdicion() {
    setEditId(null);
    setFormEdit({
      cajaMaterialId: "",
      botellasPorCaja: "",
    });
    setErroresEdit({});
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setFormEdit((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarEdit() {
    const errs = {};

    if (!formEdit.cajaMaterialId) {
      errs.cajaMaterialId = "La caja / estuche es obligatoria.";
    }
    if (formEdit.botellasPorCaja === "") {
      errs.botellasPorCaja = "Las botellas por caja son obligatorias.";
    } else {
      const n = Number(formEdit.botellasPorCaja);
      if (!Number.isInteger(n) || n < 1) {
        errs.botellasPorCaja =
          "Las botellas por caja deben ser un número entero mayor o igual que 1.";
      }
    }

    setErroresEdit(errs);
    return Object.keys(errs).length === 0;
  }

  async function guardarEdicion(config) {
    if (!authData) return;
    if (!validarEdit()) return;

    const { token, slug } = authData;
    setSavingEdit(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        cajaMaterialId: Number(formEdit.cajaMaterialId),
        botellasPorCaja: Number(formEdit.botellasPorCaja),
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/config-empaquetado/${config.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const actualizada = await resp.json();

      setConfigs((prev) =>
        prev
          .map((c) => (c.id === actualizada.id ? actualizada : c))
          .sort((a, b) =>
            (a.cajaMaterialNombre || "").localeCompare(
              b.cajaMaterialNombre || "",
              "es",
              { sensitivity: "base" }
            )
          )
      );

      setSuccess("Configuración actualizada correctamente.");
      cancelarEdicion();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al actualizar la configuración. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // =====================================================
  // ELIMINAR
  // =====================================================

  async function eliminarConfig(config) {
    if (!authData) return;
    if (!isAdmin) {
      alert("Solo un usuario ADMIN puede eliminar configuraciones.");
      return;
    }

    const ok = window.confirm(
      `¿Seguro que quieres eliminar la configuración para "${config.cajaMaterialNombre}"?`
    );
    if (!ok) return;

    const { token, slug } = authData;
    setError("");
    setSuccess("");

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/config-empaquetado/${config.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      setConfigs((prev) => prev.filter((c) => c.id !== config.id));
      if (editId === config.id) {
        cancelarEdicion();
      }
      setSuccess("Configuración eliminada correctamente.");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al eliminar la configuración. Inténtalo de nuevo más tarde."
      );
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return <p>Cargando configuración de empaquetado...</p>;
  }

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h5 mb-3">Configuración de empaquetado</h2>
        <p className="text-muted small">
          Aquí defines las cajas y estuches que puede usar la bodega y cuántas
          botellas caben en cada una (por ejemplo, estuche 2, caja 6, caja 12).
          Más adelante, al hacer un albarán, elegirás qué tipo de caja usar.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="alert">
            {success}
          </div>
        )}

        {/* LISTADO */}
        <div className="table-responsive mb-4">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Caja / estuche (material)</th>
                <th className="text-end">Botellas por caja</th>
                <th style={{ width: "1%" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-3">
                    No hay configuraciones de empaquetado todavía.
                  </td>
                </tr>
              ) : (
                configs.map((c) => {
                  const enEdicion = editId === c.id;

                  return (
                    <tr key={c.id}>
                      <td style={{ minWidth: "260px" }}>
                        {enEdicion ? (
                          <>
                            <select
                              name="cajaMaterialId"
                              className={`form-select form-select-sm ${
                                erroresEdit.cajaMaterialId ? "is-invalid" : ""
                              }`}
                              value={formEdit.cajaMaterialId}
                              onChange={handleEditChange}
                            >
                              <option value="">
                                Selecciona caja / estuche...
                              </option>
                              {materialesCaja.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre}
                                </option>
                              ))}
                            </select>
                            {erroresEdit.cajaMaterialId && (
                              <div className="invalid-feedback">
                                {erroresEdit.cajaMaterialId}
                              </div>
                            )}
                          </>
                        ) : (
                          c.cajaMaterialNombre || "-"
                        )}
                      </td>

                      <td className="text-end" style={{ width: "140px" }}>
                        {enEdicion ? (
                          <>
                            <input
                              type="number"
                              name="botellasPorCaja"
                              className={`form-control form-control-sm text-end ${
                                erroresEdit.botellasPorCaja ? "is-invalid" : ""
                              }`}
                              value={formEdit.botellasPorCaja}
                              onChange={handleEditChange}
                              min={1}
                            />
                            {erroresEdit.botellasPorCaja && (
                              <div className="invalid-feedback">
                                {erroresEdit.botellasPorCaja}
                              </div>
                            )}
                          </>
                        ) : (
                          c.botellasPorCaja ?? "-"
                        )}
                      </td>

                      <td>
                        {enEdicion ? (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => guardarEdicion(c)}
                              disabled={savingEdit}
                            >
                              {savingEdit ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={cancelarEdicion}
                              disabled={savingEdit}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => iniciarEdicion(c)}
                            >
                              Editar
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => eliminarConfig(c)}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FORM ALTA */}
        <div className="card">
          <div className="card-body">
            <h3 className="h6 mb-3">Añadir configuración</h3>
            <form
              className="row g-3 align-items-end"
              onSubmit={handleCrearConfig}
            >
              {/* Caja / estuche */}
              <div className="col-12 col-md-6">
                <label className="form-label">
                  Caja / estuche (material)
                  <span className="text-danger">*</span>
                </label>
                <select
                  name="cajaMaterialId"
                  className={`form-select form-select-sm ${
                    erroresNuevo.cajaMaterialId ? "is-invalid" : ""
                  }`}
                  value={formNuevo.cajaMaterialId}
                  onChange={handleNuevoChange}
                >
                  <option value="">
                    Selecciona caja / estuche...
                  </option>
                  {materialesCaja.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                {erroresNuevo.cajaMaterialId && (
                  <div className="invalid-feedback">
                    {erroresNuevo.cajaMaterialId}
                  </div>
                )}
              </div>

              {/* Botellas por caja */}
              <div className="col-6 col-md-3">
                <label className="form-label">
                  Botellas por caja
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  name="botellasPorCaja"
                  className={`form-control form-control-sm ${
                    erroresNuevo.botellasPorCaja ? "is-invalid" : ""
                  }`}
                  value={formNuevo.botellasPorCaja}
                  onChange={handleNuevoChange}
                  min={1}
                />
                {erroresNuevo.botellasPorCaja && (
                  <div className="invalid-feedback">
                    {erroresNuevo.botellasPorCaja}
                  </div>
                )}
              </div>

              <div className="col-12 col-md-3 d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-sm btn-primary ms-md-auto"
                  disabled={savingNuevo}
                >
                  {savingNuevo ? "Guardando..." : "Añadir configuración"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigEmpaquetadoList;
