// src/components/vinedo/VendimiaEstimacionParcela.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";

// Formatea fechas tipo "2024-09-20" → "20/09/2024"
function formatDate(isoDate) {
  if (!isoDate) return "-";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("es-ES");
  } catch {
    return isoDate;
  }
}

// Redondeo sencillo
function formatNumber(value, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(decimals);
}

export default function VendimiaEstimacionParcela({ parcelaId }) {
  const [authData, setAuthData] = useState(null);
  const [estimacion, setEstimacion] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);

    if (!parcelaId) return;

    const cargar = async () => {
      setLoading(true);
      setError("");
      setEstimacion(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/${auth.bodega.slug}/vinedo/parcelas/${parcelaId}/vendimia-estimada`,
          {
            headers: authHeaders(auth.token),
          }
        );

        // Si no hay muestreos o no se puede estimar, puede venir 404 o 400
        if (res.status === 404) {
          setError(
            "Todavía no hay muestreos suficientes para estimar la vendimia en esta parcela."
          );
          setEstimacion(null);
          return;
        }

        if (!res.ok) {
          let msg = `Error ${res.status}`;
          try {
            const body = await res.json();
            if (body && body.message) msg = body.message;
          } catch {
            // ignoramos parseo
          }
          throw new Error(msg);
        }

        const data = await res.json();
        setEstimacion(data);
      } catch (err) {
        setError(err.message || "Error al cargar la estimación de vendimia.");
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [parcelaId]);

  if (!parcelaId) return null;

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span>
          🍇 Estimación de vendimia (IA)
        </span>
      </div>
      <div className="card-body">
        {loading && <p className="mb-0">Calculando estimación de vendimia…</p>}

        {!loading && error && (
          <p className="text-muted mb-0">{error}</p>
        )}

        {!loading && !error && estimacion && (
          <>
            <p className="mb-1">
              Último muestreo:{" "}
              <strong>{formatDate(estimacion.fechaMuestreo)}</strong>
            </p>
            <p className="mb-1">
              Parámetro:{" "}
              <strong>{estimacion.parametro}</strong>{" "}
              (<strong>{formatNumber(estimacion.valorParametro, 1)}</strong>)
            </p>
            {estimacion.gradoProbableMuestreo && (
              <p className="mb-1">
                Grado probable del muestreo:{" "}
                <strong>
                  {formatNumber(estimacion.gradoProbableMuestreo, 2)} º
                </strong>
              </p>
            )}
            <p className="mb-1">
              Días estimados hasta vendimia:{" "}
              <strong>{formatNumber(estimacion.diasRestantes, 0)} días</strong>
            </p>
            <p className="mb-0">
              Fecha estimada de vendimia:{" "}
              <strong>{formatDate(estimacion.fechaVendimiaEstimada)}</strong>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
