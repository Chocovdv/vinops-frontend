// src/components/account/MiPerfil.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function MiPerfil() {
  const [authData, setAuthData] = useState(null);

  const [form, setForm] = useState({
    username: "",
    nombre: "",
    email: "",
    rol: "",
    bodegaNombre: "",
  });

  // snapshot de los datos guardados (para cancelar edición)
  const [formSnapshot, setFormSnapshot] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); // errores de servidor / red
  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState(""); // errores de validación front

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;

    setAuthData(data);

    const u = data.user || {};

    const bodegaNombre =
      u.bodegaNombre ||
      (u.bodega && (u.bodega.nombre || u.bodegaNombre)) ||
      "";

    const initialForm = {
      username: u.username || "",
      nombre: u.nombre || "",
      email: u.email || "",
      rol: u.rol || u.role || "",
      bodegaNombre: bodegaNombre || "",
    };

    setForm(initialForm);
    setFormSnapshot(initialForm);
  }, []);

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

  // ===== Helpers de validación =====
  function isValidEmail(email) {
    // email opcional: si está vacío, es válido
    if (!email) return true;
    const trimmed = email.trim();
    if (trimmed.length === 0) return true;
    if (trimmed.length > 150) return false;
    // regex básica, suficiente para el front
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(trimmed);
  }

  function isValidNombre(nombre) {
    const n = nombre.trim();
    if (n.length < 2) return false;
    if (n.length > 100) return false;

    // Permitimos letras, espacios y algunos signos habituales
    const re = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s'.-]+$/;
    return re.test(n);
  }

  function handleStartEditing() {
    setValidationError("");
    setError("");
    setSuccess("");
    setIsEditing(true);
    // aseguramos snapshot actualizado
    setFormSnapshot(form);
  }

  function handleCancelEditing() {
    setIsEditing(false);
    setValidationError("");
    setError("");
    setSuccess("");
    if (formSnapshot) {
      setForm(formSnapshot);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authData) return;

    // Si no estamos en modo edición, no hacemos nada
    if (!isEditing) return;

    setError("");
    setSuccess("");
    setValidationError("");

    const nombreTrim = form.nombre.trim();
    const emailTrim = form.email?.trim() || "";

    // === Validaciones front ===
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
      const { token } = authData;
      const url = `${API_BASE_URL}/api/account/profile`;

      const payload = {
        nombre: nombreTrim,
        email: emailTrim !== "" ? emailTrim : null,
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
        // Intentamos sacar mensaje legible del backend (JSON o texto)
        let msg = "Error al actualizar el perfil";
        try {
          const text = await resp.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              if (data && data.message) msg = data.message;
              else msg = text;
            } catch (_) {
              msg = text;
            }
          }
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await resp.json(); // UsuarioActualDto

      setSuccess("Perfil actualizado correctamente.");
      setIsEditing(false);

      // Actualizar localStorage vinops_user con la info nueva
      try {
        const userJson = localStorage.getItem("vinops_user");
        if (userJson) {
          const oldUser = JSON.parse(userJson);

          const newUser = {
            ...oldUser,
            username: data.username,
            nombre: data.nombre,
            email: data.email,
            rol: data.rol,
            role: data.rol,
            bodegaId: data.bodegaId,
            bodegaSlug: data.bodegaSlug,
            bodegaNombre: data.bodegaNombre,
            bodega: {
              ...(oldUser.bodega || {}),
              id: data.bodegaId,
              slug: data.bodegaSlug,
              nombre: data.bodegaNombre,
            },
          };

          localStorage.setItem("vinops_user", JSON.stringify(newUser));
          setAuthData((prev) =>
            prev ? { ...prev, user: newUser, role: data.rol } : prev
          );

          const updatedForm = {
            username: data.username || "",
            nombre: data.nombre || "",
            email: data.email || "",
            rol: data.rol || "",
            bodegaNombre: data.bodegaNombre || "",
          };

          setForm(updatedForm);
          setFormSnapshot(updatedForm);

          // sincronizar topbar por si cambia nombre de bodega
          try {
            const topbar = document.getElementById("topbar-bodega");
            if (topbar && data.bodegaNombre) {
              topbar.textContent = data.bodegaNombre;
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error("No se pudo actualizar vinops_user en localStorage", e);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  }

  if (!authData) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Mis datos</h2>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => irA("/app/account/password")}
            >
              Cambiar contraseña
            </button>

            {!isEditing ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleStartEditing}
              >
                Editar perfil
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

        {form.bodegaNombre && (
          <p className="text-muted small mb-3">
            Bodega: <strong>{form.bodegaNombre}</strong>
          </p>
        )}

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
                className="form-control"
                value={form.nombre}
                onChange={handleChange}
                disabled={!isEditing}
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
                disabled={!isEditing}
                placeholder="Opcional, pero con formato válido"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Rol</label>
              <input
                type="text"
                className="form-control"
                value={form.rol || ""}
                disabled
              />
              <div className="form-text">
                El rol lo gestiona un administrador.
              </div>
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-end">
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
        </form>
      </div>
    </div>
  );
}

export default MiPerfil;
