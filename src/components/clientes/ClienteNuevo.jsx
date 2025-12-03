// src/components/clientes/ClienteNuevo.jsx
import React, { useState, useEffect } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function ClienteNuevo() {
  const [authData, setAuthData] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    tipo: "PROFESIONAL", // valor por defecto
    cifNif: "",
    telefono: "",
    email: "",
    direccion: "",
    cp: "",
    localidad: "",
    provincia: "",
    pais: "",
    notas: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  const role = authData?.role || authData?.rol || null;
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const clone = { ...prev };
      delete clone[name];
      return clone;
    });
    setValidationError("");
  };

  // VALIDACIONES (misma función que en detalle)
  function validateClienteForm(values) {
    const errors = {};

    const nombre = (values.nombre || "").trim();
    if (!nombre) {
      errors.nombre = "El nombre del cliente es obligatorio.";
    } else if (nombre.length < 3) {
      errors.nombre = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!values.tipo || !["PROFESIONAL", "PARTICULAR"].includes(values.tipo)) {
      errors.tipo = "Selecciona un tipo de cliente válido.";
    }

    const cifNif = (values.cifNif || "").trim();
    if (cifNif && !/^[0-9A-Za-z\-]{8,15}$/.test(cifNif)) {
      errors.cifNif = "El CIF/NIF debe tener entre 8 y 15 caracteres alfanuméricos.";
    }

    const telefono = (values.telefono || "").trim();
    if (telefono) {
      const telNormalized = telefono.replace(/\s+/g, "");
      const phoneRegexES = /^(\+34)?[6789]\d{8}$/;
      if (!phoneRegexES.test(telNormalized)) {
        errors.telefono =
          "Introduce un teléfono español válido de 9 dígitos (ej. 622334455 o +34622334455).";
      }
    }

    const email = (values.email || "").trim();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = "Introduce un email válido.";
      }
    }

    const cp = (values.cp || "").trim();
    if (cp && !/^[0-9]{5}$/.test(cp)) {
      errors.cp = "El código postal debe tener exactamente 5 dígitos.";
    }

    const lettersRegex = /^[\p{L}\s.'-]+$/u;

    function validarCampoTexto(nombreCampo, label) {
      const v = (values[nombreCampo] || "").trim();
      if (!v) return;
      if (v.length < 3) {
        errors[nombreCampo] = `${label} debe tener al menos 3 caracteres.`;
        return;
      }
      if (!lettersRegex.test(v)) {
        errors[nombreCampo] = `${label} solo puede contener letras y espacios.`;
      }
    }

    validarCampoTexto("localidad", "La localidad");
    validarCampoTexto("provincia", "La provincia");
    validarCampoTexto("pais", "El país");

    const direccion = (values.direccion || "").trim();
    if (direccion && direccion.length < 5) {
      errors.direccion = "La dirección es demasiado corta.";
    }
    if (direccion.length > 255) {
      errors.direccion = "La dirección es demasiado larga (máx. 255 caracteres).";
    }

    const notas = (values.notas || "").trim();
    if (notas.length > 1000) {
      errors.notas = "Las notas son demasiado largas (máx. 1000 caracteres).";
    }

    return errors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationError("");

    if (!authData) return;

    if (!isAdmin) {
      setError("No tienes permisos para crear clientes.");
      return;
    }

    const errors = validateClienteForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setValidationError("Por favor, corrige los campos marcados en rojo.");
      return;
    }

    setSaving(true);

    const { token, slug } = authData;

    const body = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      cifNif: form.cifNif?.trim() || null,
      telefono: form.telefono?.trim() || null,
      email: form.email?.trim() || null,
      direccion: form.direccion?.trim() || null,
      cp: form.cp?.trim() || null,
      localidad: form.localidad?.trim() || null,
      provincia: form.provincia?.trim() || null,
      pais: form.pais?.trim() || null,
      notas: form.notas?.trim() || null,
    };

    try {
      const resp = await fetch(`${API_BASE_URL}/api/${slug}/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        let msg = `Error al crear el cliente (${resp.status})`;
        try {
          const text = await resp.text();
          if (text) msg = text;
        } catch (_) {}
        throw new Error(msg);
      }

      const creado = await resp.json();
      window.location.href = `/app/clientes/${creado.id}`;
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al crear el cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    window.location.href = "/app/clientes";
  };

  if (!authData) return null;

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Nuevo cliente</h2>
      </div>

      {validationError && (
        <div className="alert alert-warning" role="alert">
          {validationError}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form
            onSubmit={handleSubmit}
            className="row g-3"
            noValidate
          >
            <div className="col-md-6">
              <label className="form-label">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                className={`form-control ${
                  formErrors.nombre ? "is-invalid" : ""
                }`}
                value={form.nombre}
                onChange={handleChange}
                maxLength={150}
              />
              {formErrors.nombre && (
                <div className="invalid-feedback">{formErrors.nombre}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label">
                Tipo <span className="text-danger">*</span>
              </label>
              <select
                name="tipo"
                className={`form-select ${
                  formErrors.tipo ? "is-invalid" : ""
                }`}
                value={form.tipo}
                onChange={handleChange}
              >
                <option value="PROFESIONAL">Profesional</option>
                <option value="PARTICULAR">Particular</option>
              </select>
              {formErrors.tipo && (
                <div className="invalid-feedback">{formErrors.tipo}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label">CIF/NIF</label>
              <input
                type="text"
                name="cifNif"
                className={`form-control ${
                  formErrors.cifNif ? "is-invalid" : ""
                }`}
                value={form.cifNif}
                onChange={handleChange}
                maxLength={20}
              />
              {formErrors.cifNif && (
                <div className="invalid-feedback">{formErrors.cifNif}</div>
              )}
            </div>

            <div className="col-md-3">
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                name="telefono"
                className={`form-control ${
                  formErrors.telefono ? "is-invalid" : ""
                }`}
                value={form.telefono}
                onChange={handleChange}
                maxLength={30}
              />
              {formErrors.telefono && (
                <div className="invalid-feedback">{formErrors.telefono}</div>
              )}
            </div>

            <div className="col-md-5">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className={`form-control ${
                  formErrors.email ? "is-invalid" : ""
                }`}
                value={form.email}
                onChange={handleChange}
                maxLength={150}
              />
              {formErrors.email && (
                <div className="invalid-feedback">{formErrors.email}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label">País</label>
              <input
                type="text"
                name="pais"
                className={`form-control ${
                  formErrors.pais ? "is-invalid" : ""
                }`}
                value={form.pais}
                onChange={handleChange}
                maxLength={100}
              />
              {formErrors.pais && (
                <div className="invalid-feedback">{formErrors.pais}</div>
              )}
            </div>

            <div className="col-md-8">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                name="direccion"
                className={`form-control ${
                  formErrors.direccion ? "is-invalid" : ""
                }`}
                value={form.direccion}
                onChange={handleChange}
                maxLength={255}
              />
              {formErrors.direccion && (
                <div className="invalid-feedback">
                  {formErrors.direccion}
                </div>
              )}
            </div>

            <div className="col-md-2">
              <label className="form-label">CP</label>
              <input
                type="text"
                name="cp"
                className={`form-control ${
                  formErrors.cp ? "is-invalid" : ""
                }`}
                value={form.cp}
                onChange={handleChange}
                maxLength={10}
              />
              {formErrors.cp && (
                <div className="invalid-feedback">{formErrors.cp}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label">Localidad</label>
              <input
                type="text"
                name="localidad"
                className={`form-control ${
                  formErrors.localidad ? "is-invalid" : ""
                }`}
                value={form.localidad}
                onChange={handleChange}
                maxLength={100}
              />
              {formErrors.localidad && (
                <div className="invalid-feedback">
                  {formErrors.localidad}
                </div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label">Provincia</label>
              <input
                type="text"
                name="provincia"
                className={`form-control ${
                  formErrors.provincia ? "is-invalid" : ""
                }`}
                value={form.provincia}
                onChange={handleChange}
                maxLength={100}
              />
              {formErrors.provincia && (
                <div className="invalid-feedback">
                  {formErrors.provincia}
                </div>
              )}
            </div>

            <div className="col-12">
              <label className="form-label">Notas</label>
              <textarea
                name="notas"
                className={`form-control ${
                  formErrors.notas ? "is-invalid" : ""
                }`}
                rows={3}
                value={form.notas}
                onChange={handleChange}
              />
              {formErrors.notas && (
                <div className="invalid-feedback">{formErrors.notas}</div>
              )}
            </div>

            <div className="col-12 d-flex justify-content-between mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCancelar}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Crear cliente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ClienteNuevo;
