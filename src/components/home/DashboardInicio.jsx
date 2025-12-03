// src/components/home/DashboardInicio.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

// Mapea el código de Open-Meteo a icono + descripción sencilla.
function obtenerInfoTiempo(codigo) {
  if (codigo === null || codigo === undefined) {
    return { icono: "🌡️", descripcion: "Sin datos" };
  }

  if (codigo === 0) return { icono: "☀️", descripcion: "Despejado" };
  if (codigo === 1 || codigo === 2)
    return { icono: "🌤️", descripcion: "Poco nuboso" };
  if (codigo === 3) return { icono: "⛅", descripcion: "Nuboso" };
  if (codigo === 45 || codigo === 48)
    return { icono: "🌫️", descripcion: "Niebla" };
  if (codigo >= 51 && codigo <= 57)
    return { icono: "🌦️", descripcion: "Llovizna" };
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82))
    return { icono: "🌧️", descripcion: "Lluvia" };
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86)
    return { icono: "🌨️", descripcion: "Nieve" };
  if (codigo === 95 || codigo === 96 || codigo === 99)
    return { icono: "⛈️", descripcion: "Tormenta" };

  return { icono: "🌡️", descripcion: "Condición variable" };
}

/**
 * Helper para llamadas autenticadas que:
 *  - añade cabeceras Authorization + Accept
 *  - redirige a /login en 401/403
 *  - lanza Error si la respuesta no es OK
 */
async function fetchJsonAuthed(url, token) {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (resp.status === 401 || resp.status === 403) {
    window.location.href = "/login";
    throw new Error("No autorizado");
  }

  if (!resp.ok) {
    let text = "";
    try {
      text = await resp.text();
    } catch {
      // nada
    }
    throw new Error(text || `Error al llamar a ${url} (${resp.status})`);
  }

  return resp.json();
}

/**
 * Busca coordenadas probando varias consultas y, si se indica, priorizando un country_code.
 */
async function buscarCoordenadas(consultas, countryCodePreferido) {
  for (const consulta of consultas) {
    if (!consulta) continue;

    try {
      const resGeo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          consulta
        )}&count=5&language=es`
      );

      if (!resGeo.ok) continue;

      const geoData = await resGeo.json();
      if (!geoData.results || geoData.results.length === 0) continue;

      let results = geoData.results;

      // Si sabemos el país (p.ej. España), priorizamos ese
      if (countryCodePreferido) {
        const filtrados = results.filter(
          (r) =>
            r.country_code &&
            r.country_code.toUpperCase() ===
              countryCodePreferido.toUpperCase()
        );
        if (filtrados.length > 0) {
          results = filtrados;
        }
      }

      if (results.length > 0) {
        const { latitude, longitude, name, country } = results[0];
        return {
          latitude,
          longitude,
          etiqueta: `${name}, ${country}`,
        };
      }
    } catch (e) {
      console.error("Error en geocoding Open-Meteo:", e);
    }
  }

  throw new Error(
    `No se han encontrado coordenadas para "${consultas[0]}".`
  );
}

/**
 * Obtiene el tiempo de hoy (daily) para la bodega usando Open-Meteo.
 * Devuelve un objeto { etiquetaLugar, fecha, tMax, tMin, lluvia, codigo }.
 */
async function obtenerTiempoHoyParaBodega(bodega) {
  if (!bodega) {
    throw new Error("No se han recibido datos de la bodega.");
  }

  const ciudad = (bodega.localidad || "").trim();
  const provincia = (bodega.provincia || "").trim();
  const paisOriginal = (bodega.pais || "").trim();

  let paisEn = paisOriginal;
  if (paisOriginal && paisOriginal.toLowerCase().startsWith("espa")) {
    paisEn = "Spain";
  }

  let countryCodePreferido = null;
  if (
    paisOriginal.toLowerCase().startsWith("espa") ||
    paisEn.toLowerCase() === "spain"
  ) {
    countryCodePreferido = "ES";
  }

  const consultas = [];

  if (ciudad && provincia && paisEn) {
    consultas.push(`${ciudad}, ${provincia}, ${paisEn}`);
  }
  if (ciudad && paisEn) {
    consultas.push(`${ciudad}, ${paisEn}`);
  }
  if (ciudad) {
    consultas.push(ciudad);
  }
  if (provincia && paisEn) {
    consultas.push(`${provincia}, ${paisEn}`);
  }
  if (provincia) {
    consultas.push(provincia);
  }
  if (paisEn) {
    consultas.push(paisEn);
  }

  if (consultas.length === 0) {
    throw new Error(
      "La bodega no tiene definida localidad/provincia/país."
    );
  }

  const { latitude, longitude, etiqueta } = await buscarCoordenadas(
    consultas,
    countryCodePreferido
  );

  const resTiempo = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
  );

  if (!resTiempo.ok) {
    throw new Error("No se ha podido obtener la previsión del tiempo.");
  }

  const datos = await resTiempo.json();

  const dias = datos.daily.time || [];
  const tMax = datos.daily.temperature_2m_max || [];
  const tMin = datos.daily.temperature_2m_min || [];
  const lluvia = datos.daily.precipitation_sum || [];
  const codigos = datos.daily.weathercode || [];

  if (!dias.length) {
    throw new Error("No hay datos de previsión para hoy.");
  }

  const idxHoy = 0;

  return {
    etiquetaLugar: etiqueta,
    fecha: dias[idxHoy],
    tMax: tMax[idxHoy],
    tMin: tMin[idxHoy],
    lluvia: lluvia[idxHoy],
    codigo: codigos[idxHoy],
  };
}

function DashboardInicio() {
  const [authData, setAuthData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // KPIs
  const [numParcelas, setNumParcelas] = useState(0);
  const [numVinos, setNumVinos] = useState(0);
  const [numMateriales, setNumMateriales] = useState(0);
  const [numClientesActivos, setNumClientesActivos] = useState(0);

  const [estadisticasEntregas, setEstadisticasEntregas] = useState({
    total: 0,
    borrador: 0,
    confirmado: 0,
    entregado: 0,
    anulado: 0,
  });

  const [ultimasEntregas, setUltimasEntregas] = useState([]);

  // Datos de bodega + próximo evento
  const [bodega, setBodega] = useState(null);
  const [proximoEvento, setProximoEvento] = useState(null);

  // Tiempo de hoy
  const [tiempoHoy, setTiempoHoy] = useState(null);
  const [tiempoHoyError, setTiempoHoyError] = useState("");

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const cargarDatos = async () => {
    setLoading(true);
    setError("");
    setTiempoHoy(null);
    setTiempoHoyError("");

    const { token, slug } = authData;

    try {
      // Fecha de hoy para pedir solo eventos futuros
      const hoy = new Date().toISOString().slice(0, 10);

      const [
        parcelas,
        vinos,
        materiales,
        clientes,
        entregas,
        bodegaData,
        eventos,
      ] = await Promise.all([
        fetchJsonAuthed(`${API_BASE_URL}/api/${slug}/vinedo/parcelas`, token),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/${slug}/inventario/productos/filtrado?tipo=VINO&activos=true`,
          token
        ),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/${slug}/inventario/productos/filtrado?tipo=MATERIAL&activos=true`,
          token
        ),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/${slug}/clientes/filtrado?activos=true`,
          token
        ),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/${slug}/comercial/entregas/filtrado`,
          token
        ),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/bodegas/slug/${encodeURIComponent(slug)}`,
          token
        ),
        fetchJsonAuthed(
          `${API_BASE_URL}/api/${slug}/eventos?desde=${hoy}`,
          token
        ),
      ]);

      // ===== KPIs =====
      setNumParcelas(parcelas.length || 0);
      setNumVinos(vinos.length || 0);
      setNumMateriales(materiales.length || 0);
      setNumClientesActivos(clientes.length || 0);

      // ===== Entregas =====
      const est = {
        total: entregas.length || 0,
        borrador: 0,
        confirmado: 0,
        entregado: 0,
        anulado: 0,
      };

      entregas.forEach((e) => {
        switch (e.estado) {
          case "BORRADOR":
            est.borrador++;
            break;
          case "CONFIRMADO":
            est.confirmado++;
            break;
          case "ENTREGADO":
            est.entregado++;
            break;
          case "ANULADO":
            est.anulado++;
            break;
          default:
            break;
        }
      });

      setEstadisticasEntregas(est);

      const ult = [...entregas]
        .sort((a, b) => {
          const fa = a.fecha || "";
          const fb = b.fecha || "";
          return fb.localeCompare(fa);
        })
        .slice(0, 5);

      setUltimasEntregas(ult);

      // ===== Bodega =====
      setBodega(bodegaData);

      // actualizar topbar por si acaso
      try {
        const topbar = document.getElementById("topbar-bodega");
        if (topbar && bodegaData && bodegaData.nombre) {
          topbar.textContent = bodegaData.nombre;
        }
      } catch (_) {}

      // ===== Próximo evento (entre los futuros) =====
      let prox = null;
      if (Array.isArray(eventos) && eventos.length > 0) {
        const futuros = eventos
          .map((e) => {
            if (!e.fecha) return null;
            try {
              return { ...e, fechaDate: new Date(e.fecha) };
            } catch {
              return null;
            }
          })
          .filter((e) => e && e.fechaDate && !isNaN(e.fechaDate));

        if (futuros.length > 0) {
          futuros.sort((a, b) => a.fechaDate - b.fechaDate); // asc
          prox = futuros[0];
        }
      }
      setProximoEvento(prox);

      // ===== Tiempo hoy (Open-Meteo) =====
      try {
        if (bodegaData) {
          const tiempo = await obtenerTiempoHoyParaBodega(bodegaData);
          setTiempoHoy(tiempo);
        } else {
          setTiempoHoy(null);
        }
      } catch (e) {
        console.error("Error cargando tiempo de hoy:", e);
        setTiempoHoy(null);
        setTiempoHoyError(
          e.message || "No se ha podido cargar el tiempo de hoy."
        );
      }
    } catch (err) {
      console.error(err);
      setError(
        "Error al cargar los datos del panel. Revisa que el backend esté levantado."
      );
    } finally {
      setLoading(false);
    }
  };

  const irA = (path) => {
    window.location.href = path;
  };

  if (!authData) return null;

  // Datos derivados de usuario / bodega para la cabecera
  const user = authData.user || null;
  const role =
    authData.role ||
    (user && (user.rol || user.role)) ||
    "-";

  const bodegaSlug =
    authData.slug ||
    (user &&
      (user.bodegaSlug ||
        (user.bodega && user.bodega.slug))) ||
    "-";

  const bodegaNombreUsuario =
    (user &&
      (user.bodegaNombre ||
        (user.bodega && user.bodega.nombre))) ||
    (bodega && bodega.nombre) ||
    "Tu bodega";

  // para mostrar fecha del próximo evento
  let proximoEventoFechaStr = "";
  if (proximoEvento && proximoEvento.fecha) {
    try {
      proximoEventoFechaStr = new Date(
        proximoEvento.fecha
      ).toLocaleString();
    } catch {
      proximoEventoFechaStr = proximoEvento.fecha;
    }
  }

  const infoTiempoHoy = tiempoHoy ? obtenerInfoTiempo(tiempoHoy.codigo) : null;

  return (
    <div className="container my-4">
      {/* Cabecera de bienvenida + recarga */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
        <div className="mb-2 mb-md-0">
          <h1 className="h4 mb-1">Bienvenido a VinOps</h1>
          <p className="mb-0">
            Sesión iniciada como{" "}
            <strong>
              {(user && (user.username || user.email)) || "Usuario"}
            </strong>{" "}
            (<span className="text-muted">{role}</span>)
          </p>
          <p className="mb-0 text-muted">
            Bodega actual:{" "}
            <strong>{bodegaNombreUsuario}</strong>{" "}
            {bodegaSlug && bodegaSlug !== "-" && (
              <>
                {" "}
                (<code>{bodegaSlug}</code>)
              </>
            )}
          </p>
        </div>

        <div className="text-md-end">
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={cargarDatos}
          >
            Recargar datos
          </button>
        </div>
      </div>

      <hr className="mb-3" />

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading && <p>Cargando datos...</p>}

      {!loading && !error && (
        <>
          {/* Resumen bodega + próximo evento */}
          <div className="row g-3 mb-4">
            {/* Tarjeta BODEGA: toda la tarjeta clicable */}
            <div className="col-lg-8">
              <div
                className="card h-100 shadow-sm clickable"
                style={{ cursor: "pointer" }}
                onClick={() => irA("/app/bodega")}
              >
                <div className="card-body">
                  <h5 className="card-title mb-3">Tu bodega</h5>

                  {!bodega && (
                    <p className="mb-0 text-muted">
                      No se han encontrado datos de la bodega.
                    </p>
                  )}

                  {bodega && (
                    <>
                      <p className="mb-1">
                        <strong>{bodega.nombre}</strong>
                      </p>
                      <p className="mb-1 small text-muted">
                        CIF: {bodega.cif}
                      </p>
                      <p className="mb-1 small">
                        {bodega.direccion && (
                          <>
                            {bodega.direccion}
                            <br />
                          </>
                        )}
                        {(bodega.cp ||
                          bodega.localidad ||
                          bodega.provincia) && (
                          <>
                            {bodega.cp && `${bodega.cp} `}
                            {bodega.localidad && `${bodega.localidad} `}
                            {bodega.provincia && `(${bodega.provincia})`}
                            <br />
                          </>
                        )}
                        {bodega.pais && bodega.pais}
                      </p>

                      {(bodega.telefono || bodega.email) && (
                        <p className="mb-0 small">
                          {bodega.telefono && (
                            <>
                              Tel: {bodega.telefono}
                              <br />
                            </>
                          )}
                          {bodega.email && <>Email: {bodega.email}</>}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tarjeta PRÓXIMO EVENTO: toda la tarjeta clicable */}
            <div className="col-lg-4">
              <div
                className="card h-100 shadow-sm clickable"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (proximoEvento) {
                    irA(`/app/eventos/${proximoEvento.id}`);
                  } else {
                    irA("/app/eventos");
                  }
                }}
              >
                <div className="card-body">
                  <h5 className="card-title mb-3">Próximo evento</h5>

                  {!proximoEvento && (
                    <p className="mb-0 text-muted">
                      No hay eventos futuros programados. Haz clic para ir al
                      módulo de eventos.
                    </p>
                  )}

                  {proximoEvento && (
                    <>
                      <p className="mb-1">
                        <strong>{proximoEvento.nombre}</strong>{" "}
                        <span className="text-muted">
                          ({proximoEvento.tipo})
                        </span>
                      </p>
                      <p className="mb-1 small">
                        {proximoEventoFechaStr}
                        {proximoEvento.ubicacion &&
                          ` – ${proximoEvento.ubicacion}`}
                      </p>
                      {proximoEvento.descripcion && (
                        <p className="mb-0 small text-muted">
                          {proximoEvento.descripcion}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tiempo de hoy */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Tiempo hoy</h6>
              {tiempoHoy && tiempoHoy.etiquetaLugar && (
                <small className="text-muted">
                  {tiempoHoy.etiquetaLugar}
                </small>
              )}
            </div>

            {tiempoHoyError && !tiempoHoy && (
              <p className="small text-danger mb-0">{tiempoHoyError}</p>
            )}

            {tiempoHoy && (
              <div className="tiempo-bodega-hoy d-flex justify-content-between align-items-center rounded-3 p-3 border">
                <div>
                  <div className="small text-uppercase fw-semibold opacity-75">
                    Hoy · {infoTiempoHoy?.descripcion}
                  </div>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <span className="tiempo-bodega-temp-actual">
                      {tiempoHoy.tMax != null
                        ? `${Math.round(tiempoHoy.tMax)} °C`
                        : "-"}
                    </span>
                    <span className="text-muted small">
                      {tiempoHoy.tMin != null &&
                        `Mín: ${Math.round(tiempoHoy.tMin)} °C`}
                    </span>
                    <span className="text-muted small">
                      {tiempoHoy.lluvia != null &&
                        `Lluvia: ${Math.round(tiempoHoy.lluvia)} mm`}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="tiempo-bodega-hoy-icon">
                    {infoTiempoHoy?.icono}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KPIs principales */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h2 className="h5 mb-0">Resumen general</h2>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div
                className="card h-100 clickable"
                style={{ cursor: "pointer" }}
                onClick={() => irA("/app/vinedo")}
              >
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">Viñedo</h6>
                  <h3 className="card-title mb-0">{numParcelas}</h3>
                  <p className="mb-0 text-muted">Parcelas registradas</p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="card h-100 clickable"
                style={{ cursor: "pointer" }}
                onClick={() => irA("/app/inventario/productos")}
              >
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">Inventario</h6>
                  <h3 className="card-title mb-0">
                    {numVinos} <small className="text-muted">vinos</small>
                  </h3>
                  <p className="mb-0 text-muted">
                    {numMateriales} materiales activos
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="card h-100 clickable"
                style={{ cursor: "pointer" }}
                onClick={() => irA("/app/clientes")}
              >
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">Clientes</h6>
                  <h3 className="card-title mb-0">{numClientesActivos}</h3>
                  <p className="mb-0 text-muted">Clientes activos</p>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div
                className="card h-100 clickable"
                style={{ cursor: "pointer" }}
                onClick={() => irA("/app/comercial/entregas")}
              >
                <div className="card-body">
                  <h6 className="card-subtitle mb-2 text-muted">Entregas</h6>
                  <h3 className="card-title mb-0">
                    {estadisticasEntregas.total}
                  </h3>
                  <p className="mb-0 text-muted">Entregas / albaranes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de entregas */}
          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">Estado de las entregas</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Borradores</span>
                      <span className="badge bg-secondary">
                        {estadisticasEntregas.borrador}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Confirmados</span>
                      <span className="badge bg-warning text-dark">
                        {estadisticasEntregas.confirmado}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Entregados</span>
                      <span className="badge bg-success">
                        {estadisticasEntregas.entregado}
                      </span>
                    </li>
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Anulados</span>
                      <span className="badge bg-danger">
                        {estadisticasEntregas.anulado}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Últimas entregas */}
            <div className="col-lg-8">
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title mb-0">Últimas entregas</h5>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => irA("/app/comercial/entregas")}
                    >
                      Ver todas
                    </button>
                  </div>

                  {ultimasEntregas.length === 0 ? (
                    <p className="mb-0 text-muted">
                      No hay entregas registradas todavía.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Nº albarán</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Estado</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ultimasEntregas.map((e) => (
                            <tr key={e.id}>
                              <td>{e.numeroAlbaran || "Borrador"}</td>
                              <td>
                                {e.fecha
                                  ? new Date(e.fecha).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td>{e.clienteNombre || "-"}</td>
                              <td>
                                {e.estado === "BORRADOR" && (
                                  <span className="badge bg-secondary">
                                    BORRADOR
                                  </span>
                                )}
                                {e.estado === "CONFIRMADO" && (
                                  <span className="badge bg-warning text-dark">
                                    CONFIRMADO
                                  </span>
                                )}
                                {e.estado === "ENTREGADO" && (
                                  <span className="badge bg-success">
                                    ENTREGADO
                                  </span>
                                )}
                                {e.estado === "ANULADO" && (
                                  <span className="badge bg-danger">
                                    ANULADO
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    irA(`/app/comercial/entregas/${e.id}`)
                                  }
                                >
                                  Ver / Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardInicio;
