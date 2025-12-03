// src/components/account/CambiarPassword.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function CambiarPassword() {
  const [authData, setAuthData] = useState(null);

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    repeatNewPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); // servidor / red
  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState(""); // validación front

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authData) return;

    setError("");
    setSuccess("");
    setValidationError("");

    const { oldPassword, newPassword, repeatNewPassword } = form;

    // === Validaciones front ===
    if (!oldPassword) {
      setValidationError("La contraseña actual es obligatoria.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setValidationError(
        "La nueva contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (newPassword === oldPassword) {
      setValidationError(
        "La nueva contraseña debe ser diferente a la actual."
      );
      return;
    }

    // Simple regla de complejidad: al menos una letra y un número
    const hasLetter = /[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      setValidationError(
        "La nueva contraseña debe incluir al menos una letra y un número."
      );
      return;
    }

    if (newPassword !== repeatNewPassword) {
      setValidationError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);

    try {
      const { token } = authData;
      const url = `${API_BASE_URL}/api/account/password`;

      const payload = {
        oldPassword,
        newPassword,
        repeatNewPassword,
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
        let msg = "Error al cambiar la contraseña";
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

      // actualizar mustChangePassword en vinops_user si viene
      try {
        const userJson = localStorage.getItem("vinops_user");
        if (userJson) {
          const oldUser = JSON.parse(userJson);
          const newUser = {
            ...oldUser,
            mustChangePassword: data.mustChangePassword,
          };
          localStorage.setItem("vinops_user", JSON.stringify(newUser));
        }
      } catch (e) {
        console.error(
          "No se pudo actualizar vinops_user tras cambiar password",
          e
        );
      }

      setSuccess("Contraseña cambiada correctamente.");
      setForm({
        oldPassword: "",
        newPassword: "",
        repeatNewPassword: "",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  }

  if (!authData) return null;

  const username = authData.user?.username || "";

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0">Cambiar contraseña</h2>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => irA("/app/account/perfil")}
          >
            Volver a mi perfil
          </button>
        </div>

        {username && (
          <p className="text-muted small mb-3">
            Usuario: <strong>{username}</strong>
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
              <label className="form-label">Contraseña actual</label>
              <input
                type="password"
                name="oldPassword"
                className="form-control"
                value={form.oldPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Nueva contraseña</label>
              <input
                type="password"
                name="newPassword"
                className="form-control"
                value={form.newPassword}
                onChange={handleChange}
                required
              />
              <div className="form-text">
                Mínimo 8 caracteres, con letras y números.
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Repetir nueva contraseña</label>
              <input
                type="password"
                name="repeatNewPassword"
                className="form-control"
                value={form.repeatNewPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mt-3 d-flex justify-content-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CambiarPassword;
