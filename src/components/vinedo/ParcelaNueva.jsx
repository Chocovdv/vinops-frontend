import React, { useState, useEffect } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";

function NuevaParcela() {
  const [authData, setAuthData] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    superficieHa: "",
    variedadPrincipal: "",
    altitudM: "",
    notas: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Solo ADMIN puede crear parcelas
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);

    const isAdmin = auth.role === "ADMIN" || auth.role === "ROLE_ADMIN";
    if (!isAdmin) {
      alert("Solo un usuario ADMIN puede crear parcelas.");
      window.location.href = "/app/vinedo/parcelas";
    }
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const clone = { ...prev };
      delete clone[name];
      return clone;
    });
  }

  function validarFormulario() {
    const errors = {};

    const nombreTrim = form.nombre.trim();
    const superficie = form.superficieHa !== "" ? Number(form.superficieHa) : null;
    const altitud = form.altitudM !== "" ? Number(form.altitudM) : null;

    if (!nombreTrim) {
      errors.nombre = "El nombre de la parcela es obligatorio.";
    }

    if (superficie !== null && (isNaN(superficie) || superficie < 0)) {
      errors.superficieHa = "La superficie no puede ser negativa.";
    }

    if (altitud !== null && (isNaN(altitud) || altitud < 0)) {
      errors.altitudM = "La altitud no puede ser negativa.";
    }

    return errors;
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    const errors = validarFormulario();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Por favor corrige los campos marcados en rojo.");
      return;
    }

    const auth = authData || getAuthDataOrRedirect();
    if (!auth) return;

    const { token, slug, role } = auth;
    const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";

    if (!isAdmin) {
      setError("No tienes permisos para crear parcelas (solo ADMIN).");
      return;
    }

    const body = {
      nombre: form.nombre.trim(),
      superficieHa:
        form.superficieHa !== "" ? Number(form.superficieHa) : null,
      variedadPrincipal:
        form.variedadPrincipal.trim() !== ""
          ? form.variedadPrincipal.trim()
          : null,
      altitudM: form.altitudM !== "" ? Number(form.altitudM) : null,
      notas: form.notas.trim() !== "" ? form.notas.trim() : null,
    };

    setCreando(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/${slug}/vinedo/parcelas`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(body),
        }
      );

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        throw new Error(
          "No tienes permisos para crear parcelas (solo ADMIN)."
        );
      }
      if (!res.ok) {
        const msg = await extraerMensajeError(
          res,
          "Error al crear la parcela."
        );
        throw new Error(msg);
      }

      await res.json();
      setOk("Parcela creada correctamente.");

      setTimeout(() => {
        window.location.href = "/app/vinedo";
      }, 800);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al crear la parcela.");
    } finally {
      setCreando(false);
    }
  }

  function handleVolver() {
    window.location.href = "/app/vinedo";
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            type="button"
            className="btn btn-link btn-sm px-0"
            onClick={handleVolver}
          >
            &larr; Volver al listado de parcelas
          </button>
          <h2 className="h4 mb-0 mt-1">Nueva parcela</h2>
          <div className="small text-muted">
            Define los datos básicos de la parcela (nombre, superficie,
            variedad…).
          </div>
        </div>
      </div>

      <div className="card parcela-detalle-card">
        <div className="card-body">
          {error && (
            <div className="alert alert-danger py-2 mb-2">{error}</div>
          )}
          {ok && (
            <div className="alert alert-success py-2 mb-2">{ok}</div>
          )}

          <form className="parcela-form" onSubmit={handleSubmit} noValidate>
            <div className="mb-3 campo">
              <label htmlFor="nombre" className="form-label">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                className={`form-control ${
                  formErrors.nombre ? "is-invalid" : ""
                }`}
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: Ladera de Poniente"
                required
              />
              {formErrors.nombre && (
                <div className="invalid-feedback">{formErrors.nombre}</div>
              )}
            </div>

            <div className="mb-3 campo">
              <label htmlFor="superficieHa" className="form-label">
                Superficie (ha)
              </label>
              <input
                id="superficieHa"
                name="superficieHa"
                type="number"
                min="0"
                step="0.01"
                className={`form-control ${
                  formErrors.superficieHa ? "is-invalid" : ""
                }`}
                value={form.superficieHa}
                onChange={handleChange}
              />
              {formErrors.superficieHa && (
                <div className="invalid-feedback">
                  {formErrors.superficieHa}
                </div>
              )}
            </div>

            <div className="mb-3 campo">
              <label htmlFor="variedadPrincipal" className="form-label">
                Variedad principal
              </label>
              <input
                id="variedadPrincipal"
                name="variedadPrincipal"
                type="text"
                className="form-control"
                value={form.variedadPrincipal}
                onChange={handleChange}
                placeholder="Ej: Mencía"
              />
            </div>

            <div className="mb-3 campo">
              <label htmlFor="altitudM" className="form-label">
                Altitud (m)
              </label>
              <input
                id="altitudM"
                name="altitudM"
                type="number"
                min="0"
                className={`form-control ${
                  formErrors.altitudM ? "is-invalid" : ""
                }`}
                value={form.altitudM}
                onChange={handleChange}
              />
              {formErrors.altitudM && (
                <div className="invalid-feedback">
                  {formErrors.altitudM}
                </div>
              )}
            </div>

            <div className="mb-3 campo campo-descripcion">
              <label htmlFor="notas" className="form-label">
                Notas
              </label>
              <textarea
                id="notas"
                name="notas"
                rows="3"
                className="form-control"
                value={form.notas}
                onChange={handleChange}
                placeholder="Suelos, exposición, accesos..."
              />
            </div>

            <div className="campo campo-boton d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creando}
              >
                {creando ? "Guardando…" : "Guardar parcela"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NuevaParcela;
