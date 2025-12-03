// src/components/usuarios/UsuarioNuevo.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function UsuarioNuevo() {
  const [authData, setAuthData] = useState(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    repeatPassword: "",
    nombre: "",
    email: "",
    rol: "OPERARIO",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  const isAdmin =
    authData &&
    (authData.role === "ADMIN" || authData.role === "ROLE_ADMIN");

  const irA = (path) => {
    window.location.href = path;
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // ===== Helpers validación =====
  function isValidUsername(username) {
    const u = (username || "").trim();
    if (u.length < 3 || u.length > 50) return false;
    // letras, números, guion bajo, punto, guion, sin espacios
    const re = /^[A-Za-z0-9._-]+$/;
    return re.test(u);
  }

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authData) return;

    setError("");
    setSuccess("");
    setValidationError("");

    if (!isAdmin) {
      setError("Solo los administradores pueden crear usuarios.");
      return;
    }

    const usernameTrim = form.username.trim();
    const nombreTrim = form.nombre.trim();
    const emailTrim = form.email?.trim() || "";

    if (!usernameTrim) {
      setValidationError("El username es obligatorio.");
      return;
    }
    if (!isValidUsername(usernameTrim)) {
      setValidationError(
        "El username debe tener entre 3 y 50 caracteres y solo puede contener letras, números y . _ - (sin espacios)."
      );
      return;
    }

    if (!form.password || form.password.length < 6) {
      setValidationError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }
    if (form.password !== form.repeatPassword) {
      setValidationError("Las contraseñas no coinciden.");
      return;
    }

    if (!nombreTrim) {
      setValidationError("El nombre es obligatorio.");
      return;
    }
    if (!isValidNombre(nombreTrim)) {
      setValidationError(
        "El nombre debe tener entre 2 y 100 caracteres y solo puede contener letras, espacios y signos como ' . -"
      );
      return;
    }

    if (!isValidEmail(emailTrim)) {
      setValidationError(
        "El email no tiene un formato válido o es demasiado largo."
      );
      return;
    }

    setSaving(true);

    try {
      const { token, slug } = authData;
      const url = `${API_BASE_URL}/api/${slug}/admin/usuarios`;

      const payload = {
        username: usernameTrim,
        password: form.password,
        nombre: nombreTrim,
        email: emailTrim !== "" ? emailTrim : null,
        rol: form.rol,
      };

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
        let msg = "Error al crear usuario";
        try {
          const text = await resp.text();
          if (text) msg = text;
        } catch (_) {}
        throw new Error(msg);
      }

      const creado = await resp.json();
      setSuccess("Usuario creado correctamente.");

      // Reset form si quisieras quedarte en la pantalla
      setForm({
        username: "",
        password: "",
        repeatPassword: "",
        nombre: "",
        email: "",
        rol: "OPERARIO",
      });

      // Ir directamente al detalle
      irA(`/app/usuarios/${creado.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al crear usuario");
    } finally {
      setSaving(false);
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

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Nuevo usuario</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => irA("/app/usuarios")}
          >
            Volver al listado
          </button>
        </div>

        {validationError && (
          <div className="alert alert-warning mb-3">{validationError}</div>
        )}

        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {success && (
          <div className="alert alert-success mb-3">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">
                Username <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="username"
                className="form-control"
                value={form.username}
                onChange={handleChange}
                maxLength={50}
                required
              />
              <div className="form-text">
                Sin espacios. Permitidos letras, números, ".", "_" y "-".
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                className="form-control"
                value={form.nombre}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                maxLength={150}
              />
              <div className="form-text">Opcional, pero con formato válido.</div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Rol</label>
              <select
                name="rol"
                className="form-select"
                value={form.rol}
                onChange={handleChange}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="OPERARIO">OPERARIO</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">
                Contraseña <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
                required
              />
              <div className="form-text">
                Mínimo 6 caracteres. El usuario podrá cambiarla después.
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">
                Repetir contraseña <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                name="repeatPassword"
                className="form-control"
                value={form.repeatPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => irA("/app/usuarios")}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UsuarioNuevo;
