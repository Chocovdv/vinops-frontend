// src/components/eventos/EventosProximo.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";
import { getCurrentLang, txtProximo } from "../../lib/i18nEventos";

function EventosProximo() {
  const [lang, setLang] = useState("es");
  const t = txtProximo(lang);

  const [authData, setAuthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proximoEvento, setProximoEvento] = useState(null);

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarProximo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const cargarProximo = async () => {
    setLoading(true);
    setError("");

    const { token, slug } = authData;

    try {
      const hoy = new Date().toISOString().slice(0, 10);

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/eventos?desde=${hoy}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!resp.ok) {
        throw new Error("Error HTTP " + resp.status);
      }

      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        setProximoEvento(null);
        return;
      }

      const futuros = data
        .map((e) => {
          if (!e.fecha) return null;
          const d = new Date(e.fecha);
          if (Number.isNaN(d.getTime())) return null;
          return { ...e, fechaDate: d };
        })
        .filter((e) => e !== null)
        .sort((a, b) => a.fechaDate - b.fechaDate);

      setProximoEvento(futuros[0] || null);
    } catch (err) {
      console.error(err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (!authData) return null;

  const locale = lang === "en" ? "en-GB" : "es-ES";

  let fechaStr = "";
  if (proximoEvento && proximoEvento.fecha) {
    try {
      fechaStr = new Date(proximoEvento.fecha).toLocaleString(locale);
    } catch {
      fechaStr = proximoEvento.fecha;
    }
  }

  const irADetalle = () => {
    if (!proximoEvento) return;
    window.location.href = `/app/eventos/${proximoEvento.id}`;
  };

  const irANuevo = () => {
    window.location.href = "/app/eventos/nuevo";
  };

  return (
    <div className="card card-proximo-evento mb-3">
      <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-start">
        <div className="me-md-3">
          <h6 className="card-subtitle mb-2 text-muted">
            {loading ? t.searching : t.title}
          </h6>

          {error && (
            <p className="mb-0 text-danger">
              <small>{error}</small>
            </p>
          )}

          {!loading && !error && !proximoEvento && (
            <p className="mb-0">{t.noUpcoming}</p>
          )}

          {!loading && !error && proximoEvento && (
            <>
              <p className="mb-1">
                <strong>{proximoEvento.nombre}</strong>{" "}
                {proximoEvento.tipo && (
                  <span className="text-muted">({proximoEvento.tipo})</span>
                )}
              </p>
              <p className="mb-1 small">
                {fechaStr}
                {proximoEvento.ubicacion &&
                  ` – ${proximoEvento.ubicacion}`}
              </p>
              {proximoEvento.descripcion && (
                <p className="mb-0 small text-muted">
                  {proximoEvento.descripcion}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-3 mt-md-0">
          {proximoEvento ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={irADetalle}
            >
              {t.btnViewEdit}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={irANuevo}
            >
              {t.btnNew}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventosProximo;
