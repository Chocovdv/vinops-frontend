import { useState } from "react";
import { API_BASE_URL } from "../lib/auth";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const userTrim = username.trim();
    const passTrim = password.trim();

    if (!userTrim || !passTrim) {
      setError("Usuario y contraseña son obligatorios.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userTrim, password: passTrim }),
      });

      if (!response.ok) {
        let msg = "Usuario o contraseña incorrectos";
        try {
          const errJson = await response.json();
          if (errJson && errJson.message) {
            msg = errJson.message;
          }
        } catch {
          // ignoramos si no hay JSON
        }
        throw new Error(msg);
      }

      const data = await response.json(); // { token, user }

      localStorage.setItem("vinops_token", data.token);
      localStorage.setItem("vinops_user", JSON.stringify(data.user));

      window.location.href = "/app";
    } catch (err) {
      console.error("Error en login:", err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="login-card-simple shadow-lg">
            {/* Cabecera pequeña con el nombre de la app */}
            <div className="login-card-header text-center mb-3">
              <div className="login-logo mb-1">VinOps</div>
              <div className="small text-muted">
                La operativa diaria de tu bodega
              </div>
            </div>

            <h2 className="h4 mb-1 text-center">Iniciar sesión</h2>
            <p className="text-muted text-center mb-4">
              Introduce tu usuario y contraseña para entrar en VinOps.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="login-user">
                  Usuario
                </label>
                <input
                  id="login-user"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="login-pass">
                  Contraseña
                </label>
                <input
                  id="login-pass"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div className="alert alert-danger py-2 small mb-3 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100 mb-2"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar en VinOps"}
              </button>

              <div className="text-center small text-muted">
                ¿Volver a la página principal?{" "}
                <a href="/" className="text-decoration-none">
                  Ir al inicio
                </a>
              </div>
            </form>
          </div>

          <p className="text-center text-muted small mt-3 mb-0">
            © {new Date().getFullYear()} VinOps · Bodegas Ramayal SL
          </p>
        </div>
      </div>
    </div>
  );

}
