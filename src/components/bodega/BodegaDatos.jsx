// src/components/bodega/BodegaDatos.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect, authHeaders } from "../../lib/auth";

function BodegaDatos() {
  const [authData, setAuthData] = useState(null);
  const [bodega, setBodega] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    slug: "",
    cif: "",
    telefono: "",
    email: "",
    direccion: "",
    localidad: "",
    provincia: "",
    cp: "",
    pais: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // modo edición (como en productos / lotes)
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    cargarBodega(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  const puedeEditar = isAdmin && modoEdicion;

  function syncFormFromBodega(data) {
    setForm({
      nombre: data.nombre || "",
      slug: data.slug || "",
      cif: data.cif || "",
      telefono: data.telefono || "",
      email: data.email || "",
      direccion: data.direccion || "",
      localidad: data.localidad || "",
      provincia: data.provincia || "",
      cp: data.cp || "",
      pais: data.pais || "",
    });
  }

  // ======================
  // Cargar datos de bodega
  // ======================
  async function cargarBodega(auth) {
    const { token, slug } = auth;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const url = `${API_BASE_URL}/api/bodegas/slug/${encodeURIComponent(slug)}`;

      const resp = await fetch(url, {
        headers: authHeaders(token),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        let msg = "Error al cargar los datos de la bodega.";
        try {
          const data = await resp.json();
          if (data && data.message) {
            msg = data.message;
          }
        } catch {
          try {
            const text = await resp.text();
            if (text) msg = text;
          } catch {
            // ignoramos
          }
        }
        throw new Error(msg);
      }

      const data = await resp.json();
      setBodega(data);
      syncFormFromBodega(data);

      // Refrescar el topbar por si acaso
      try {
        const topbar = document.getElementById("topbar-bodega");
        if (topbar && data.nombre) {
          topbar.textContent = data.nombre;
        }
      } catch {
        // ignoramos
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar los datos de la bodega.");
    } finally {
      setLoading(false);
    }
  }

  // ======================
  // Formulario + validación
  // ======================
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // limpiar el error de ese campo al tocarlo
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
    const slugTrim = form.slug.trim();
    const cifTrim = form.cif.trim();
    const telefonoTrim = form.telefono ? form.telefono.trim() : "";
    const emailTrim = form.email ? form.email.trim() : "";
    const cpTrim = form.cp ? form.cp.trim() : "";
    const localidadTrim = form.localidad ? form.localidad.trim() : "";
    const provinciaTrim = form.provincia ? form.provincia.trim() : "";
    const paisTrim = form.pais ? form.pais.trim() : "";

    // Obligatorios
    if (!nombreTrim) {
      errors.nombre = "El nombre de la bodega es obligatorio.";
    }
    if (!slugTrim) {
      errors.slug = "El slug de la bodega es obligatorio.";
    }
    if (!cifTrim) {
      errors.cif = "El CIF de la bodega es obligatorio.";
    }

    // Email
    if (emailTrim) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        errors.email = "El email no tiene un formato válido.";
      }
    }

    // Teléfono español "realista"
    if (telefonoTrim) {
      const digits = telefonoTrim.replace(/\D/g, "");
      if (digits.length !== 9) {
        errors.telefono =
          "El teléfono debe tener 9 dígitos (ej: 600112233).";
      } else if (!/^[679]/.test(digits)) {
        errors.telefono =
          "El teléfono debe empezar por 6, 7 o 9 (móvil o fijo nacional).";
      }
    }

    // Código postal: 5 dígitos
    if (cpTrim) {
      if (!/^\d{5}$/.test(cpTrim)) {
        errors.cp = "El código postal debe tener 5 dígitos.";
      }
    }

    // Localidad / Provincia / País → texto con letras, sin números
    function validarCampoTextoGeografico(valor, etiqueta) {
      if (!valor) return null;
      const tieneNumero = /\d/.test(valor);
      const tieneLetra = /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(valor);
      if (!tieneLetra || tieneNumero) {
        return `${etiqueta} debe contener letras y no números (ej: "Zamora").`;
      }
      return null;
    }

    const errLocalidad = validarCampoTextoGeografico(
      localidadTrim,
      "La localidad"
    );
    if (errLocalidad) errors.localidad = errLocalidad;

    const errProvincia = validarCampoTextoGeografico(
      provinciaTrim,
      "La provincia"
    );
    if (errProvincia) errors.provincia = errProvincia;

    const errPais = validarCampoTextoGeografico(paisTrim, "El país");
    if (errPais) errors.pais = errPais;

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authData || !bodega) return;

    if (!isAdmin) {
      setError("No tienes permisos para modificar los datos de la bodega.");
      return;
    }

    setError("");
    setSuccess("");

    const errors = validarFormulario();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Por favor corrige los campos marcados en rojo.");
      return;
    }

    setSaving(true);

    try {
      const { token } = authData;
      const url = `${API_BASE_URL}/api/bodegas/${bodega.id}`;

      const payload = {
        nombre: form.nombre.trim(),
        slug: form.slug.trim(), // aunque no se pueda editar, se envía
        cif: form.cif.trim(),
        telefono: form.telefono?.trim() || null,
        email: form.email?.trim() || null,
        direccion: form.direccion?.trim() || null,
        localidad: form.localidad?.trim() || null,
        provincia: form.provincia?.trim() || null,
        cp: form.cp?.trim() || null,
        pais: form.pais?.trim() || null,
      };

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
        let msg = "Error al guardar los datos de la bodega.";
        let backendFieldErrors = {};

        try {
          const data = await resp.json();
          if (data) {
            if (data.message) {
              msg = data.message;
            }
            if (data.fieldErrors && typeof data.fieldErrors === "object") {
              backendFieldErrors = data.fieldErrors;
            }
          }
        } catch {
          try {
            const text = await resp.text();
            if (text) msg = text;
          } catch {
            // ignoramos
          }
        }

        if (Object.keys(backendFieldErrors).length > 0) {
          setFormErrors((prev) => ({
            ...prev,
            ...backendFieldErrors,
          }));
        }

        throw new Error(msg);
      }

      const actualizada = await resp.json();
      setBodega(actualizada);
      syncFormFromBodega(actualizada);
      setSuccess("Datos de la bodega guardados correctamente.");
      setFormErrors({});
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar los datos de la bodega.");
    } finally {
      setSaving(false);
    }
  }

  // ======================
  // Modo edición
  // ======================
  function activarEdicion() {
    if (!isAdmin) return;
    setModoEdicion(true);
    setError("");
    setSuccess("");
    setFormErrors({});
  }

  function cancelarEdicion() {
    if (!isAdmin) return;
    setModoEdicion(false);
    setError("");
    setSuccess("");
    setFormErrors({});
    if (bodega) {
      syncFormFromBodega(bodega); // volver a datos originales
    }
  }

  // ======================
  // Render
  // ======================
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border me-2" role="status" aria-hidden="true" />
        <span>Cargando datos de la bodega...</span>
      </div>
    );
  }

  if (!bodega) {
    return (
      <div className="alert alert-danger">
        {error || "No se han encontrado datos de la bodega."}
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">{form.nombre || "Bodega"}</h2>

          <div className="d-flex align-items-center gap-2">
            {isAdmin ? (
              <>
                {modoEdicion && (
                  <span className="badge bg-primary">Modo edición</span>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={modoEdicion ? cancelarEdicion : activarEdicion}
                >
                  {modoEdicion ? "Cancelar edición" : "Editar datos"}
                </button>
              </>
            ) : (
              <span className="badge bg-secondary">
                Solo lectura (rol no administrador)
              </span>
            )}
          </div>
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {success && (
          <div className="alert alert-success mb-3">{success}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {/* Nombre */}
            <div className="col-12 col-md-6">
              <label className="form-label">Nombre</label>
              <input
                type="text"
                name="nombre"
                className={`form-control ${
                  formErrors.nombre ? "is-invalid" : ""
                }`}
                value={form.nombre}
                onChange={handleChange}
                disabled={!puedeEditar}
                required
              />
              {formErrors.nombre && (
                <div className="invalid-feedback">{formErrors.nombre}</div>
              )}
            </div>

            {/* Slug (solo lectura siempre) */}
            <div className="col-12 col-md-3">
              <label className="form-label">Slug</label>
              <input
                type="text"
                name="slug"
                className={`form-control ${
                  formErrors.slug ? "is-invalid" : ""
                }`}
                value={form.slug}
                onChange={handleChange}
                disabled={true}
              />
              {formErrors.slug && (
                <div className="invalid-feedback">{formErrors.slug}</div>
              )}
              <div className="form-text">
                Identificador de la bodega en las URLs. No se puede cambiar
                desde aquí.
              </div>
            </div>

            {/* CIF */}
            <div className="col-12 col-md-3">
              <label className="form-label">CIF</label>
              <input
                type="text"
                name="cif"
                className={`form-control ${
                  formErrors.cif ? "is-invalid" : ""
                }`}
                value={form.cif}
                onChange={handleChange}
                disabled={!puedeEditar}
                required
              />
              {formErrors.cif && (
                <div className="invalid-feedback">{formErrors.cif}</div>
              )}
            </div>

            {/* Teléfono */}
            <div className="col-12 col-md-3">
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                className={`form-control ${
                  formErrors.telefono ? "is-invalid" : ""
                }`}
                value={form.telefono}
                onChange={handleChange}
                disabled={!puedeEditar}
                placeholder="Ej: 600112233"
              />
              {formErrors.telefono && (
                <div className="invalid-feedback">
                  {formErrors.telefono}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="col-12 col-md-5">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className={`form-control ${
                  formErrors.email ? "is-invalid" : ""
                }`}
                value={form.email}
                onChange={handleChange}
                disabled={!puedeEditar}
              />
              {formErrors.email && (
                <div className="invalid-feedback">{formErrors.email}</div>
              )}
            </div>

            {/* País */}
            <div className="col-12 col-md-4">
              <label className="form-label">País</label>
              <input
                type="text"
                name="pais"
                className={`form-control ${
                  formErrors.pais ? "is-invalid" : ""
                }`}
                value={form.pais}
                onChange={handleChange}
                disabled={!puedeEditar}
              />
              {formErrors.pais && (
                <div className="invalid-feedback">{formErrors.pais}</div>
              )}
            </div>

            {/* Dirección */}
            <div className="col-12">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                name="direccion"
                className={`form-control ${
                  formErrors.direccion ? "is-invalid" : ""
                }`}
                value={form.direccion}
                onChange={handleChange}
                disabled={!puedeEditar}
              />
              {formErrors.direccion && (
                <div className="invalid-feedback">
                  {formErrors.direccion}
                </div>
              )}
            </div>

            {/* CP */}
            <div className="col-12 col-md-3">
              <label className="form-label">Código Postal</label>
              <input
                type="text"
                name="cp"
                className={`form-control ${
                  formErrors.cp ? "is-invalid" : ""
                }`}
                value={form.cp}
                onChange={handleChange}
                disabled={!puedeEditar}
                placeholder="Ej: 49000"
              />
              {formErrors.cp && (
                <div className="invalid-feedback">{formErrors.cp}</div>
              )}
            </div>

            {/* Localidad */}
            <div className="col-12 col-md-4">
              <label className="form-label">Localidad</label>
              <input
                type="text"
                name="localidad"
                className={`form-control ${
                  formErrors.localidad ? "is-invalid" : ""
                }`}
                value={form.localidad}
                onChange={handleChange}
                disabled={!puedeEditar}
              />
              {formErrors.localidad && (
                <div className="invalid-feedback">
                  {formErrors.localidad}
                </div>
              )}
            </div>

            {/* Provincia */}
            <div className="col-12 col-md-5">
              <label className="form-label">Provincia</label>
              <input
                type="text"
                name="provincia"
                className={`form-control ${
                  formErrors.provincia ? "is-invalid" : ""
                }`}
                value={form.provincia}
                onChange={handleChange}
                disabled={!puedeEditar}
              />
              {formErrors.provincia && (
                <div className="invalid-feedback">
                  {formErrors.provincia}
                </div>
              )}
            </div>
          </div>

          {puedeEditar && (
            <div className="mt-4 d-flex justify-content-end">
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
  );
}

export default BodegaDatos;
