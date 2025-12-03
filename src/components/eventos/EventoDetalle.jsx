// src/components/eventos/EventoDetalle.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";
import EventoForm from "./EventoForm.jsx";
import {
  getCurrentLang,
  txtDetalle,
  getEventTypeLabel,
} from "../../lib/i18nEventos";

function EventoDetalle({ eventoId }) {
  const [lang, setLang] = useState("es");
  const t = txtDetalle(lang);

  const [authData, setAuthData] = useState(null);
  const [evento, setEvento] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editMode, setEditMode] = useState(false);

  // idioma
  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    cargarEvento(auth, eventoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  async function cargarEvento(auth, id) {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { token, slug } = auth;
      const url = `${API_BASE_URL}/api/${slug}/eventos/${id}`;

      const resp = await fetch(url, {
        headers: authHeaders(token),
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
      setEvento(data);
    } catch (err) {
      console.error(err);
      setError(err.message || t.errorLoadFallback);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(payload) {
    if (!authData) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/eventos/${eventoId}`;

      const resp = await fetch(url, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `${t.errorUpdateFallback} (${resp.status})`);
      }

      const actualizado = await resp.json();
      setEvento(actualizado);
      setSuccess(t.updatedOk);
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError(err.message || t.errorUpdateFallback);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!authData) return;

    const isAdmin =
      authData.role === "ADMIN" || authData.role === "ROLE_ADMIN";

    if (!isAdmin) {
      alert(t.onlyAdminDelete);
      return;
    }

    if (!window.confirm(t.confirmDelete)) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/eventos/${eventoId}`;

      const resp = await fetch(url, {
        method: "DELETE",
        headers: authHeaders(token),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `${t.errorDeleteFallback} (${resp.status})`);
      }

      window.location.href = "/app/eventos";
    } catch (err) {
      console.error(err);
      setError(err.message || t.errorDeleteFallback);
    } finally {
      setSaving(false);
    }
  }

  function handleVolverListado() {
    window.location.href = "/app/eventos";
  }

  if (!authData) return null;

  if (loading) return <p>{t.loading}</p>;

  if (!evento && !error) {
    return <div className="alert alert-warning">{t.notFound}</div>;
  }

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  const locale = lang === "en" ? "en-GB" : "es-ES";

  let fechaLegible = "-";
  if (evento?.fecha) {
    try {
      fechaLegible = new Date(evento.fecha).toLocaleString(locale);
    } catch {
      fechaLegible = evento.fecha;
    }
  }

  const tipoLabel = evento?.tipo
    ? getEventTypeLabel(evento.tipo, lang)
    : "-";

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {/* Cabecera con volver + botones */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <button
              type="button"
              className="btn btn-link btn-sm px-0"
              onClick={handleVolverListado}
            >
              {t.backToList}
            </button>
            <h2 className="h5 mb-0 mt-1">
              {t.eventLabel}: {evento?.nombre}
            </h2>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => setEditMode((v) => !v)}
              disabled={saving}
            >
              {editMode ? t.cancelEdit : t.edit}
            </button>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {t.delete}
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {success && (
          <div className="alert alert-success mb-3">{success}</div>
        )}

        {/* MODO LECTURA */}
        {!editMode && (
          <div className="row g-3">
            <div className="col-md-4">
              <h6 className="fw-bold">{t.basicInfo}</h6>
              <p className="mb-1">
                <strong>{t.type}:</strong> {tipoLabel}
              </p>
              <p className="mb-1">
                <strong>{t.dateTime}:</strong> {fechaLegible}
              </p>
              <p className="mb-1">
                <strong>{t.location}:</strong>{" "}
                {evento?.ubicacion || t.locationNotSpecified}
              </p>
            </div>
            <div className="col-md-8">
              <h6 className="fw-bold">{t.descriptionTitle}</h6>
              <p className="mb-0">
                {evento?.descripcion || t.descriptionEmpty}
              </p>
            </div>
          </div>
        )}

        {/* MODO EDICIÓN */}
        {editMode && (
          <EventoForm
            mode="edit"
            initialData={evento}
            onSubmit={handleUpdate}
            loading={saving}
          />
        )}
      </div>
    </div>
  );
}

export default EventoDetalle;
