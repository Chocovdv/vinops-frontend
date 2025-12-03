// src/components/vinedo/TiempoBodega.jsx
import React, { useEffect, useState } from "react";
import {
    API_BASE_URL,
    getAuthDataOrRedirect,
    authHeaders,
} from "../../lib/auth";

// Mapea el código de Open-Meteo a icono + descripción sencilla
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
    if (
        (codigo >= 71 && codigo <= 77) ||
        codigo === 85 ||
        codigo === 86
    )
        return { icono: "🌨️", descripcion: "Nieve" };
    if (codigo === 95 || codigo === 96 || codigo === 99)
        return { icono: "⛈️", descripcion: "Tormenta" };

    return { icono: "🌡️", descripcion: "Condición variable" };
}

/**
 * Busca coordenadas probando varias consultas y, si se indica, priorizando un country_code
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
        } catch {
            // si falla una consulta, probamos la siguiente
        }
    }

    throw new Error(
        `No se han encontrado coordenadas para "${consultas[0]}".`
    );
}

function TiempoBodega() {
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [etiquetaLugar, setEtiquetaLugar] = useState("");
    const [pronostico, setPronostico] = useState([]); // {fecha, tMax, tMin, lluvia, codigo}

    useEffect(() => {
        cargarTiempo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function cargarTiempo() {
        setCargando(true);
        setError("");
        setPronostico([]);

        const auth = getAuthDataOrRedirect();
        if (!auth) {
            setError("No hay sesión activa.");
            setCargando(false);
            return;
        }

        const { token, slug } = auth;

        try {
            // 1) Obtener datos de la bodega por slug
            const resBodega = await fetch(
                `${API_BASE_URL}/api/bodegas/slug/${slug}`,
                {
                    headers: authHeaders(token),
                }
            );

            if (resBodega.status === 401 || resBodega.status === 403) {
                window.location.href = "/login";
                return;
            }
            if (!resBodega.ok) {
                throw new Error("No se pudo obtener la información de la bodega.");
            }

            const bodega = await resBodega.json();

            const ciudad = (bodega.localidad || "").trim();
            const provincia = (bodega.provincia || "").trim();
            const paisOriginal = (bodega.pais || "").trim();

            // "España" -> "Spain" para la API
            let paisEn = paisOriginal;
            if (paisOriginal.toLowerCase().startsWith("espa")) {
                paisEn = "Spain";
            }

            // country_code preferido (para que no te mande a Zamora de México)
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

            // 2) Buscar coordenadas
            const { latitude, longitude, etiqueta } = await buscarCoordenadas(
                consultas,
                countryCodePreferido
            );
            setEtiquetaLugar(etiqueta);

            // 3) Previsión diaria
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

            const combinado = dias.map((fechaStr, idx) => ({
                fecha: fechaStr,
                tMax: tMax[idx],
                tMin: tMin[idx],
                lluvia: lluvia[idx],
                codigo: codigos[idx],
            }));

            setPronostico(combinado);
        } catch (err) {
            console.error(err);
            setError(err.message || "Error cargando el tiempo.");
        } finally {
            setCargando(false);
        }
    }

    const hoy = pronostico.length > 0 ? pronostico[0] : null;
    const restoDias = pronostico.length > 1 ? pronostico.slice(1, 7) : [];
    const infoHoy = hoy ? obtenerInfoTiempo(hoy.codigo) : null;

    return (
        <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Tiempo esta semana</h6>
                {etiquetaLugar && (
                    <small className="text-muted">{etiquetaLugar}</small>
                )}
            </div>

            {cargando && <p className="small mb-0">Cargando previsión…</p>}

            {error && (
                <p className="small text-danger mb-0">
                    {error}
                </p>
            )}

            {!cargando && !error && hoy && (
                <>
                    {/* Tarjeta grande de hoy */}
                    <div className="tiempo-bodega-hoy d-flex justify-content-between align-items-center rounded-3 p-3 mb-2">
                        <div>
                            <div className="small text-uppercase fw-semibold opacity-75">
                                Hoy · {infoHoy?.descripcion}
                            </div>
                            <div className="d-flex align-items-baseline gap-2 mt-1">
                                <span className="tiempo-bodega-temp-actual">
                                    {hoy.tMax != null
                                        ? `${Math.round(hoy.tMax)} °C`
                                        : "-"}
                                </span>
                                <span className="tiempo-bodega-temp-minmax">
                                    Mín{" "}
                                    {hoy.tMin != null
                                        ? `${Math.round(hoy.tMin)} °C`
                                        : "-"}{" "}
                                    · Lluvia{" "}
                                    {hoy.lluvia != null ? `${hoy.lluvia} mm` : "-"}
                                </span>
                            </div>
                        </div>
                        <div className="text-end">
                            <div className="tiempo-bodega-hoy-icon">
                                {infoHoy?.icono}
                            </div>
                        </div>
                    </div>

                    {/* Resto de la semana */}
                    {restoDias.length > 0 && (
                        <div className="tiempo-bodega-dias row row-cols-2 row-cols-md-4 row-cols-lg-6 g-2 mt-1">
                            {restoDias.map((dia) => {
                                const info = obtenerInfoTiempo(dia.codigo);
                                const fecha = new Date(dia.fecha);
                                const etiquetaFecha = fecha.toLocaleDateString("es-ES", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "2-digit",
                                });

                                const max = dia.tMax != null ? Math.round(dia.tMax) : "-";
                                const min = dia.tMin != null ? Math.round(dia.tMin) : "-";
                                const rain =
                                    dia.lluvia != null ? `${dia.lluvia} mm` : "-";

                                return (
                                    <div className="col" key={dia.fecha}>
                                        <div className="tiempo-bodega-dia-card text-center small">
                                            <strong className="text-uppercase d-block">
                                                {etiquetaFecha}
                                            </strong>
                                            <div className="mt-1">
                                                <span className="d-block">{info.icono}</span>
                                            </div>
                                            <div className="mt-1">
                                                <div>Máx {max} °C</div>
                                                <div className="text-muted">Mín {min} °C</div>
                                                <div className="text-muted">Lluvia {rain}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default TiempoBodega;
