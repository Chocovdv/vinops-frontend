// src/components/usuarios/UsuarioDetalle.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function UsuarioDetalle({ usuarioId }) {
  const [authData, setAuthData] = useState(null);
  const [usuario, setUsuario] = useState(null);

  const [form, setForm] = useState({
    username: "",
    nombre: "",
    email: "",
    rol: "OPERARIO",
    activo: true,
    mustChangePassword: false,
  });

  const [formSnapshot, setFormSnapshot] = useState(null); // para cancelar edición
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState("");
  const [formErrors, setFormErrors] = useState({}); // errores por campo

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  const esMismoUsuario =
    authData &&
    authData.user &&
    (authData.user.id === usuario?.id ||
      authData.user.username === usuario?.username);

  const irA = (path) => {
    window.location.href = path;
  };

  // ===== Helpers validación =====
  function isValidNombre(nombre) {
    const n = (nombre || "").trim();
    if (n.length < 2 || n.length > 100) return false;
    const re = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s'.-]+$/;
    return re.test(n);
  }

  function isValidEmail(email) {
    if (!email) return true; // opcional
    const trimmed = email.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length > 150) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(trimmed);
  }

  async function cargarUsuario() {
    if (!authData) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setValidationError("");
    setFormErrors({});
    setIsEditing(false);

    const { token, slug } = authData;

    try {
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios/${usuarioId}`;
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
        throw new Error(text || "Error al cargar el usuario");
      }

      const data = await resp.json();
      setUsuario(data);

      const initialForm = {
        username: data.username || "",
        nombre: data.nombre || "",
        email: data.email || "",
        rol: data.rol || "OPERARIO",
        activo: data.activo ?? true,
        mustChangePassword: data.mustChangePassword ?? false,
      };

      setForm(initialForm);
      setFormSnapshot(initialForm);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el usuario");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Limpiar error de ese campo al tocarlo
    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const clone = { ...prev };
      delete clone[name];
      return clone;
    });
  }

  function handleStartEditing() {
    setValidationError("");
    setError("");
    setSuccess("");
    setFormErrors({});
    setIsEditing(true);
    setFormSnapshot(form);
  }

  function handleCancelEditing() {
    setIsEditing(false);
    setValidationError("");
    setError("");
    setSuccess("");
    setFormErrors({});
    if (formSnapshot) {
      setForm(formSnapshot);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!authData || !usuario) return;

    if (!isAdmin) {
      setError("Solo los administradores pueden editar usuarios.");
      return;
    }

    if (!isEditing) return; // por seguridad

    setError("");
    setSuccess("");
    setValidationError("");
    setFormErrors({});

    const nombreTrim = form.nombre.trim();
    const emailTrim = form.email?.trim() || "";

    const newErrors = {};

    // Nombre obligatorio + formato
    if (!nombreTrim) {
      newErrors.nombre = "El nombre es obligatorio.";
    } else if (!isValidNombre(nombreTrim)) {
      newErrors.nombre =
        "El nombre debe tener entre 2 y 100 caracteres y solo puede contener letras, espacios y signos como ' . -";
    }

    // Email opcional pero con formato correcto si se rellena
    if (!isValidEmail(emailTrim) && emailTrim !== "") {
      newErrors.email =
        "El email no tiene un formato válido o es demasiado largo.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setValidationError("Por favor, corrige los campos marcados en rojo.");
      return;
    }

    // Evitar que un usuario se cambie a sí mismo el rol o se desactive
    let rolAEnviar = form.rol;
    let activoAEnviar = form.activo;
    if (esMismoUsuario) {
      rolAEnviar = usuario.rol; // forzamos a lo que tiene en back
      activoAEnviar = usuario.activo;
    }

    setSaving(true);

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios/${usuarioId}`;

      const payload = {
        nombre: nombreTrim,
        email: emailTrim !== "" ? emailTrim : null,
        rol: rolAEnviar,
        activo: activoAEnviar,
        mustChangePassword: form.mustChangePassword,
      };

      const resp = await fetch(url, {
        method: "PUT",
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
        const text = await resp.text();
        throw new Error(text || "Error al guardar el usuario");
      }

      const actualizado = await resp.json();
      setUsuario(actualizado);

      const updatedForm = {
        username: actualizado.username || "",
        nombre: actualizado.nombre || "",
        email: actualizado.email || "",
        rol: actualizado.rol || "OPERARIO",
        activo: actualizado.activo ?? true,
        mustChangePassword: actualizado.mustChangePassword ?? false,
      };

      setForm(updatedForm);
      setFormSnapshot(updatedForm);

      setSuccess("Usuario guardado correctamente.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar el usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!authData || !usuario) return;

    if (!isAdmin) {
      alert("Solo los administradores pueden resetear contraseñas.");
      return;
    }

    const nueva = window.prompt(
      `Introduce la nueva contraseña para el usuario "${usuario.username}":`
    );

    if (!nueva) {
      return;
    }

    if (nueva.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios/${usuarioId}/reset-password`;

      const payload = {
        newPassword: nueva,
        mustChangePassword: true,
      };

      const resp = await fetch(url, {
        method: "PATCH",
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
        const text = await resp.text();
        throw new Error(text || "Error al resetear la contraseña");
      }

      const actualizado = await resp.json();
      setUsuario(actualizado);
      setForm((prev) => ({
        ...prev,
        mustChangePassword: true,
      }));
      alert(
        "Contraseña reseteada correctamente. El usuario deberá cambiarla en su próximo acceso."
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Error al resetear la contraseña");
    }
  }

  async function handleEliminar() {
    if (!authData || !usuario) return;

    if (!isAdmin) {
      alert("Solo los administradores pueden eliminar usuarios.");
      return;
    }

    if (esMismoUsuario) {
      alert(
        "No puedes eliminar tu propio usuario. Pide a otro administrador que lo haga si es necesario."
      );
      return;
    }

    if (
      !window.confirm(
        `¿Seguro que quieres eliminar el usuario "${usuario.username}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios/${usuarioId}`;

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
        throw new Error(text || "Error al eliminar usuario");
      }

      alert("Usuario eliminado correctamente.");
      irA("/app/usuarios");
    } catch (err) {
      console.error(err);
      alert(
        err.message ||
          "Error al eliminar el usuario. Puede que estés intentando borrarte a ti mismo."
      );
    }
  }

  if (!authData) return null;

  if (!isAdmin) {
    return (
      <div className="alert alert-warning">
        Solo los administradores pueden acceder a este módulo.
      </div>
    );
  }

  if (loading) {
    return <p>Cargando usuario...</p>;
  }

  if (!usuario && !error) {
    return (
      <div className="alert alert-warning">
        No se ha encontrado el usuario.
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">
            Usuario: {form.username || "(sin username)"}
          </h2>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => irA("/app/usuarios")}
            >
              Volver al listado
            </button>
            {!isEditing ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleStartEditing}
              >
                Editar usuario
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleCancelEditing}
                disabled={saving}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>

        {validationError && (
          <div className="alert alert-warning mb-3">{validationError}</div>
        )}
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {success && (
          <div className="alert alert-success mb-3">{success}</div>
        )}

        <form onSubmit={handleGuardar}>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={form.username}
                disabled
              />
              <div className="form-text">
                El username no se puede modificar.
              </div>
            </div>

            <div className="col-12 col-md-4">
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
                disabled={!isEditing}
                required
              />
              {formErrors.nombre && (
                <div className="invalid-feedback">{formErrors.nombre}</div>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className={`form-control ${
                  formErrors.email ? "is-invalid" : ""
                }`}
                value={form.email}
                onChange={handleChange}
                disabled={!isEditing}
              />
              {formErrors.email && (
                <div className="invalid-feedback">{formErrors.email}</div>
              )}
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Rol</label>
              <select
                name="rol"
                className="form-select"
                value={form.rol}
                onChange={handleChange}
                disabled={!isEditing || esMismoUsuario}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="OPERARIO">OPERARIO</option>
              </select>
              {esMismoUsuario && (
                <div className="form-text">
                  No puedes cambiar tu propio rol.
                </div>
              )}
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label d-block">Activo</label>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="activo"
                  id="activoSwitch"
                  checked={form.activo}
                  onChange={handleChange}
                  disabled={!isEditing || esMismoUsuario}
                />
                <label
                  className="form-check-label"
                  htmlFor="activoSwitch"
                >
                  {form.activo ? "Sí" : "No"}
                </label>
              </div>
              {esMismoUsuario && (
                <div className="form-text">
                  No puedes desactivar tu propio usuario.
                </div>
              )}
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label d-block">
                Debe cambiar contraseña
              </label>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="mustChangePassword"
                  id="mustChangePasswordSwitch"
                  checked={form.mustChangePassword}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <label
                  className="form-check-label"
                  htmlFor="mustChangePasswordSwitch"
                >
                  {form.mustChangePassword ? "Sí" : "No"}
                </label>
              </div>
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-between">
            <div className="btn-group" role="group">
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleEliminar}
                disabled={saving}
              >
                Eliminar usuario
              </button>
            </div>

            <div className="d-flex gap-2">
              {isEditing && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UsuarioDetalle;
