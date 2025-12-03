// src/components/comercial/EntregaNueva.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function getTodayInputDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function buildErrorFromResponse(response) {
  let message = `Error ${response.status}`;
  try {
    const data = await response.json();
    if (data) {
      if (data.message) message = data.message;
      else if (data.error) message = data.error;
    }
  } catch {
    // ignoramos errores de parseo
  }
  const error = new Error(message);
  error.status = response.status;
  return error;
}

function EntregaNueva() {
  const [authData, setAuthData] = useState(null);
  const [clientes, setClientes] = useState([]);

  const [form, setForm] = useState({
    clienteId: "",
    fecha: getTodayInputDate(),
    conPrecios: true,
    observaciones: "",
  });

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarClientesActivos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  async function cargarClientesActivos() {
    const { token, slug } = authData;
    setLoading(true);
    setError("");

    try {
      const url = new URL(
        `${API_BASE_URL}/api/${slug}/clientes/filtrado`
      );
      url.searchParams.set("activos", "true");

      const resp = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw await buildErrorFromResponse(resp);
      }

      const data = await resp.json();
      const listaOrdenada = Array.isArray(data)
        ? [...data].sort((a, b) =>
            (a.nombre || "").localeCompare(b.nombre || "", "es", {
              sensitivity: "base",
            })
          )
        : [];

      setClientes(listaOrdenada);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al cargar los clientes. Inténtalo de nuevo más tarde."
      );
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
  }

  function validar() {
    const nuevosErrores = {};

    if (!form.clienteId) {
      nuevosErrores.clienteId = "El cliente es obligatorio.";
    }

    if (!form.fecha) {
      nuevosErrores.fecha = "La fecha es obligatoria.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) {
      nuevosErrores.fecha =
        "Formato de fecha no válido. Usa el formato AAAA-MM-DD.";
    }

    if (form.observaciones && form.observaciones.length > 1000) {
      nuevosErrores.observaciones =
        "Las observaciones no pueden superar los 1000 caracteres.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!authData) return;

    if (!validar()) {
      return;
    }

    const { token, slug } = authData;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        clienteId: Number(form.clienteId),
        fecha: `${form.fecha}T00:00:00`,
        conPrecios: !!form.conPrecios,
        observaciones:
          form.observaciones && form.observaciones.trim().length > 0
            ? form.observaciones.trim()
            : null,
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        throw await buildErrorFromResponse(resp);
      }

      const data = await resp.json();
      setSuccess("Entrega creada correctamente.");
      // redirigimos al detalle
      window.location.href = `/app/comercial/entregas/${data.id}`;
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al crear la entrega. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <h1 className="h4 mb-3">Nueva entrega / albarán</h1>

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

        {!loading && clientes.length === 0 && !error && (
          <div className="alert alert-info" role="alert">
            No hay clientes activos. Crea primero un cliente en el
            módulo <strong>Clientes</strong> para poder registrar
            entregas.
          </div>
        )}

        {loading ? (
          <p>Cargando clientes...</p>
        ) : (
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-12 col-md-6">
              <label className="form-label">
                Cliente <span className="text-danger">*</span>
              </label>
              <select
                name="clienteId"
                className={`form-select ${
                  errores.clienteId ? "is-invalid" : ""
                }`}
                value={form.clienteId}
                onChange={handleChange}
                disabled={clientes.length === 0}
              >
                {clientes.length === 0 ? (
                  <option value="">
                    No hay clientes activos disponibles
                  </option>
                ) : (
                  <>
                    <option value="">Selecciona un cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                        {c.cifNif ? ` (${c.cifNif})` : ""}
                        {!c.activo ? " [INACTIVO]" : ""}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errores.clienteId && (
                <div className="invalid-feedback">
                  {errores.clienteId}
                </div>
              )}
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label">
                Fecha <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                name="fecha"
                className={`form-control ${
                  errores.fecha ? "is-invalid" : ""
                }`}
                value={form.fecha}
                onChange={handleChange}
              />
              {errores.fecha && (
                <div className="invalid-feedback">
                  {errores.fecha}
                </div>
              )}
            </div>

            <div className="col-6 col-md-3 d-flex align-items-center">
              <div className="form-check mt-4">
                <input
                  type="checkbox"
                  id="conPrecios"
                  name="conPrecios"
                  className="form-check-input"
                  checked={form.conPrecios}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="conPrecios">
                  Incluir precios en el albarán
                </label>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label">Observaciones</label>
              <textarea
                name="observaciones"
                className={`form-control ${
                  errores.observaciones ? "is-invalid" : ""
                }`}
                rows={3}
                value={form.observaciones}
                onChange={handleChange}
                maxLength={1000}
              />
              {errores.observaciones && (
                <div className="invalid-feedback">
                  {errores.observaciones}
                </div>
              )}
            </div>

            <div className="col-12 d-flex justify-content-end gap-2">
              <a
                href="/app/comercial/entregas"
                className="btn btn-outline-secondary"
              >
                Cancelar
              </a>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || clientes.length === 0}
              >
                {saving ? "Guardando..." : "Crear entrega"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EntregaNueva;
