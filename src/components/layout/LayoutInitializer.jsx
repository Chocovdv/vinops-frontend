// src/components/layout/LayoutInitializer.jsx
import { useEffect } from "react";
import { initPrivateLayout } from "../../lib/layout.js";

export default function LayoutInitializer() {
  useEffect(() => {
    // Esto se ejecuta en el cliente cuando la página carga
    initPrivateLayout();
  }, []);

  return null; // No pinta nada, solo ejecuta el efecto
}
