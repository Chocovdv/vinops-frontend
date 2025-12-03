// src/components/bodega/BodegaMapa.jsx
import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  getAuthDataOrRedirect,
  authHeaders,
} from "../../lib/auth";

function BodegaMapa() {
  const [bodega, setBodega] = useState(null);
  const [mapUrl, setMapUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    cargarMapa(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarMapa(auth) {
    const { token, slug } = auth;

    setLoading(true);
    setError("");

    try {
      // 1) Datos de la bodega desde TU API
      const url = `${API_BASE_URL}/api/bodegas/slug/${encodeURIComponent(
        slug
      )}`;

      const resp = await fetch(url, {
        headers: authHeaders(token),
      });

      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resp.ok) {
        throw new Error("No se han podido cargar los datos de la bodega.");
      }

      const data = await resp.json();
      setBodega(data);

      // 2) Dirección completa → API Nominatim (geocodificación)
      const address = `${data.direccion}, ${data.cp} ${data.localidad}, ${data.provincia}, ${data.pais}`;
      const query = encodeURIComponent(address);

      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}&email=adrianvinops@gmail.com`
      );

      if (!geoResp.ok) {
        throw new Error("No se ha podido obtener la ubicación de la bodega.");
      }

      const geoData = await geoResp.json();

      if (!geoData || geoData.length === 0) {
        throw new Error(
          "La dirección de la bodega no se ha encontrado en el mapa."
        );
      }

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);

      // 3) URL de mapa embebido de OpenStreetMap, MUCHO MÁS ZOOM
      // delta pequeño => zoom fuerte sobre el punto
      const deltaLat = 0.0015; // ~150 m
      const deltaLon = 0.0015;

      const left = lon - deltaLon;
      const right = lon + deltaLon;
      const bottom = lat - deltaLat;
      const top = lat + deltaLat;

      const zoom = 17; // edificio / parcela
      const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${lat},${lon}&zoom=${zoom}`;

      setMapUrl(embedUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al cargar el mapa de la bodega.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !mapUrl) {
    return (
      <div className="card mb-4">
        <div className="card-body d-flex align-items-center">
          <div
            className="spinner-border me-2"
            role="status"
            aria-hidden="true"
          />
          <span>Cargando mapa de la bodega...</span>
        </div>
      </div>
    );
  }

  if (error || !mapUrl) {
    return (
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-2">Ubicación de la bodega</h2>
          <p className="mb-0 text-danger">
            {error || "No se ha podido mostrar el mapa."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="h5 mb-3">Ubicación de la bodega</h2>
        <div className="text-center">
          <iframe
            src={mapUrl}
            title={
              bodega
                ? `Mapa de la bodega ${bodega.nombre}`
                : "Mapa de la bodega"
            }
            style={{
              border: 0,
              width: "100%",
              height: "380px", // si quieres más alto, sube a 420–450
              borderRadius: "0.5rem",
            }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>

          {bodega && (
            <p className="mt-2 mb-0 text-muted small">
              {bodega.direccion}, {bodega.cp} {bodega.localidad} (
              {bodega.provincia}, {bodega.pais})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BodegaMapa;
