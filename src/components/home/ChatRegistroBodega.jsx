// src/components/home/ChatRegistroBodega.jsx
import React, { useState } from "react";
import { API_BASE_URL } from "../../lib/auth";

/**
 * Chat IA para ayudar a registrar una bodega.
 * - Mantiene el historial de mensajes en el estado.
 * - Llama al backend: POST /api/chat-registro-bodega
 * - Cuando backend devuelve resumenBodega, lo muestra en una tarjeta.
 * - Cuando backend crea la bodega, muestra ID + slug y las credenciales del admin.
 */
export default function ChatRegistroBodega() {
  // Historial de mensajes del chat
  const [messages, setMessages] = useState([]);
  // Texto que está escribiendo el usuario
  const [inputText, setInputText] = useState("");
  // Indicador de petición en curso
  const [loading, setLoading] = useState(false);
  // Error de red / backend
  const [error, setError] = useState("");
  // Resumen estructurado de la bodega (cuando FIN_REGISTRO)
  const [resumenBodega, setResumenBodega] = useState(null);
  // Info de la bodega creada en la BD (id + slug)
  const [bodegaCreada, setBodegaCreada] = useState(null);
  // Credenciales generadas para el usuario administrador
  const [credenciales, setCredenciales] = useState(null);

  // Enviar mensaje al backend
  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Reseteamos error
    setError("");

    // Nuevo mensaje del usuario
    const newUserMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, newUserMessage];

    // Pintamos ya el mensaje del usuario
    setMessages(newMessages);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-registro-bodega`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Enviamos TODO el historial (user + assistant) al backend
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(
          `Error en la petición: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Añadimos el mensaje del asistente al historial
      const assistantMessage = {
        role: "assistant",
        content: data.reply ?? "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Si el backend ha detectado FIN_REGISTRO, vendrá resumenBodega
      if (data.resumenBodega) {
        setResumenBodega(data.resumenBodega);
      }

      // Si además se ha creado la bodega en VinOps, vendrán id + slug
      if (data.nuevaBodegaId && data.nuevaBodegaSlug) {
        setBodegaCreada({
          id: data.nuevaBodegaId,
          slug: data.nuevaBodegaSlug,
        });
      }

      // Y si se ha creado usuario admin, vendrán también estas credenciales
      if (data.adminUsername && data.adminPassword) {
        setCredenciales({
          username: data.adminUsername,
          password: data.adminPassword,
        });
      }
    } catch (err) {
      console.error("Error llamando al asistente:", err);
      setError(
        "No he podido contactar con el asistente ahora mismo. Inténtalo de nuevo en unos segundos."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-dark text-white">
        <div className="d-flex align-items-center justify-content-between">
          <span className="fw-semibold">
            Asistente IA · Registro de tu bodega
          </span>
          <span role="img" aria-label="robot">
            🤖
          </span>
        </div>
      </div>

      <div className="card-body d-flex flex-column">
        <p className="small text-muted mb-2">
          Cuéntale al asistente cómo es tu bodega (nombre, dirección, localidad…)
          y él te irá haciendo preguntas. Al final te mostrará un resumen y
          creará la bodega en VinOps con un usuario administrador.
        </p>

        {/* Zona de mensajes */}
        <div
          className="flex-grow-1 mb-3 border rounded p-2 bg-light"
          style={{ minHeight: "220px", maxHeight: "320px", overflowY: "auto" }}
        >
          {messages.length === 0 && (
            <div className="text-muted small">
              Empieza escribiendo, por ejemplo:
              <br />
              <em>
                &ldquo;Hola, quiero registrar mi bodega familiar en la Ribera del
                Duero&rdquo;
              </em>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`d-flex mb-2 ${
                  isUser ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  className={`p-2 rounded-3 ${
                    isUser
                      ? "bg-primary text-white"
                      : "bg-white border text-body"
                  }`}
                  style={{ maxWidth: "80%" }}
                >
                  <div className="small fw-semibold mb-1">
                    {isUser ? "Tú" : "Asistente"}
                  </div>
                  <div className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="d-flex align-items-center gap-2 text-muted small mt-2">
              <div
                className="spinner-border spinner-border-sm"
                role="status"
              ></div>
              <span>El asistente está pensando…</span>
            </div>
          )}
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {/* Formulario de entrada */}
        <form onSubmit={handleSubmit} className="mt-auto">
          <div className="d-flex gap-2">
            <textarea
              className="form-control"
              rows={2}
              placeholder="Escribe aquí tu mensaje…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !inputText.trim()}
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
          <div className="form-text small">
            El asistente te pedirá los datos clave y al final mostrará un
            resumen de tu bodega y las credenciales de acceso para el usuario
            administrador.
          </div>
        </form>

        {/* Resumen estructurado de la bodega */}
        {resumenBodega && (
          <div className="card mt-3 border-success">
            <div className="card-header bg-success text-white py-2">
              <strong>Resumen de tu bodega</strong>
            </div>
            <div className="card-body small">
              <p className="mb-1">
                <strong>Nombre:</strong> {resumenBodega.nombreBodega || "—"}
              </p>
              <p className="mb-1">
                <strong>Dirección:</strong>{" "}
                {resumenBodega.direccion && resumenBodega.direccion.trim()
                  ? resumenBodega.direccion
                  : "—"}
              </p>
              <p className="mb-1">
                <strong>Localidad:</strong> {resumenBodega.localidad || "—"}
              </p>
              <p className="mb-1">
                <strong>Provincia:</strong> {resumenBodega.provincia || "—"}
              </p>
              <p className="mb-1">
                <strong>Código postal:</strong> {resumenBodega.cp || "—"}
              </p>
              <p className="mb-1">
                <strong>País:</strong> {resumenBodega.pais || "—"}
              </p>
              <p className="mb-1">
                <strong>Teléfono:</strong> {resumenBodega.telefono || "—"}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {resumenBodega.email || "—"}
              </p>
              <p className="mb-1">
                <strong>CIF:</strong> {resumenBodega.cif || "—"}
              </p>
              <p className="mb-0">
                <strong>Notas:</strong>{" "}
                {resumenBodega.notas && resumenBodega.notas.trim()
                  ? resumenBodega.notas
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Bodega creada en VinOps (id + slug) */}
        {bodegaCreada && (
          <div className="card mt-3 border-info">
            <div className="card-header bg-info text-white py-2">
              <strong>Bodega creada en VinOps</strong>
            </div>
            <div className="card-body small">
              <p className="mb-1">
                <strong>ID:</strong> {bodegaCreada.id}
              </p>
              <p className="mb-0">
                <strong>Slug:</strong> {bodegaCreada.slug}
              </p>
              <p className="mt-2 mb-0 text-muted">
                Este slug identifica a tu bodega dentro de VinOps.
              </p>
            </div>
          </div>
        )}

        {/* Credenciales de acceso generadas */}
        {credenciales && (
          <div className="card mt-3 border-primary">
            <div className="card-header bg-primary text-white py-2">
              <strong>Usuario administrador creado</strong>
            </div>
            <div className="card-body small">
              <p className="mb-1">
                <strong>Usuario:</strong> {credenciales.username}
              </p>
              <p className="mb-0">
                <strong>Contraseña inicial:</strong> {credenciales.password}
              </p>
              <p className="mt-2 mb-0 text-muted">
                Guarda estas credenciales en un lugar seguro y cambia la
                contraseña la primera vez que inicies sesión.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
