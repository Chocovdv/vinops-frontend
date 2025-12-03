// src/components/comercial/EntregasList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function getEstadoBadgeClass(estado) {
  switch (estado) {
    case "BORRADOR":
      return "badge bg-secondary";
    case "CONFIRMADO":
      return "badge bg-warning text-dark";
    case "ENTREGADO":
      return "badge bg-success";
    case "ANULADO":
      return "badge bg-danger";
    default:
      return "badge bg-light text-dark";
  }
}

function formatearFechaCorta(iso) {
  if (!iso) return "";
  if (iso.length >= 10) {
    return iso.substring(0, 10);
  }
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

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

function EntregasList() {
  const [authData, setAuthData] = useState(null);

  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [textoFiltro, setTextoFiltro] = useState("");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [soloConPrecios, setSoloConPrecios] = useState(false);

  // refs para controlar primera carga y debounce
  const hasLoadedOnceRef = useRef(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
  }, []);

  // Cargar entregas automáticamente cuando cambian los filtros
  useEffect(() => {
    if (!authData) return;

    // Limpiamos cualquier timeout previo
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Primera carga: sin debounce
    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      cargarEntregas();
      return;
    }

    // Resto de cambios: debounce de 500ms
    debounceRef.current = setTimeout(() => {
      cargarEntregas();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, estadoFiltro, textoFiltro, desdeFiltro, hastaFiltro, soloConPrecios]);

  async function cargarEntregas() {
    if (!authData) return;
    const { token, slug } = authData;

    const filtros = {
      estado: estadoFiltro,
      texto: textoFiltro,
      desde: desdeFiltro,
      hasta: hastaFiltro,
      soloConPrecios,
    };

    setLoading(true);
    setError("");

    try {
      const url = new URL(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/filtrado`
      );

      if (filtros.estado && filtros.estado !== "TODOS") {
        url.searchParams.append("estado", filtros.estado);
      }
      if (filtros.texto && filtros.texto.trim() !== "") {
        url.searchParams.append("q", filtros.texto.trim());
      }
      if (filtros.desde) {
        url.searchParams.append("desde", filtros.desde);
      }
      if (filtros.hasta) {
        url.searchParams.append("hasta", filtros.hasta);
      }
      if (filtros.soloConPrecios) {
        url.searchParams.append("soloConPrecios", "true");
      }

      const resp = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw await buildErrorFromResponse(resp);
      }

      const data = await resp.json();
      setEntregas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al cargar las entregas. Inténtalo de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLimpiarFiltros() {
    setEstadoFiltro("TODOS");
    setTextoFiltro("");
    setDesdeFiltro("");
    setHastaFiltro("");
    setSoloConPrecios(false);
    // No llamamos manualmente a cargarEntregas: el useEffect se disparará solo
  }

  const entregasOrdenadas = useMemo(() => {
    const copia = [...entregas];
    copia.sort((a, b) => {
      const fa = a.fecha || "";
      const fb = b.fecha || "";
      if (fa === fb) {
        return (b.id || 0) - (a.id || 0);
      }
      return fb.localeCompare(fa); // ISO → orden correcto
    });
    return copia;
  }, [entregas]);

  const resumenEstados = useMemo(() => {
    const resumen = {
      BORRADOR: 0,
      CONFIRMADO: 0,
      ENTREGADO: 0,
      ANULADO: 0,
    };
    for (const e of entregas) {
      if (e.estado && resumen[e.estado] != null) {
        resumen[e.estado]++;
      }
    }
    return resumen;
  }, [entregas]);

  return (
    <div className="card">
      <div className="card-body">
        {/* Cabecera + botón nueva entrega */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h4 mb-0">Entregas / albaranes</h1>
          <a
            href="/app/comercial/entregas/nueva"
            className="btn btn-sm btn-primary"
          >
            + Nueva entrega
          </a>
        </div>

        {/* Resumen de estados */}
        <div className="mb-1">
          <span className="me-3">
            <span className="badge bg-secondary me-1">Borrador</span>
            {resumenEstados.BORRADOR}
          </span>
          <span className="me-3">
            <span className="badge bg-warning text-dark me-1">
              Confirmado
            </span>
            {resumenEstados.CONFIRMADO}
          </span>
          <span className="me-3">
            <span className="badge bg-success me-1">Entregado</span>
            {resumenEstados.ENTREGADO}
          </span>
          <span>
            <span className="badge bg-danger me-1">Anulado</span>
            {resumenEstados.ANULADO}
          </span>
        </div>

        <p className="text-muted small mb-3">
          Mostrando{" "}
          <strong>{entregasOrdenadas.length}</strong>{" "}
          {entregasOrdenadas.length === 1 ? "entrega" : "entregas"} que
          cumplen los filtros.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Filtros (sin botón Buscar, se aplica solo) */}
        <form
          className="row g-3 align-items-end mb-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="col-12 col-md-3">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ENTREGADO">Entregado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nº albarán, cliente, observaciones..."
              value={textoFiltro}
              onChange={(e) => setTextoFiltro(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-control"
              value={desdeFiltro}
              onChange={(e) => setDesdeFiltro(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-control"
              value={hastaFiltro}
              onChange={(e) => setHastaFiltro(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-2">
            <div className="form-check mb-1">
              <input
                type="checkbox"
                id="soloConPrecios"
                className="form-check-input"
                checked={soloConPrecios}
                onChange={(e) => setSoloConPrecios(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="soloConPrecios">
                Solo con precios
              </label>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </button>
            </div>
          </div>
        </form>

        {/* Tabla de resultados */}
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Nº albarán</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Con precios</th>
                <th>Observaciones</th>
                <th style={{ width: "1%" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    Cargando entregas...
                  </td>
                </tr>
              ) : entregasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No hay entregas que cumplan los filtros.
                  </td>
                </tr>
              ) : (
                entregasOrdenadas.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{formatearFechaCorta(e.fecha)}</td>
                    <td>{e.numeroAlbaran || "—"}</td>
                    <td>{e.clienteNombre || "-"}</td>
                    <td>
                      <span className={getEstadoBadgeClass(e.estado)}>
                        {e.estado}
                      </span>
                    </td>
                    <td>{e.conPrecios ? "Sí" : "No"}</td>
                    <td
                      className="text-truncate"
                      style={{ maxWidth: "240px" }}
                    >
                      {e.observaciones || "—"}
                    </td>
                    <td>
                      <a
                        href={`/app/comercial/entregas/${e.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Ver/Editar
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EntregasList;
