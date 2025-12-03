// src/components/eventos/EventoNuevo.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";
import EventoForm from "./EventoForm.jsx";
import { getCurrentLang, txtNuevo } from "../../lib/i18nEventos";

function EventoNuevo() {
  const [lang, setLang] = useState("es");
  const tNuevo = txtNuevo(lang);

  const [authData, setAuthData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
  }, []);

  async function handleCreate(payload) {
    if (!authData) return;

    setSaving(true);
    setError("");

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/eventos`;

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        let msg = `${tNuevo.errorCreateFallback} (${resp.status})`;
        try {
          const text = await resp.text();
          if (text) msg = text;
        } catch (_) {}
        throw new Error(msg);
      }

      const creado = await resp.json();
      if (creado && creado.id) {
        window.location.href = `/app/eventos/${creado.id}`;
      } else {
        window.location.href = "/app/eventos";
      }
    } catch (err) {
      console.error(err);
      setError(err.message || tNuevo.errorCreateFallback);
    } finally {
      setSaving(false);
    }
  }

  if (!authData) {
    return null;
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <EventoForm
          mode="create"
          initialData={null}
          onSubmit={handleCreate}
          loading={saving}
        />
      </div>
    </div>
  );
}

export default EventoNuevo;
