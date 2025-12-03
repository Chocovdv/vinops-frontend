import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function ClienteDetalle({ clienteId }) {
  const [authData, setAuthData] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // nuevo: modo edición
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    fetchCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, clienteId]);

  const role = authData?.role || authData?.rol || null;
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";

  const fetchCliente = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setValidationError("");
    setFormErrors({});
    setEditMode(false); // siempre entramos en modo solo lectura

    const { token, slug } = authData;

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/clientes/${clienteId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Error al cargar el cliente (${resp.status})`);
      }

      const data = await resp.json();
      setCliente(data);
      setForm({
        nombre: data.nombre || "",
        tipo: data.tipo || "PROFESIONAL",
        cifNif: data.cifNif || "",
        telefono: data.telefono || "",
        email: data.email || "",
        direccion: data.direccion || "",
        cp: data.cp || "",
        localidad: data.localidad || "",
        provincia: data.provincia || "",
        pais: data.pais || "",
        notas: data.notas || "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el cliente");
    } finally {
      setLoading(false);
    }
  };

  // ==== VALIDACIONES ====
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
      errors.cifNif =
        "El CIF/NIF debe tener entre 8 y 15 caracteres alfanuméricos.";
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
    setSuccess("");
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setValidationError("");

    if (!authData || !form) return;

    if (!isAdmin) {
      setError("No tienes permisos para modificar clientes.");
      return;
    }

    if (!editMode) {
      setValidationError("Pulsa primero en «Editar cliente» para modificarlo.");
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
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/clientes/${clienteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        let msg = `Error al guardar el cliente (${resp.status})`;
        try {
          const text = await resp.text();
          if (text) msg = text;
        } catch (_) {}
        throw new Error(msg);
      }

      const actualizado = await resp.json();
      setCliente(actualizado);
      setForm({
        nombre: actualizado.nombre || "",
        tipo: actualizado.tipo || "PROFESIONAL",
        cifNif: actualizado.cifNif || "",
        telefono: actualizado.telefono || "",
        email: actualizado.email || "",
        direccion: actualizado.direccion || "",
        cp: actualizado.cp || "",
        localidad: actualizado.localidad || "",
        provincia: actualizado.provincia || "",
        pais: actualizado.pais || "",
        notas: actualizado.notas || "",
      });
      setSuccess("Cliente guardado correctamente.");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  const handleDesactivar = async () => {
    if (!authData || !cliente) return;
    if (!isAdmin) return;

    if (
      !window.confirm(
        "¿Seguro que quieres desactivar este cliente? Podrás reactivarlo más adelante."
      )
    ) {
      return;
    }

    const { token, slug } = authData;

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/clientes/${cliente.id}/desactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Error al desactivar el cliente (${resp.status})`);
      }

      fetchCliente();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al desactivar el cliente");
    }
  };

  const handleReactivar = async () => {
    if (!authData || !cliente) return;
    if (!isAdmin) return;

    const { token, slug } = authData;

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/clientes/${cliente.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({ activo: true }),
        }
      );

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Error al reactivar el cliente (${resp.status})`);
      }

      fetchCliente();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al reactivar el cliente");
    }
  };

  const handleVolver = () => {
    window.location.href = "/app/clientes";
  };

  const handleToggleEdit = () => {
    if (!isAdmin) return;

    if (editMode) {
      // cancelar edición: volvemos a los datos originales
      if (cliente) {
        setForm({
          nombre: cliente.nombre || "",
          tipo: cliente.tipo || "PROFESIONAL",
          cifNif: cliente.cifNif || "",
          telefono: cliente.telefono || "",
          email: cliente.email || "",
          direccion: cliente.direccion || "",
          cp: cliente.cp || "",
          localidad: cliente.localidad || "",
          provincia: cliente.provincia || "",
          pais: cliente.pais || "",
          notas: cliente.notas || "",
        });
      }
      setFormErrors({});
      setValidationError("");
      setSuccess("");
      setError("");
      setEditMode(false);
    } else {
      setEditMode(true);
      setSuccess("");
      setValidationError("");
    }
  };

  if (!authData) return null;

  if (loading) {
    return (
      <div className="container my-4">
        <p>Cargando cliente...</p>
      </div>
    );
  }

  if (!cliente || !form) {
    return (
      <div className="container my-4">
        <div className="alert alert-warning">
          No se ha encontrado el cliente solicitado.
        </div>
      </div>
    );
  }

  const camposDeshabilitados = !isAdmin || !editMode;

  return (
    <section className="container my-4">
      {/* Cabecera */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            className="btn btn-link px-0 mb-1"
            type="button"
            onClick={handleVolver}
          >
            ← Volver al listado
          </button>
          <h2 className="mb-0">
            Cliente {cliente ? `- ${cliente.nombre}` : ""}
          </h2>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleToggleEdit}
          >
            {editMode ? "Cancelar edición" : "Editar cliente"}
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {validationError && (
        <div className="alert alert-warning" role="alert">
          {validationError}
        </div>
      )}

      {/* Estado + tipo */}
      <div className="mb-3">
        {cliente.activo ? (
          <span className="badge bg-success me-2">Activo</span>
        ) : (
          <span className="badge bg-secondary me-2">Inactivo</span>
        )}
        <span className="badge bg-info">
          {cliente.tipo === "PROFESIONAL" ? "Profesional" : "Particular"}
        </span>
      </div>

      {/* Formulario */}
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleGuardar} className="row g-3" noValidate>
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
                disabled={camposDeshabilitados}
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
                className={`form-select ${formErrors.tipo ? "is-invalid" : ""}`}
                value={form.tipo}
                onChange={handleChange}
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                className={`form-control ${formErrors.cp ? "is-invalid" : ""}`}
                value={form.cp}
                onChange={handleChange}
                maxLength={10}
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
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
                disabled={camposDeshabilitados}
              />
              {formErrors.notas && (
                <div className="invalid-feedback">{formErrors.notas}</div>
              )}
            </div>

            {isAdmin && (
              <div className="col-12 d-flex justify-content-between mt-3">
                <div>
                  {cliente.activo ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger me-2"
                      onClick={handleDesactivar}
                      disabled={saving}
                    >
                      Desactivar cliente
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-success me-2"
                      onClick={handleReactivar}
                      disabled={saving}
                    >
                      Reactivar cliente
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !editMode}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default ClienteDetalle;
