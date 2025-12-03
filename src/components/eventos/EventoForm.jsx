// src/components/eventos/EventoForm.jsx
import React, { useEffect, useState } from "react";
import {
  getCurrentLang,
  txtForm,
  getEventTypeLabel,
} from "../../lib/i18nEventos";

const VALID_EVENT_TYPES = ["CATA", "FERIA", "VISITA", "OTRO"];

// Convierte "2025-04-15T19:00:00" -> "2025-04-15T19:00"
function toInputDateTimeLocal(value) {
  if (!value) return "";
  if (value.includes("T")) {
    return value.slice(0, 16);
  }
  return value;
}

function EventoForm({ mode, initialData, onSubmit, loading }) {
  const [lang, setLang] = useState("es");
  const t = txtForm(lang);

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    tipo: "",
    nombre: "",
    fecha: "",
    ubicacion: "",
    descripcion: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        tipo: initialData.tipo || "",
        nombre: initialData.nombre || "",
        fecha: toInputDateTimeLocal(initialData.fecha),
        ubicacion: initialData.ubicacion || "",
        descripcion: initialData.descripcion || "",
      });
      setFormErrors({});
      setValidationError("");
    }
  }, [initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const clone = { ...prev };
      delete clone[name];
      return clone;
    });
    setValidationError("");
  }

  function validarFormulario() {
    const errors = {};

    // TIPO
    if (!form.tipo) {
      errors.tipo = t.validation.typeRequired;
    } else if (!VALID_EVENT_TYPES.some((v) => v === form.tipo)) {
      errors.tipo = t.validation.typeInvalid;
    }

    // NOMBRE
    const nombreTrim = form.nombre.trim();
    if (!nombreTrim) {
      errors.nombre = t.validation.nameRequired;
    } else if (nombreTrim.length < 3) {
      errors.nombre = t.validation.nameMin;
    }

    // FECHA
    if (!form.fecha) {
      errors.fecha = t.validation.dateRequired;
    } else {
      let fechaIso = form.fecha;
      if (fechaIso.length === 16) {
        fechaIso = `${fechaIso}:00`;
      }
      const d = new Date(fechaIso);
      if (Number.isNaN(d.getTime())) {
        errors.fecha = t.validation.dateInvalid;
      }
    }

    // UBICACIÓN
    const ubicTrim = form.ubicacion.trim();
    if (ubicTrim && ubicTrim.length < 3) {
      errors.ubicacion = t.validation.locationMin;
    }

    // DESCRIPCIÓN
    const descTrim = form.descripcion.trim();
    if (descTrim.length > 1000) {
      errors.descripcion = t.validation.descriptionMax;
    }

    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();

    const errors = validarFormulario();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setValidationError(t.validation.general);
      return;
    }

    let fechaIso = form.fecha;
    if (fechaIso.length === 16) {
      fechaIso = `${fechaIso}:00`;
    }

    const payload = {
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      fecha: fechaIso,
      ubicacion: form.ubicacion.trim() || null,
      descripcion: form.descripcion.trim() || null,
    };

    onSubmit && onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError && (
        <div className="alert alert-danger py-2 mb-3">
          {validationError}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label">
            {t.labels.type} <span className="text-danger">*</span>
          </label>
          <select
            name="tipo"
            className={`form-select ${
              formErrors.tipo ? "is-invalid" : ""
            }`}
            value={form.tipo}
            onChange={handleChange}
          >
            <option value="">{t.placeholders.type}</option>
            {VALID_EVENT_TYPES.map((code) => (
              <option key={code} value={code}>
                {getEventTypeLabel(code, lang)}
              </option>
            ))}
          </select>
          {formErrors.tipo && (
            <div className="invalid-feedback">{formErrors.tipo}</div>
          )}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">
            {t.labels.dateTime} <span className="text-danger">*</span>
          </label>
          <input
            type="datetime-local"
            name="fecha"
            className={`form-control ${
              formErrors.fecha ? "is-invalid" : ""
            }`}
            value={form.fecha}
            onChange={handleChange}
          />
          {formErrors.fecha && (
            <div className="invalid-feedback">{formErrors.fecha}</div>
          )}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label">{t.labels.location}</label>
          <input
            type="text"
            name="ubicacion"
            className={`form-control ${
              formErrors.ubicacion ? "is-invalid" : ""
            }`}
            value={form.ubicacion}
            onChange={handleChange}
            placeholder={t.placeholders.location}
          />
          {formErrors.ubicacion && (
            <div className="invalid-feedback">
              {formErrors.ubicacion}
            </div>
          )}
        </div>

        <div className="col-12">
          <label className="form-label">
            {t.labels.name} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            className={`form-control ${
              formErrors.nombre ? "is-invalid" : ""
            }`}
            value={form.nombre}
            onChange={handleChange}
            placeholder={t.placeholders.name}
          />
          {formErrors.nombre && (
            <div className="invalid-feedback">{formErrors.nombre}</div>
          )}
        </div>

        <div className="col-12">
          <label className="form-label">{t.labels.description}</label>
          <textarea
            name="descripcion"
            className={`form-control ${
              formErrors.descripcion ? "is-invalid" : ""
            }`}
            rows="4"
            value={form.descripcion}
            onChange={handleChange}
            placeholder={t.placeholders.description}
          />
          {formErrors.descripcion && (
            <div className="invalid-feedback">
              {formErrors.descripcion}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 d-flex justify-content-between">
        <a href="/app/eventos" className="btn btn-outline-secondary">
          {t.buttons.back}
        </a>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading
            ? t.buttons.saving
            : isEdit
            ? t.buttons.update
            : t.buttons.create}
        </button>
      </div>
    </form>
  );
}

export default EventoForm;
