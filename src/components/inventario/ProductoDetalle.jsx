import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function ProductoDetalle({ productoId }) {
  const [userRole, setUserRole] = useState(null);
  const [authData, setAuthData] = useState(null);

  const [producto, setProducto] = useState(null);
  const [lotes, setLotes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipoProducto: "",
    precioProfesional: "",
    precioParticular: "",
    familiaMaterial: "",
    stockUnidades: "",
    stockMinimoUnidades: "",
    activo: true,
  });
  const [formError, setFormError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // ===== materiales (para receta) =====
  const [materiales, setMateriales] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);

  // ===== receta de embotellado =====
  const [receta, setReceta] = useState([]);
  const [loadingReceta, setLoadingReceta] = useState(false);
  const [recetaError, setRecetaError] = useState("");
  const [nuevoMaterialId, setNuevoMaterialId] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("");
  const [savingRecetaNueva, setSavingRecetaNueva] = useState(false);
  const [savingRecetaLineaId, setSavingRecetaLineaId] = useState(null);

  // ===== modo edición por query ?modo=edit =====
  const [modoEdicion, setModoEdicion] = useState(false);

  const isAdmin = userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // helper para sincronizar el formulario a partir del producto
  function syncFormFromProducto(data) {
    setFormData({
      nombre: data.nombre || "",
      descripcion: data.descripcion || "",
      tipoProducto: data.tipoProducto || "",
      precioProfesional:
        data.precioProfesional != null
          ? String(data.precioProfesional)
          : "",
      precioParticular:
        data.precioParticular != null ? String(data.precioParticular) : "",
      familiaMaterial: data.familiaMaterial || "",
      stockUnidades:
        data.stockUnidades != null ? String(data.stockUnidades) : "",
      stockMinimoUnidades:
        data.stockMinimoUnidades != null
          ? String(data.stockMinimoUnidades)
          : "",
      activo: data.activo != null ? data.activo : true,
    });
  }

  // ============= cargar datos principales =============
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);

    // leer ?modo=edit de la URL
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        setModoEdicion(params.get("modo") === "edit");
      }
    } catch (e) {
      console.error("Error leyendo modo edición en ProductoDetalle", e);
    }

    cargarMateriales(auth);

    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/productos/${productoId}`;

    setLoading(true);
    setError("");
    setFormError("");
    setSaveMessage("");

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
          throw new Error("Error al cargar el producto");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProducto(data);
        syncFormFromProducto(data);

        if (data.tipoProducto === "VINO") {
          cargarLotes(auth, data.id);
          cargarReceta(auth, data.id);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error desconocido al cargar el producto");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productoId]);

  // ============= cargar materiales (MATERIAL) =============
  function cargarMateriales(auth) {
    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/productos/materiales`;

    setLoadingMateriales(true);

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
          throw new Error("Error al cargar materiales");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setMateriales(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingMateriales(false);
      });
  }

  // ============= cargar lotes de un vino ==============
  function cargarLotes(auth, prodId) {
    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/lotes/producto/${prodId}`;

    setLoadingLotes(true);

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
          throw new Error("Error al cargar los lotes de este vino");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setLotes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingLotes(false);
      });
  }

  // ============= cargar receta de embotellado =============
  function cargarReceta(auth, prodId) {
    const { token, slug } = auth;
    const url = `${API_BASE_URL}/api/${slug}/inventario/receta-embotellado/producto/${prodId}`;

    setLoadingReceta(true);
    setRecetaError("");

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
          throw new Error("Error al cargar la receta de embotellado");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const lista = Array.isArray(data) ? data : [];
        setReceta(
          lista.map((r) => ({
            ...r,
            cantidadPorBotella:
              r.cantidadPorBotella != null
                ? String(r.cantidadPorBotella)
                : "",
          }))
        );
      })
      .catch((err) => {
        console.error(err);
        setRecetaError(
          err.message || "Error desconocido al cargar la receta"
        );
      })
      .finally(() => {
        setLoadingReceta(false);
      });
  }

  // ============= handlers formulario producto =============
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!authData || !producto) return;

    setSaving(false);
    setSaveMessage("");
    setError("");
    setFormError("");

    const esVinoLocal = producto.tipoProducto === "VINO";

    const nombreTrim = formData.nombre.trim();
    const descripcionTrim = formData.descripcion.trim();

    if (!nombreTrim) {
      setFormError("El nombre del producto es obligatorio.");
      return;
    }
    if (nombreTrim.length > 150) {
      setFormError(
        "El nombre del producto no puede superar los 150 caracteres."
      );
      return;
    }

    if (descripcionTrim.length > 2000) {
      setFormError("La descripción no puede superar los 2000 caracteres.");
      return;
    }

    const body = {
      nombre: nombreTrim,
      descripcion: descripcionTrim || null,
    };

    if (esVinoLocal) {
      const precioProfStr = formData.precioProfesional.trim();
      const precioPartStr = formData.precioParticular.trim();

      if (precioProfStr === "" || precioPartStr === "") {
        setFormError(
          "Los precios profesional y particular son obligatorios."
        );
        return;
      }

      const precioProfNum = parseFloat(precioProfStr);
      const precioPartNum = parseFloat(precioPartStr);

      if (Number.isNaN(precioProfNum) || precioProfNum < 0) {
        setFormError(
          "El precio profesional debe ser un número mayor o igual que 0."
        );
        return;
      }
      if (Number.isNaN(precioPartNum) || precioPartNum < 0) {
        setFormError(
          "El precio particular debe ser un número mayor o igual que 0."
        );
        return;
      }

      body.precioProfesional = precioProfNum;
      body.precioParticular = precioPartNum;
    } else if (producto.tipoProducto === "MATERIAL") {
      const familiaTrim = (formData.familiaMaterial || "").trim();
      const stockStr = formData.stockUnidades.trim();
      const stockMinStr = formData.stockMinimoUnidades.trim();

      if (!familiaTrim) {
        setFormError("La familia de material es obligatoria.");
        return;
      }

      if (stockStr === "" || stockMinStr === "") {
        setFormError(
          "El stock y el stock mínimo son obligatorios para un material."
        );
        return;
      }

      const stockNum = parseInt(stockStr, 10);
      const stockMinNum = parseInt(stockMinStr, 10);

      if (Number.isNaN(stockNum) || stockNum < 0) {
        setFormError(
          "El stock debe ser un número mayor o igual que 0."
        );
        return;
      }

      if (Number.isNaN(stockMinNum) || stockMinNum < 0) {
        setFormError(
          "El stock mínimo debe ser un número mayor o igual que 0."
        );
        return;
      }

      body.familiaMaterial = familiaTrim;
      body.stockUnidades = stockNum;
      body.stockMinimoUnidades = stockMinNum;
    }

    setSaving(true);

    const { token, slug } = authData;
    const url = `${API_BASE_URL}/api/${slug}/inventario/productos/${producto.id}`;

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
          throw new Error("Error al guardar el producto");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProducto(data);
        syncFormFromProducto(data);
        setSaveMessage("Cambios guardados correctamente.");
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error al guardar los cambios");
      })
      .finally(() => {
        setSaving(false);
      });
  }

  function volverAlListado() {
    window.location.href = "/app/inventario/productos";
  }

  // ============= handlers receta embotellado =============
  function handleCambioCantidadReceta(id, valor) {
    setReceta((prev) =>
      prev.map((r) => (r.id === id ? { ...r, cantidadPorBotella: valor } : r))
    );
  }

  function handleGuardarLineaReceta(linea) {
    if (!authData) return;
    const { token, slug } = authData;

    setRecetaError("");

    // validación: entero >= 1
    const valorStr = (linea.cantidadPorBotella ?? "").toString().trim();
    const cantidadNum = Number(valorStr);

    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setRecetaError(
        "La cantidad por botella debe ser un número entero mayor o igual que 1."
      );
      return;
    }

    const url = `${API_BASE_URL}/api/${slug}/inventario/receta-embotellado/${linea.id}`;

    setSavingRecetaLineaId(linea.id);

    const body = {
      materialId: linea.materialId,
      cantidadPorBotella: cantidadNum,
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
          throw new Error("Error al guardar la línea de receta");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setReceta((prev) =>
          prev.map((r) =>
            r.id === data.id
              ? {
                  ...data,
                  cantidadPorBotella:
                    data.cantidadPorBotella != null
                      ? String(data.cantidadPorBotella)
                      : "",
                }
              : r
          )
        );
      })
      .catch((err) => {
        console.error(err);
        setRecetaError(
          err.message || "Error al guardar la línea de receta"
        );
      })
      .finally(() => {
        setSavingRecetaLineaId(null);
      });
  }

  function handleEliminarLineaReceta(lineaId) {
    if (!authData) return;
    if (!window.confirm("¿Eliminar esta línea de receta?")) return;

    const { token, slug } = authData;
    const url = `${API_BASE_URL}/api/${slug}/inventario/receta-embotellado/${lineaId}`;

    setRecetaError("");

    fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok && res.status !== 204) {
          throw new Error("Error al eliminar la línea de receta");
        }
        setReceta((prev) => prev.filter((r) => r.id !== lineaId));
      })
      .catch((err) => {
        console.error(err);
        setRecetaError(
          err.message || "Error al eliminar la línea de receta"
        );
      });
  }

  function handleGuardarNuevaLineaReceta(e) {
    e.preventDefault();
    if (!authData || !producto) return;

    setRecetaError("");

    const materialIdNum = parseInt(nuevoMaterialId, 10);
    const cantidadStr = (nuevaCantidad ?? "").toString().trim();
    const cantidadNum = Number(cantidadStr);

    if (Number.isNaN(materialIdNum)) {
      setRecetaError(
        "Selecciona un material para la nueva línea de receta."
      );
      return;
    }
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setRecetaError(
        "La cantidad por botella debe ser un número entero mayor o igual que 1."
      );
      return;
    }

    const { token, slug } = authData;
    const url = `${API_BASE_URL}/api/${slug}/inventario/receta-embotellado`;

    setSavingRecetaNueva(true);

    const body = {
      productoVinoId: producto.id,
      materialId: materialIdNum,
      cantidadPorBotella: cantidadNum,
    };

    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al crear la línea de receta");
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setReceta((prev) => [
          ...prev,
          {
            ...data,
            cantidadPorBotella:
              data.cantidadPorBotella != null
                ? String(data.cantidadPorBotella)
                : "",
          },
        ]);
        setNuevoMaterialId("");
        setNuevaCantidad("");
      })
      .catch((err) => {
        console.error(err);
        setRecetaError(
          err.message || "Error al crear la línea de receta"
        );
      })
      .finally(() => {
        setSavingRecetaNueva(false);
      });
  }

  // ============= modo edición ============
  const esVino = producto?.tipoProducto === "VINO";
  const puedeEditar = isAdmin && modoEdicion;

  function activarEdicionProducto() {
    if (!isAdmin) return;
    setModoEdicion(true);
    setFormError("");
    setSaveMessage("");
    setError("");
  }

  function cancelarEdicionProducto() {
    if (!isAdmin) return;
    setModoEdicion(false);
    if (producto) {
      syncFormFromProducto(producto);
    }
    setFormError("");
    setSaveMessage("");
    setError("");
  }

  const materialesCajas = materiales.filter(
    (m) => m.familiaMaterial === "CAJA"
  ); // por si los usas luego para algo

  // ============= render =============
  if (loading) {
    return (
      <div className="container-fluid px-0">
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (error && !producto) {
    return (
      <div className="container-fluid px-0">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary btn-sm" onClick={volverAlListado}>
          Volver al listado
        </button>
      </div>
    );
  }

  if (!producto) return null;

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
          <h2 className="h4 mb-0 mt-1">{producto.nombre}</h2>
          <div className="small text-muted">
            Tipo:{" "}
            <span className="badge bg-secondary">
              {producto.tipoProducto}
            </span>{" "}
            · Estado:{" "}
            <span
              className={
                producto.activo ? "badge bg-success" : "badge bg-secondary"
              }
            >
              {producto.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {puedeEditar && (
            <span className="badge bg-primary">Modo edición</span>
          )}
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={
                modoEdicion ? cancelarEdicionProducto : activarEdicionProducto
              }
            >
              {modoEdicion ? "Cancelar edición" : "Editar producto"}
            </button>
          )}
        </div>
      </div>

      {/* MENSAJES GENERALES */}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {formError && (
        <div className="alert alert-danger py-2">{formError}</div>
      )}
      {saveMessage && (
        <div className="alert alert-success py-2">{saveMessage}</div>
      )}

      {/* FORMULARIO DATOS PRODUCTO */}
      <div className="card mb-3">
        <div className="card-header">Datos del producto</div>
        <div className="card-body">
          <form noValidate onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  disabled={!puedeEditar}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Tipo de producto</label>
                <input
                  type="text"
                  className="form-control"
                  value={producto.tipoProducto}
                  disabled
                />
              </div>

              <div className="col-12">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  rows={3}
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  disabled={!puedeEditar}
                />
              </div>

              {esVino && (
                <>
                  <div className="col-md-4">
                    <label className="form-label">
                      Precio profesional (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="precioProfesional"
                      value={formData.precioProfesional}
                      onChange={handleChange}
                      disabled={!puedeEditar}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Precio particular (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      name="precioParticular"
                      value={formData.precioParticular}
                      onChange={handleChange}
                      disabled={!puedeEditar}
                    />
                  </div>
                </>
              )}

              {!esVino && (
                <>
                  <div className="col-md-4">
                    <label className="form-label">Familia de material</label>
                    <select
                      className="form-select"
                      name="familiaMaterial"
                      value={formData.familiaMaterial}
                      onChange={handleChange}
                      disabled={!puedeEditar}
                    >
                      <option value="">Selecciona familia...</option>
                      <option value="BOTELLA">BOTELLA</option>
                      <option value="CORCHO">CORCHO</option>
                      <option value="CAPSULA">CÁPSULA</option>
                      <option value="ETIQUETA_FRONTAL">
                        ETIQUETA FRONTAL
                      </option>
                      <option value="CONTRAETIQUETA">
                        CONTRAETIQUETA
                      </option>
                      <option value="CAJA">CAJA</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Stock (unidades)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="stockUnidades"
                      value={formData.stockUnidades}
                      onChange={handleChange}
                      disabled={!puedeEditar}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">
                      Stock mínimo (unidades)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      name="stockMinimoUnidades"
                      value={formData.stockMinimoUnidades}
                      onChange={handleChange}
                      disabled={!puedeEditar}
                    />
                  </div>
                </>
              )}
            </div>

            {puedeEditar && (
              <div className="mt-3 d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* LOTES + RECETA SOLO PARA VINO */}
      {esVino && (
        <>
          {/* LOTES */}
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Lotes de este vino</span>
              {puedeEditar && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() =>
                    (window.location.href = `/app/inventario/lotes/nuevo?productoId=${producto.id}`)
                  }
                >
                  + Nuevo lote de este vino
                </button>
              )}
            </div>
            <div className="card-body">
              {loadingLotes ? (
                <p>Cargando lotes...</p>
              ) : lotes.length === 0 ? (
                <p className="mb-0">
                  Este vino todavía no tiene lotes registrados.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Código lote</th>
                        <th>Campaña</th>
                        <th>Fecha creación</th>
                        <th className="text-end">Botellas disponibles</th>
                        <th>Notas</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((l) => (
                        <tr key={l.id}>
                          <td>{l.codLote}</td>
                          <td>{l.campanaAnio}</td>
                          <td>{l.fechaCreacion}</td>
                          <td className="text-end">
                            {l.botellasDisponibles ?? 0}
                          </td>
                          <td>{l.notas || "-"}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() =>
                                (window.location.href = `/app/inventario/lotes/${l.id}`)
                              }
                            >
                              Ver / editar lote
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

          {/* RECETA DE EMBOTELLADO */}
          <div className="card mb-3">
            <div className="card-header">Receta de embotellado</div>
            <div className="card-body">
              {recetaError && (
                <div className="alert alert-danger py-2">{recetaError}</div>
              )}

              {loadingReceta ? (
                <p>Cargando receta...</p>
              ) : receta.length === 0 ? (
                <p className="mb-2">
                  Este vino todavía no tiene receta de embotellado.
                </p>
              ) : (
                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Material</th>
                        <th style={{ width: "220px" }}>
                          Cantidad por botella
                        </th>
                        {puedeEditar && (
                          <th
                            className="text-end"
                            style={{ width: "140px" }}
                          >
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {receta.map((r) => (
                        <tr key={r.id}>
                          <td>{r.materialNombre}</td>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              className="form-control form-control-sm"
                              value={r.cantidadPorBotella}
                              onChange={(e) =>
                                handleCambioCantidadReceta(
                                  r.id,
                                  e.target.value
                                )
                              }
                              onBlur={() => {
                                if (puedeEditar) {
                                  handleGuardarLineaReceta(r);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (puedeEditar) {
                                    handleGuardarLineaReceta(r);
                                  }
                                }
                              }}
                              disabled={
                                !puedeEditar || savingRecetaLineaId === r.id
                              }
                            />
                          </td>
                          {puedeEditar && (
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() =>
                                  handleEliminarLineaReceta(r.id)
                                }
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {puedeEditar && (
                <form
                  className="row g-2 align-items-end"
                  noValidate
                  onSubmit={handleGuardarNuevaLineaReceta}
                >
                  <div className="col-md-6">
                    <label className="form-label form-label-sm">
                      Nuevo material de embotellado
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={nuevoMaterialId}
                      onChange={(e) => setNuevoMaterialId(e.target.value)}
                    >
                      <option value="">Selecciona material...</option>
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}{" "}
                          {m.familiaMaterial
                            ? `(${m.familiaMaterial.replace("_", " ")})`
                            : ""}
                        </option>
                      ))}
                    </select>
                    {loadingMateriales && (
                      <small className="text-muted">
                        Cargando materiales...
                      </small>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label form-label-sm">
                      Cantidad por botella
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="form-control form-control-sm"
                      value={nuevaCantidad}
                      onChange={(e) => setNuevaCantidad(e.target.value)}
                    />
                  </div>

                  <div className="col-md-3">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={savingRecetaNueva}
                    >
                      {savingRecetaNueva
                        ? "Añadiendo..."
                        : "Añadir a receta"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductoDetalle;
