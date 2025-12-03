// src/components/vinedo/ParcelaDetalle.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";

function ParcelaDetalle({ id }) {
  // ======= auth =======
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // ======= estado parcela =======
  const [parcela, setParcela] = useState(null);
  const [loadingParcela, setLoadingParcela] = useState(true);
  const [errorParcela, setErrorParcela] = useState("");

  // edición de parcela
  const [editNombre, setEditNombre] = useState("");
  const [editSuperficie, setEditSuperficie] = useState("");
  const [editVariedad, setEditVariedad] = useState("");
  const [editAltitud, setEditAltitud] = useState("");
  const [editNotas, setEditNotas] = useState("");
  const [editandoParcela, setEditandoParcela] = useState(false);
  const [guardandoParcela, setGuardandoParcela] = useState(false);
  const [msgParcelaOk, setMsgParcelaOk] = useState("");
  const [msgParcelaError, setMsgParcelaError] = useState("");

  // ======= estado registros =======
  const [registros, setRegistros] = useState([]);
  const [loadingRegistros, setLoadingRegistros] = useState(true);
  const [errorRegistros, setErrorRegistros] = useState("");

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // ======= ESTIMACIÓN VENDIMIA (IA) =======
  const [estimacion, setEstimacion] = useState(null);
  const [loadingEstimacion, setLoadingEstimacion] = useState(true);
  const [errorEstimacion, setErrorEstimacion] = useState("");

  // ======= formulario nuevo / editar registro =======
  const [nuevoTipo, setNuevoTipo] = useState("TRATAMIENTO");
  const [nuevoFecha, setNuevoFecha] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [nuevoPlazo, setNuevoPlazo] = useState("");
  const [nuevoParametro, setNuevoParametro] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [nuevoKilos, setNuevoKilos] = useState("");
  const [nuevoGrado, setNuevoGrado] = useState("");
  const [nuevoDestino, setNuevoDestino] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [okCrear, setOkCrear] = useState("");

  // edición de registro
  const [registroEditId, setRegistroEditId] = useState(null); // null = modo crear

  // ======= helper para auth en handlers =======
  function getAuthSafe() {
    const auth = authData || getAuthDataOrRedirect();
    return auth || null;
  }

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

  // ======= cargar parcela + IA al entrar =======
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    const { role } = auth;

    setAuthData(auth);
    setUserRole(role || null);

    cargarParcela(auth);
    cargarEstimacion(auth); // IA
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarParcela(auth) {
    const authToUse = auth || getAuthSafe();
    if (!authToUse) return;
    const { token, slug } = authToUse;

    const url = `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}`;

    setLoadingParcela(true);
    setErrorParcela("");

    try {
      const res = await fetch(url, {
        headers: authHeaders(token),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 404) {
        throw new Error("Parcela no encontrada");
      }
      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al cargar la parcela."
        );
        throw new Error(msg);
      }

      const data = await res.json();
      setParcela(data);

      setEditNombre(data.nombre || "");
      setEditSuperficie(
        data.superficieHa != null ? String(data.superficieHa) : ""
      );
      setEditVariedad(data.variedadPrincipal || "");
      setEditAltitud(data.altitudM != null ? String(data.altitudM) : "");
      setEditNotas(data.notas || "");
    } catch (err) {
      console.error(err);
      setErrorParcela(err.message || "Error desconocido");
    } finally {
      setLoadingParcela(false);
    }
  }

  // ======= cargar estimación IA =======
  async function cargarEstimacion(authParam) {
    const auth = authParam || getAuthSafe();
    if (!auth) return;
    const { token, slug } = auth;

    const url = `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}/vendimia-estimada`;

    setLoadingEstimacion(true);
    setErrorEstimacion("");
    setEstimacion(null);

    try {
      const res = await fetch(url, {
        headers: authHeaders(token),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (res.status === 404) {
        // No hay muestreos todavía
        setErrorEstimacion(
          "Todavía no hay muestreos suficientes para estimar la vendimia."
        );
        return;
      }

      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al calcular la estimación de vendimia."
        );
        throw new Error(msg);
      }

      const data = await res.json();
      setEstimacion(data);
    } catch (err) {
      console.error(err);
      setErrorEstimacion(
        err.message || "Error al calcular la estimación de vendimia."
      );
    } finally {
      setLoadingEstimacion(false);
    }
  }

  // ======= cargar registros (con filtros) =======
  async function cargarRegistros(tipo, desde, hasta) {
    const auth = getAuthSafe();
    if (!auth) return;
    const { token, slug } = auth;

    let url = `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}/registros`;

    const params = new URLSearchParams();
    if (tipo) params.append("tipo", tipo);
    if (desde) params.append("desde", desde);
    if (hasta) params.append("hasta", hasta);

    const qs = params.toString();
    if (qs) url += `?${qs}`;

    setLoadingRegistros(true);
    setErrorRegistros("");

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
          "Error al cargar los registros de viñedo."
        );
        throw new Error(msg);
      }

      const data = await res.json();
      setRegistros(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorRegistros(err.message || "Error desconocido");
    } finally {
      setLoadingRegistros(false);
    }
  }

  // primera carga de registros (sin filtros)
  useEffect(() => {
    cargarRegistros("", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ======= filtros =======
  async function handleBuscar(e) {
    e.preventDefault();
    cargarRegistros(filtroTipo, filtroDesde, filtroHasta);
  }

  function handleLimpiarFiltros() {
    setFiltroTipo("");
    setFiltroDesde("");
    setFiltroHasta("");
    cargarRegistros("", "", "");
  }

  // ======= GUARDAR (crear o editar) registro =======
  async function handleCrear(e) {
    e.preventDefault();
    setErrorCrear("");
    setOkCrear("");

    const auth = getAuthSafe();
    if (!auth) return;
    const { token, slug } = auth;

    if (!nuevoTipo || !nuevoFecha) {
      setErrorCrear("Tipo y fecha son obligatorios.");
      return;
    }

    // Validaciones por tipo
    if (nuevoTipo === "TRATAMIENTO") {
      if (!nuevoProducto.trim()) {
        setErrorCrear(
          "En un TRATAMIENTO es obligatorio indicar el producto fitosanitario."
        );
        return;
      }
      if (nuevoPlazo !== "" && Number(nuevoPlazo) < 0) {
        setErrorCrear("El plazo de seguridad no puede ser negativo.");
        return;
      }
    }

    if (nuevoTipo === "MUESTREO") {
      if (!nuevoParametro.trim()) {
        setErrorCrear(
          "En un MUESTREO es obligatorio indicar el parámetro (ej. Brix, pH, Acidez...)."
        );
        return;
      }
      if (nuevoValor === "" || Number(nuevoValor) < 0) {
        setErrorCrear(
          "En un MUESTREO el valor del parámetro debe ser mayor o igual que cero."
        );
        return;
      }
    }

    if (nuevoTipo === "VENDIMIA") {
      if (nuevoKilos === "" || Number(nuevoKilos) <= 0) {
        setErrorCrear(
          "En una VENDIMIA los kilos de uva deben ser mayores que cero."
        );
        return;
      }
      if (nuevoGrado === "" || Number(nuevoGrado) <= 0) {
        setErrorCrear(
          "En una VENDIMIA el grado probable debe ser mayor que cero."
        );
        return;
      }
    }

    const body = {
      tipo: nuevoTipo,
      fecha: nuevoFecha,
      descripcion: nuevoDescripcion || null,
      productoFitosanitario:
        nuevoTipo === "TRATAMIENTO" ? nuevoProducto || null : null,
      plazoSeguridadDias:
        nuevoTipo === "TRATAMIENTO" && nuevoPlazo !== ""
          ? Number(nuevoPlazo)
          : null,
      parametro: nuevoTipo === "MUESTREO" ? nuevoParametro || null : null,
      valorParametro:
        nuevoTipo === "MUESTREO" && nuevoValor !== ""
          ? Number(nuevoValor)
          : null,
      kilosUva:
        nuevoTipo === "VENDIMIA" && nuevoKilos !== ""
          ? Number(nuevoKilos)
          : null,
      gradoProbable:
        (nuevoTipo === "VENDIMIA" || nuevoTipo === "MUESTREO") &&
          nuevoGrado !== ""
          ? Number(nuevoGrado)
          : null,
      destino: nuevoTipo === "VENDIMIA" ? nuevoDestino || null : null,
    };

    setCreando(true);

    const esEdicion = registroEditId !== null;
    const urlBase = `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}/registros`;
    const url = esEdicion ? `${urlBase}/${registroEditId}` : urlBase;
    const method = esEdicion ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          esEdicion
            ? "Error al actualizar el registro."
            : "Error al crear el registro."
        );
        throw new Error(msg);
      }

      await res.json();

      setOkCrear(
        esEdicion
          ? "Registro actualizado correctamente."
          : "Registro creado correctamente."
      );

      // limpiamos formulario y salimos de modo edición
      setRegistroEditId(null);
      setNuevoFecha("");
      setNuevoDescripcion("");
      setNuevoProducto("");
      setNuevoPlazo("");
      setNuevoParametro("");
      setNuevoValor("");
      setNuevoKilos("");
      setNuevoGrado("");
      setNuevoDestino("");

      // recargamos registros + IA (por si hemos creado/actualizado un muestreo)
      cargarRegistros(filtroTipo, filtroDesde, filtroHasta);
      cargarEstimacion(auth);
    } catch (err) {
      console.error(err);
      setErrorCrear(
        err.message ||
        (registroEditId
          ? "Error al actualizar el registro."
          : "Error al crear el registro.")
      );
    } finally {
      setCreando(false);
    }
  }

  // ======= preparar edición de un registro =======
  function handleEditarRegistro(reg) {
    setRegistroEditId(reg.id);
    setNuevoTipo(reg.tipo || "TRATAMIENTO");
    setNuevoFecha(reg.fecha || "");
    setNuevoDescripcion(reg.descripcion || "");
    setNuevoProducto(reg.productoFitosanitario || "");
    setNuevoPlazo(
      reg.plazoSeguridadDias != null ? String(reg.plazoSeguridadDias) : ""
    );
    setNuevoParametro(reg.parametro || "");
    setNuevoValor(
      reg.valorParametro != null ? String(reg.valorParametro) : ""
    );
    setNuevoKilos(reg.kilosUva != null ? String(reg.kilosUva) : "");
    setNuevoGrado(
      reg.gradoProbable != null ? String(reg.gradoProbable) : ""
    );
    setNuevoDestino(reg.destino || "");
    setErrorCrear("");
    setOkCrear("");
  }

  function cancelarEdicionRegistro() {
    setRegistroEditId(null);
    setErrorCrear("");
    setOkCrear("");
    setNuevoFecha("");
    setNuevoDescripcion("");
    setNuevoProducto("");
    setNuevoPlazo("");
    setNuevoParametro("");
    setNuevoValor("");
    setNuevoKilos("");
    setNuevoGrado("");
    setNuevoDestino("");
    setNuevoTipo("TRATAMIENTO");
  }

  // ======= eliminar registro =======
  async function handleEliminarRegistro(idRegistro) {
    if (!window.confirm("¿Seguro que quieres eliminar este registro?")) return;

    const auth = getAuthSafe();
    if (!auth) return;
    const { token, slug } = auth;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}/registros/${idRegistro}`,
        {
          method: "DELETE",
          headers: authHeaders(token),
        }
      );

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (res.status !== 204 && !res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al eliminar el registro."
        );
        throw new Error(msg);
      }

      setRegistros((prev) => prev.filter((r) => r.id !== idRegistro));
      if (registroEditId === idRegistro) {
        cancelarEdicionRegistro();
      }

      // Recalculamos IA por si hemos borrado el último muestreo
      cargarEstimacion(auth);
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al eliminar el registro.");
    }
  }

  // ======= eliminar parcela =======
  async function handleEliminarParcela() {
    const auth = getAuthSafe();
    if (!auth) return;
    const { token, slug, role } = auth;

    const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
    if (!isAdmin) {
      alert("Solo un usuario ADMIN puede eliminar parcelas.");
      return;
    }

    if (
      !window.confirm(
        "¿Seguro que quieres eliminar esta parcela? Se borrarán también sus registros."
      )
    )
      return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(token),
        }
      );

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

      window.location.href = "/app/vinedo/parcelas";
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al eliminar la parcela.");
    }
  }

  // ======= guardar cambios parcela (PUT) =======
  async function handleGuardarParcela(e) {
    e.preventDefault();
    setMsgParcelaError("");
    setMsgParcelaOk("");

    if (!editNombre.trim()) {
      setMsgParcelaError("El nombre de la parcela es obligatorio.");
      return;
    }

    if (editSuperficie !== "" && Number(editSuperficie) < 0) {
      setMsgParcelaError("La superficie no puede ser negativa.");
      return;
    }
    if (editAltitud !== "" && Number(editAltitud) < 0) {
      setMsgParcelaError("La altitud no puede ser negativa.");
      return;
    }

    const auth = getAuthSafe();
    if (!auth) return;
    const { token, slug, role } = auth;

    const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
    if (!isAdmin) {
      setMsgParcelaError("Solo un usuario ADMIN puede editar parcelas.");
      return;
    }

    const body = {
      nombre: editNombre.trim(),
      superficieHa: editSuperficie !== "" ? Number(editSuperficie) : null,
      variedadPrincipal: editVariedad.trim() || null,
      altitudM: editAltitud !== "" ? Number(editAltitud) : null,
      notas: editNotas.trim() || null,
    };

    setGuardandoParcela(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${slug}/vinedo/parcelas/${id}`,
        {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify(body),
        }
      );

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al actualizar la parcela."
        );
        throw new Error(msg);
      }

      const data = await res.json();
      setParcela(data);
      setMsgParcelaOk("Parcela actualizada correctamente.");
      setEditandoParcela(false);
    } catch (err) {
      console.error(err);
      setMsgParcelaError(err.message || "Error al actualizar la parcela.");
    } finally {
      setGuardandoParcela(false);
    }
  }

  // ======= render =======
  if (loadingParcela) {
    return <p className="text-center mt-4">Cargando parcela…</p>;
  }

  if (errorParcela) {
    return (
      <p className="text-danger text-center mt-4">
        {errorParcela}
      </p>
    );
  }

  if (!parcela) {
    return (
      <p className="text-center mt-4">
        No se han encontrado datos de la parcela.
      </p>
    );
  }

  const esTratamiento = nuevoTipo === "TRATAMIENTO";
  const esMuestreo = nuevoTipo === "MUESTREO";
  const esVendimia = nuevoTipo === "VENDIMIA";
  const enEdicionRegistro = registroEditId !== null;

  const isAdmin = userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // ======= resumen registros (contadores + kilos + grado medio) =======
  let totalLabor = 0;
  let totalTratamientos = 0;
  let totalMuestreos = 0;
  let totalVendimias = 0;
  let kilosVendimiaTotal = 0;
  let sumaGradoVendimia = 0;
  let conteoGradoVendimia = 0;

  registros.forEach((r) => {
    switch (r.tipo) {
      case "LABOR":
        totalLabor++;
        break;
      case "TRATAMIENTO":
        totalTratamientos++;
        break;
      case "MUESTREO":
        totalMuestreos++;
        break;
      case "VENDIMIA":
        totalVendimias++;
        if (r.kilosUva != null) {
          kilosVendimiaTotal += Number(r.kilosUva);
        }
        if (r.gradoProbable != null) {
          sumaGradoVendimia += Number(r.gradoProbable);
          conteoGradoVendimia++;
        }
        break;
      default:
        break;
    }
  });

  const gradoMedioVendimia =
    conteoGradoVendimia > 0
      ? (sumaGradoVendimia / conteoGradoVendimia).toFixed(1)
      : null;

  // ======= helpers para mostrar la estimación de vendimia =======
  function getInfoRangoVendimia(diasRestantes) {
    const dias = Math.round(diasRestantes ?? 0);

    if (dias <= 0) {
      return {
        dias,
        textoPrincipal: "Listo para vendimiar",
        textoRango: "La vendimia podría realizarse ya.",
        claseTexto: "text-success",
      };
    }

    if (dias <= 3) {
      return {
        dias,
        textoPrincipal: `${dias}`,
        textoRango: "Vendimia inminente (≤ 3 días).",
        claseTexto: "text-danger",
      };
    }

    if (dias <= 10) {
      return {
        dias,
        textoPrincipal: `${dias}`,
        textoRango: "Muy próxima (entre 4 y 10 días).",
        claseTexto: "text-warning",
      };
    }

    if (dias <= 20) {
      return {
        dias,
        textoPrincipal: `${dias}`,
        textoRango: "En seguimiento (entre 11 y 20 días).",
        claseTexto: "text-primary",
      };
    }

    return {
      dias,
      textoPrincipal: `${dias}`,
      textoRango: "Todavía le queda recorrido (> 20 días).",
      claseTexto: "text-muted",
    };
  }


  return (
    <div className="container-fluid px-0">
      {/* CABECERA Y DATOS PARCELA */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">Parcela: {parcela.nombre}</h2>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-3">
            <a href="/app/vinedo" className="btn btn-link p-0">
              ← Volver al listado de parcelas
            </a>

            {/* Botones de parcela SOLO para ADMIN */}
            {isAdmin && (
              <div>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm me-2"
                  onClick={() => setEditandoParcela((v) => !v)}
                >
                  {editandoParcela ? "Cancelar edición" : "Editar parcela"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleEliminarParcela}
                >
                  Eliminar parcela
                </button>
              </div>
            )}
          </div>

          {msgParcelaError && (
            <div className="alert alert-danger py-2">
              {msgParcelaError}
            </div>
          )}
          {msgParcelaOk && (
            <div className="alert alert-success py-2">
              {msgParcelaOk}
            </div>
          )}

          {!editandoParcela ? (
            <div className="row">
              <div className="col-md-6">
                <h6 className="fw-bold">Datos básicos</h6>
                <p className="mb-1">
                  <strong>Superficie:</strong>{" "}
                  {parcela.superficieHa != null
                    ? `${parcela.superficieHa} ha`
                    : "-"}
                </p>
                <p className="mb-1">
                  <strong>Variedad principal:</strong>{" "}
                  {parcela.variedadPrincipal || "-"}
                </p>
                <p className="mb-1">
                  <strong>Altitud:</strong>{" "}
                  {parcela.altitudM != null ? `${parcela.altitudM} m` : "-"}
                </p>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold">Notas</h6>
                <p className="mb-0">
                  {parcela.notas || "Sin notas adicionales."}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGuardarParcela}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label form-label-sm">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Superficie (ha)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm"
                    value={editSuperficie}
                    onChange={(e) => setEditSuperficie(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label form-label-sm">
                    Altitud (m)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    value={editAltitud}
                    onChange={(e) => setEditAltitud(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label form-label-sm">
                    Variedad principal
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={editVariedad}
                    onChange={(e) => setEditVariedad(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label form-label-sm">Notas</label>
                  <textarea
                    rows="3"
                    className="form-control form-control-sm"
                    value={editNotas}
                    onChange={(e) => setEditNotas(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={guardandoParcela}
                >
                  {guardandoParcela ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ESTIMACIÓN VENDIMIA (IA) */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">Estimación de vendimia</h5>
            <span className="badge bg-warning text-dark">
              IA experimental
            </span>
          </div>

          {loadingEstimacion && (
            <p className="small mb-0">Calculando estimación…</p>
          )}

          {!loadingEstimacion && errorEstimacion && (
            <p className="small text-muted mb-0">{errorEstimacion}</p>
          )}

          {!loadingEstimacion && !errorEstimacion && estimacion && (
            <>
              <div className="row g-3 align-items-center">
                <div className="col-md-4">
                  <div className="small text-muted mb-1">
                    Basado en el último muestreo:
                  </div>
                  <div className="fw-semibold">
                    {new Date(
                      estimacion.fechaMuestreo
                    ).toLocaleDateString("es-ES")}
                  </div>
                  <div className="small">
                    {estimacion.parametro}:{" "}
                    <strong>{estimacion.valorParametro}</strong>
                    {estimacion.gradoProbableMuestreo != null && (
                      <>
                        {" · Grado estimado: "}
                        <strong>
                          {estimacion.gradoProbableMuestreo} º
                        </strong>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-md-4 text-center">
                  <div className="small text-muted mb-1">
                    Días estimados hasta vendimia
                  </div>

                  {(() => {
                    const info = getInfoRangoVendimia(estimacion.diasRestantes);

                    return (
                      <>
                        <div className={`display-6 fw-bold ${info.claseTexto}`}>
                          {info.textoPrincipal}
                        </div>
                        {info.dias > 0 && (
                          <div className="small text-muted">
                            ({info.dias} día{info.dias === 1 ? "" : "s"})
                          </div>
                        )}
                        <div className="small text-muted mt-1">
                          {info.textoRango}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="col-md-4 text-md-end">
                  <div className="small text-muted">Fecha recomendada</div>
                  <div className="h5 mb-0">
                    {new Date(
                      estimacion.fechaVendimiaEstimada
                    ).toLocaleDateString("es-ES")}
                  </div>
                </div>
              </div>
              <p className="small text-muted mt-2 mb-0">
                Estimación automática basada en tus muestreos. Revísala siempre
                con tu criterio técnico en campo.
              </p>
            </>
          )}
        </div>
      </div>

      {/* NUEVO / EDITAR REGISTRO */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">
              {enEdicionRegistro
                ? "Editar registro de viñedo"
                : "Nuevo registro de viñedo"}
            </h5>
            {enEdicionRegistro && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={cancelarEdicionRegistro}
              >
                Cancelar edición
              </button>
            )}
          </div>

          {errorCrear && (
            <div className="alert alert-danger py-2">{errorCrear}</div>
          )}
          {okCrear && (
            <div className="alert alert-success py-2">{okCrear}</div>
          )}

          <form onSubmit={handleCrear}>
            <div className="row g-3 align-items-end">
              <div className="col-sm-3 col-md-2">
                <label className="form-label form-label-sm">
                  Tipo *
                </label>
                <select
                  className="form-select form-select-sm"
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                >
                  <option value="TRATAMIENTO">TRATAMIENTO</option>
                  <option value="MUESTREO">MUESTREO</option>
                  <option value="VENDIMIA">VENDIMIA</option>
                  <option value="LABOR">LABOR</option>
                </select>
              </div>

              <div className="col-sm-3 col-md-2">
                <label className="form-label form-label-sm">Fecha *</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={nuevoFecha}
                  onChange={(e) => setNuevoFecha(e.target.value)}
                />
              </div>

              <div className="col-sm-6 col-md-4">
                <label className="form-label form-label-sm">
                  Descripción
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={nuevoDescripcion}
                  onChange={(e) => setNuevoDescripcion(e.target.value)}
                  placeholder="Ej: Tratamiento contra oídio…"
                />
              </div>

              {esTratamiento && (
                <>
                  <div className="col-sm-6 col-md-3">
                    <label className="form-label form-label-sm">
                      Producto fitosanitario *
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={nuevoProducto}
                      onChange={(e) => setNuevoProducto(e.target.value)}
                    />
                  </div>

                  <div className="col-sm-6 col-md-2">
                    <label className="form-label form-label-sm">
                      Plazo seguridad (días)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      value={nuevoPlazo}
                      onChange={(e) => setNuevoPlazo(e.target.value)}
                    />
                  </div>
                </>
              )}

              {esMuestreo && (
                <>
                  <div className="col-sm-6 col-md-3">
                    <label className="form-label form-label-sm">
                      Parámetro *
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={nuevoParametro}
                      onChange={(e) => setNuevoParametro(e.target.value)}
                      placeholder="Ej: Brix, pH…"
                    />
                  </div>

                  <div className="col-sm-6 col-md-2">
                    <label className="form-label form-label-sm">
                      Valor *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control form-control-sm"
                      value={nuevoValor}
                      onChange={(e) => setNuevoValor(e.target.value)}
                    />
                  </div>

                  <div className="col-sm-6 col-md-2">
                    <label className="form-label form-label-sm">
                      Grado probable (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control form-control-sm"
                      value={nuevoGrado}
                      onChange={(e) => setNuevoGrado(e.target.value)}
                    />
                  </div>
                </>
              )}

              {esVendimia && (
                <>
                  <div className="col-sm-6 col-md-2">
                    <label className="form-label form-label-sm">
                      Kilos uva *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-sm"
                      value={nuevoKilos}
                      onChange={(e) => setNuevoKilos(e.target.value)}
                    />
                  </div>

                  <div className="col-sm-6 col-md-2">
                    <label className="form-label form-label-sm">
                      Grado probable *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control form-control-sm"
                      value={nuevoGrado}
                      onChange={(e) => setNuevoGrado(e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label form-label-sm">
                      Destino
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={nuevoDestino}
                      onChange={(e) => setNuevoDestino(e.target.value)}
                      placeholder="Ej: Depósito 1, vino joven…"
                    />
                  </div>
                </>
              )}

              <div className="col-12 col-sm-3 col-md-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm w-100"
                  disabled={creando}
                >
                  {creando
                    ? "Guardando…"
                    : enEdicionRegistro
                      ? "Guardar cambios"
                      : "Guardar registro"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* LISTADO REGISTROS */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Listado de registros</h5>

          {/* Resumen de registros en tarjetas */}
          <div className="mb-3">
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <div className="border rounded-3 p-2 d-flex justify-content-between align-items-center small">
                  <span className="text-muted">Labores</span>
                  <span className="badge bg-secondary">{totalLabor}</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="border rounded-3 p-2 d-flex justify-content-between align-items-center small">
                  <span className="text-muted">Tratamientos</span>
                  <span className="badge bg-primary">{totalTratamientos}</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="border rounded-3 p-2 d-flex justify-content-between align-items-center small">
                  <span className="text-muted">Muestreos</span>
                  <span className="badge bg-info text-dark">
                    {totalMuestreos}
                  </span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="border rounded-3 p-2 d-flex justify-content-between align-items-center small">
                  <span className="text-muted">Vendimias</span>
                  <span className="badge bg-success">{totalVendimias}</span>
                </div>
              </div>
            </div>

            <div className="row g-2 mt-2">
              <div className="col-12 col-md-6">
                <div className="border rounded-3 p-2 small d-flex justify-content-between align-items-center">
                  <span className="text-muted">Kilos totales vendimia</span>
                  <strong>
                    {kilosVendimiaTotal > 0
                      ? `${kilosVendimiaTotal} kg`
                      : "-"}
                  </strong>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="border rounded-3 p-2 small d-flex justify-content-between align-items-center">
                  <span className="text-muted">Grado medio vendimia</span>
                  <strong>
                    {gradoMedioVendimia != null
                      ? `${gradoMedioVendimia} º`
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <form
            className="row g-2 align-items-end mb-3"
            onSubmit={handleBuscar}
          >
            <div className="col-sm-3 col-md-2">
              <label className="form-label form-label-sm">Tipo</label>
              <select
                className="form-select form-select-sm"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="LABOR">LABOR</option>
                <option value="TRATAMIENTO">TRATAMIENTO</option>
                <option value="MUESTREO">MUESTREO</option>
                <option value="VENDIMIA">VENDIMIA</option>
              </select>
            </div>

            <div className="col-sm-3 col-md-2">
              <label className="form-label form-label-sm">Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
              />
            </div>

            <div className="col-sm-3 col-md-2">
              <label className="form-label form-label-sm">Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
              />
            </div>

            <div className="col-sm-6 col-md-4 d-flex gap-2 mt-2 mt-sm-0">
              <button
                type="submit"
                className="btn btn-outline-primary btn-sm"
              >
                Buscar
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleLimpiarFiltros}
              >
                Limpiar filtros
              </button>
            </div>
          </form>

          {loadingRegistros && <p>Cargando registros…</p>}

          {errorRegistros && (
            <p className="text-danger">{errorRegistros}</p>
          )}

          {!loadingRegistros && !errorRegistros && (
            <>
              {registros.length === 0 ? (
                <p>No hay registros que coincidan con los filtros.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Producto / Parámetro</th>
                        <th>Kilos / Valor</th>
                        <th>Grado probable</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registros.map((reg) => (
                        <tr key={reg.id}>
                          <td>{reg.fecha || "-"}</td>
                          <td>{reg.tipo || "-"}</td>
                          <td>{reg.descripcion || "-"}</td>
                          <td>
                            {reg.productoFitosanitario ||
                              reg.parametro ||
                              "-"}
                          </td>
                          <td>
                            {reg.kilosUva != null
                              ? `${reg.kilosUva} kg`
                              : reg.valorParametro != null
                                ? reg.valorParametro
                                : "-"}
                          </td>
                          <td>
                            {reg.gradoProbable != null
                              ? `${reg.gradoProbable} º`
                              : "-"}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm me-1"
                              onClick={() => handleEditarRegistro(reg)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() =>
                                handleEliminarRegistro(reg.id)
                              }
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
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

export default ParcelaDetalle;
