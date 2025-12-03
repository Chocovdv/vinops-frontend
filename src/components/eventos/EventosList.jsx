// src/components/eventos/EventosList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";
import {
  getCurrentLang,
  txtLista,
  EVENT_TYPE_CODES,
  getEventTypeLabel,
} from "../../lib/i18nEventos";

function EventosList() {
  const [lang, setLang] = useState("es");
  const t = txtLista(lang);

  const [authData, setAuthData] = useState(null);

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState("TODOS");
  const [desdeFiltro, setDesdeFiltro] = useState("");
  const [hastaFiltro, setHastaFiltro] = useState("");
  const [textoFiltro, setTextoFiltro] = useState("");

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
  }, []);

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  useEffect(() => {
    if (!authData) return;

    const cargar = async () => {
      const { token, slug } = authData;

      let url = `${API_BASE_URL}/api/${slug}/eventos`;
      const params = [];

      if (tipoFiltro && tipoFiltro !== "TODOS") {
        params.push(`tipo=${encodeURIComponent(tipoFiltro)}`);
      }
      if (desdeFiltro) {
        params.push(`desde=${desdeFiltro}`);
      }
      if (hastaFiltro) {
        params.push(`hasta=${hastaFiltro}`);
      }
      if (textoFiltro.trim() !== "") {
        params.push(`q=${encodeURIComponent(textoFiltro.trim())}`);
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      setLoading(true);
      setError("");

      try {
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
          throw new Error(text || `${t.errorLoadFallback} (${resp.status})`);
        }

        const data = await resp.json();
        setEventos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || t.errorLoadFallback);
      } finally {
        setLoading(false);
      }
    };

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, tipoFiltro, desdeFiltro, hastaFiltro, textoFiltro, lang]);

  function handleNuevoEvento() {
    window.location.href = "/app/eventos/nuevo";
  }

  function irADetalle(id) {
    window.location.href = `/app/eventos/${id}`;
  }

  function handleLimpiarFiltros() {
    setTipoFiltro("TODOS");
    setDesdeFiltro("");
    setHastaFiltro("");
    setTextoFiltro("");
  }

  async function handleEliminarEvento(id) {
    if (!authData) return;

    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/eventos/${id}`;

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
        throw new Error(text || `${t.errorDeleteFallback} (${resp.status})`);
      }

      setEventos((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
      alert(err.message || t.errorDeleteFallback);
    }
  }

  const resumen = useMemo(() => {
    const total = eventos.length;
    const porTipo = {
      CATA: eventos.filter((e) => e.tipo === "CATA").length,
      FERIA: eventos.filter((e) => e.tipo === "FERIA").length,
      VISITA: eventos.filter((e) => e.tipo === "VISITA").length,
      OTRO: eventos.filter((e) => e.tipo === "OTRO").length,
    };
    return { total, porTipo };
  }, [eventos]);

  const locale = lang === "en" ? "en-GB" : "es-ES";

  return (
    <div>
      {/* Filtros */}
      <form className="card mb-3" onSubmit={(e) => e.preventDefault()}>
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-md-2">
            <label className="form-label">{t.filters.type}</label>
            <select
              className="form-select form-select-sm"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              {EVENT_TYPE_CODES.map((code) => (
                <option key={code} value={code}>
                  {getEventTypeLabel(code, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label">{t.filters.from}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={desdeFiltro}
              onChange={(e) => setDesdeFiltro(e.target.value)}
            />
          </div>

          <div className="col-6 col-md-2">
            <label className="form-label">{t.filters.to}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={hastaFiltro}
              onChange={(e) => setHastaFiltro(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">{t.filters.search}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={t.filters.searchPlaceholder}
              value={textoFiltro}
              onChange={(e) => setTextoFiltro(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-2 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100 mt-2 mt-md-0"
              onClick={handleLimpiarFiltros}
            >
              {t.filters.clear}
            </button>
          </div>
        </div>
      </form>

      {/* Resumen + botón nuevo */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="small text-muted">
          {t.summary.total} <strong>{resumen.total}</strong> &nbsp;|&nbsp;
          {t.summary.tastings}{" "}
          <strong>{resumen.porTipo.CATA}</strong> &nbsp;|&nbsp;
          {t.summary.fairs}{" "}
          <strong>{resumen.porTipo.FERIA}</strong> &nbsp;|&nbsp;
          {t.summary.visits}{" "}
          <strong>{resumen.porTipo.VISITA}</strong> &nbsp;|&nbsp;
          {t.summary.others}{" "}
          <strong>{resumen.porTipo.OTRO}</strong>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={handleNuevoEvento}
        >
          {t.buttons.new}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p>{t.loading}</p>}

      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>{t.table.date}</th>
                <th>{t.table.type}</th>
                <th>{t.table.name}</th>
                <th>{t.table.location}</th>
                <th>{t.table.description}</th>
                <th style={{ width: "140px" }}>{t.table.actions}</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    {t.table.noResults}
                  </td>
                </tr>
              )}

              {eventos.map((e) => {
                let fechaStr = "";
                if (e.fecha) {
                  try {
                    fechaStr = new Date(e.fecha).toLocaleString(locale);
                  } catch {
                    fechaStr = e.fecha;
                  }
                }

                return (
                  <tr key={e.id}>
                    <td>{fechaStr || "-"}</td>
                    <td>{getEventTypeLabel(e.tipo, lang)}</td>
                    <td>{e.nombre || "-"}</td>
                    <td>{e.ubicacion || "-"}</td>
                    <td>
                      <small>{e.descripcion || "-"}</small>
                    </td>
                    <td>
                      <div
                        className="btn-group btn-group-sm"
                        role="group"
                        aria-label="Acciones evento"
                      >
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => irADetalle(e.id)}
                        >
                          {t.buttons.viewEdit}
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleEliminarEvento(e.id)}
                          >
                            {t.buttons.delete}
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
    </div>
  );
}

export default EventosList;
