// src/components/comercial/EntregaDetalle.jsx
import React, { useEffect, useState, useRef } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

const IVA_PORCENTAJE = 0.21; // 21% IVA España

// === Helpers de presentación ===
function getEstadoBadgeClass(estado) {
  switch (estado) {
    case "BORRADOR":
      return "badge bg-secondary";
    case "CONFIRMADO":
      return "badge bg-warning text-dark";
    case "ENTREGADO":
      return "badge bg-success";
    case "ANULADO":
      return "badge bg-danger";
    default:
      return "badge bg-light text-dark";
  }
}

function formatearFechaCorta(iso) {
  if (!iso) return "";
  if (iso.length >= 10) return iso.substring(0, 10);
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatearImporte(num) {
  if (num == null || isNaN(num)) return "";
  return num.toFixed(2) + " €";
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

function EntregaDetalle({ entregaId }) {
  // === Auth / rol ===
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // === Datos principales ===
  const [entrega, setEntrega] = useState(null);
  const [lineas, setLineas] = useState([]);

  const [clientes, setClientes] = useState([]);
  const [productosVino, setProductosVino] = useState([]);
  const [lotesPorProducto, setLotesPorProducto] = useState({}); // {productoId: [lotes]}

  // === Empaquetado ===
  const [configsEmpaquetado, setConfigsEmpaquetado] = useState([]); // configs globales (caja + botellas_por_caja)
  const [empaquetados, setEmpaquetados] = useState([]); // líneas de empaquetado de esta entrega

  const [formEmpaquetado, setFormEmpaquetado] = useState({
    configEmpaquetadoId: "",
    cantidadCajas: "",
  });
  const [erroresEmpaquetado, setErroresEmpaquetado] = useState({});
  const [savingEmpaquetado, setSavingEmpaquetado] = useState(false);

  const [empaquetadoEditandoId, setEmpaquetadoEditandoId] = useState(null);
  const [formEmpaquetadoEdicion, setFormEmpaquetadoEdicion] = useState({
    cantidadCajas: "",
  });
  const [erroresEmpaquetadoEdicion, setErroresEmpaquetadoEdicion] =
    useState({});
  const [savingEmpaquetadoEdicion, setSavingEmpaquetadoEdicion] =
    useState(false);

  // === Estados generales ===
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // === Cabecera ===
  const [modoEdicionCabecera, setModoEdicionCabecera] = useState(false);
  const [formCabecera, setFormCabecera] = useState({
    clienteId: "",
    fecha: "",
    conPrecios: true,
    observaciones: "",
  });
  const [erroresCabecera, setErroresCabecera] = useState({});
  const [savingCabecera, setSavingCabecera] = useState(false);

  // === Añadir línea normal ===
  const [formLinea, setFormLinea] = useState({
    productoId: "",
    loteId: "",
    cantidadBotellas: "",
    tarifa: "",
    precioBotellaAplicado: "",
  });
  const [erroresLinea, setErroresLinea] = useState({});
  const [savingLinea, setSavingLinea] = useState(false);

  // === Editar línea existente ===
  const [lineaEditandoId, setLineaEditandoId] = useState(null);
  const [formLineaEdicion, setFormLineaEdicion] = useState({
    cantidadBotellas: "",
    precioBotellaAplicado: "",
  });
  const [erroresLineaEdicion, setErroresLineaEdicion] = useState({});
  const [savingLineaEdicion, setSavingLineaEdicion] = useState(false);

  // === Devoluciones (solo ENTREGADO) ===
  const [formDevolucion, setFormDevolucion] = useState({
    productoId: "",
    loteId: "",
    cantidadDevuelta: "",
  });
  const [erroresDevolucion, setErroresDevolucion] = useState({});
  const [savingDevolucion, setSavingDevolucion] = useState(false);

  // === Cambios de estado ===
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // === Ref para el contenido del albarán PDF limpio ===
  const albaranRef = useRef(null);

  // ---------------------------
  // Carga auth
  // ---------------------------
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;
    setAuthData(auth);
    setUserRole(auth.role || null);
  }, []);

  // ---------------------------
  // Carga datos entrega + auxiliares
  // ---------------------------
  useEffect(() => {
    if (!authData) return;
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, entregaId]);

  // Sincronizar formCabecera cuando llega entrega
  useEffect(() => {
    if (!entrega) return;
    setFormCabecera({
      clienteId: entrega.clienteId ? String(entrega.clienteId) : "",
      fecha: entrega.fecha ? entrega.fecha.substring(0, 10) : "",
      conPrecios: entrega.conPrecios,
      observaciones: entrega.observaciones || "",
    });
  }, [entrega]);

  // Limpiar mensaje de éxito auto
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(id);
  }, [success]);

  const esAdmin = userRole === "ADMIN";
  const esBorrador = entrega?.estado === "BORRADOR";
  const esConfirmado = entrega?.estado === "CONFIRMADO";
  const esEntregado = entrega?.estado === "ENTREGADO";

  async function cargarDatosIniciales() {
    const { token, slug } = authData;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Entrega
      const respEntrega = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}`,
        { headers }
      );
      if (!respEntrega.ok) throw await buildErrorFromResponse(respEntrega);
      const entregaData = await respEntrega.json();

      // Líneas de vino
      const respLineas = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas`,
        { headers }
      );
      if (!respLineas.ok) throw await buildErrorFromResponse(respLineas);
      const lineasData = await respLineas.json();

      // Clientes activos
      const respClientes = await fetch(
        `${API_BASE_URL}/api/${slug}/clientes/filtrado?activos=true`,
        { headers }
      );
      if (!respClientes.ok) throw await buildErrorFromResponse(respClientes);
      const clientesData = await respClientes.json();

      // Vinos
      const respVinos = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/productos/vinos`,
        { headers }
      );
      if (!respVinos.ok) throw await buildErrorFromResponse(respVinos);
      const vinosData = await respVinos.json();

      // Configuración de empaquetado (cajas/estuches)
      const respConfigs = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/config-empaquetado`,
        { headers }
      );
      if (!respConfigs.ok) throw await buildErrorFromResponse(respConfigs);
      const configsData = await respConfigs.json();

      // Líneas de empaquetado de esta entrega
      const respEmpaq = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/empaquetado`,
        { headers }
      );
      if (!respEmpaq.ok) throw await buildErrorFromResponse(respEmpaq);
      const empaqData = await respEmpaq.json();

      setEntrega(entregaData);
      setLineas(Array.isArray(lineasData) ? lineasData : []);

      const clientesOrdenados = Array.isArray(clientesData)
        ? [...clientesData].sort((a, b) =>
            (a.nombre || "").localeCompare(b.nombre || "", "es", {
              sensitivity: "base",
            })
          )
        : [];
      setClientes(clientesOrdenados);

      const vinosOrdenados = Array.isArray(vinosData)
        ? [...vinosData].sort((a, b) =>
            (a.nombre || "").localeCompare(b.nombre || "", "es", {
              sensitivity: "base",
            })
          )
        : [];
      setProductosVino(vinosOrdenados);

      const configsOrdenados = Array.isArray(configsData)
        ? [...configsData].sort((a, b) => {
            const nombreA = a.cajaMaterialNombre || "";
            const nombreB = b.cajaMaterialNombre || "";
            const cmpNombre = nombreA.localeCompare(nombreB, "es", {
              sensitivity: "base",
            });
            if (cmpNombre !== 0) return cmpNombre;
            return (a.botellasPorCaja || 0) - (b.botellasPorCaja || 0);
          })
        : [];
      setConfigsEmpaquetado(configsOrdenados);

      setEmpaquetados(Array.isArray(empaqData) ? empaqData : []);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al cargar la entrega. Inténtalo de nuevo más tarde."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // GENERAR PDF ALBARÁN – usando la plantilla limpia
  // =====================================================
  async function handleDescargarPdf() {
    if (!entrega || !albaranRef.current) return;

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      // Activamos modo PDF: muestra solo la plantilla .albaran-print
      document.body.classList.add("albaran-pdf-mode");

      const element = albaranRef.current;
      const opt = {
        margin: 10,
        filename: `albaran-${entrega.numeroAlbaran || entrega.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al generar el PDF del albarán. Inténtalo de nuevo."
      );
    } finally {
      // Volvemos al modo normal
      document.body.classList.remove("albaran-pdf-mode");
    }
  }

  // =====================================================
  // CABECERA
  // =====================================================

  function handleCabeceraChange(e) {
    const { name, value, type, checked } = e.target;
    setFormCabecera((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validarCabecera() {
    const errs = {};

    if (!formCabecera.clienteId) {
      errs.clienteId = "El cliente es obligatorio.";
    }

    if (!formCabecera.fecha) {
      errs.fecha = "La fecha es obligatoria.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formCabecera.fecha)) {
      errs.fecha = "Formato de fecha no válido. Usa AAAA-MM-DD.";
    }

    if (
      formCabecera.observaciones &&
      formCabecera.observaciones.length > 1000
    ) {
      errs.observaciones =
        "Las observaciones no pueden superar los 1000 caracteres.";
    }

    setErroresCabecera(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleGuardarCabecera(e) {
    e.preventDefault();
    if (!authData || !entrega) return;
    if (!esBorrador) {
      alert("Solo se puede editar la cabecera de entregas en BORRADOR.");
      return;
    }

    if (!validarCabecera()) return;

    const { token, slug } = authData;
    setSavingCabecera(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        clienteId: Number(formCabecera.clienteId),
        fecha: `${formCabecera.fecha}T00:00:00`,
        conPrecios: !!formCabecera.conPrecios,
        observaciones:
          formCabecera.observaciones &&
          formCabecera.observaciones.trim().length > 0
            ? formCabecera.observaciones.trim()
            : null,
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const data = await resp.json();
      setEntrega(data);
      setSuccess("Cabecera actualizada correctamente.");
      setModoEdicionCabecera(false);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al guardar la cabecera. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingCabecera(false);
    }
  }

  function handleCancelarEdicionCabecera() {
    if (!entrega) return;
    setFormCabecera({
      clienteId: entrega.clienteId ? String(entrega.clienteId) : "",
      fecha: entrega.fecha ? entrega.fecha.substring(0, 10) : "",
      conPrecios: entrega.conPrecios,
      observaciones: entrega.observaciones || "",
    });
    setErroresCabecera({});
    setModoEdicionCabecera(false);
  }

  // =====================================================
  // LÍNEAS NORMALES (VINO)
  // =====================================================

  function handleLineaChange(e) {
    const { name, value } = e.target;

    // Cambio de producto
    if (name === "productoId") {
      const nuevoProductoId = value;

      setFormLinea((prev) => {
        const producto = productosVino.find(
          (p) => String(p.id) === String(nuevoProductoId)
        );

        const clienteIdNum = Number(
          formCabecera.clienteId || entrega?.clienteId
        );
        const cliente = clientes.find((c) => c.id === clienteIdNum);

        let nuevaTarifa = "";
        let nuevoPrecio = "";

        if (producto && cliente) {
          if (
            cliente.tipo === "PROFESIONAL" &&
            producto.precioProfesional != null
          ) {
            nuevaTarifa = "PROFESIONAL";
            nuevoPrecio = String(producto.precioProfesional);
          } else if (
            cliente.tipo === "PARTICULAR" &&
            producto.precioParticular != null
          ) {
            nuevaTarifa = "PARTICULAR";
            nuevoPrecio = String(producto.precioParticular);
          }
        }

        return {
          ...prev,
          productoId: nuevoProductoId,
          loteId: "",
          tarifa: nuevaTarifa,
          precioBotellaAplicado: nuevoPrecio,
        };
      });

      if (nuevoProductoId) {
        cargarLotesParaProducto(nuevoProductoId);
      }

      return;
    }

    if (name === "loteId") {
      setFormLinea((prev) => ({ ...prev, loteId: value }));
      return;
    }

    if (name === "tarifa") {
      const tarifaSeleccionada = value;
      setFormLinea((prev) => {
        const producto = productosVino.find(
          (p) => String(p.id) === String(prev.productoId)
        );
        let nuevoPrecio = prev.precioBotellaAplicado;

        if (producto) {
          if (
            tarifaSeleccionada === "PROFESIONAL" &&
            producto.precioProfesional != null
          ) {
            nuevoPrecio = String(producto.precioProfesional);
          } else if (
            tarifaSeleccionada === "PARTICULAR" &&
            producto.precioParticular != null
          ) {
            nuevoPrecio = String(producto.precioParticular);
          }
        }

        return {
          ...prev,
          tarifa: tarifaSeleccionada,
          precioBotellaAplicado: nuevoPrecio,
        };
      });
      return;
    }

    setFormLinea((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function cargarLotesParaProducto(productoId) {
    if (!authData) return;
    const { token, slug } = authData;

    if (lotesPorProducto[productoId]) return;

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/inventario/lotes/producto/${productoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const data = await resp.json();
      const lotesOrdenados = Array.isArray(data)
        ? [...data].sort((a, b) =>
            (a.codLote || "").localeCompare(b.codLote || "", "es", {
              sensitivity: "base",
            })
          )
        : [];

      setLotesPorProducto((prev) => ({
        ...prev,
        [productoId]: lotesOrdenados,
      }));
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Error al cargar los lotes del vino seleccionado."
      );
    }
  }

  function validarLineaNueva() {
    const errs = {};

    if (!formLinea.productoId) {
      errs.productoId = "El producto (vino) es obligatorio.";
    }
    if (!formLinea.loteId) {
      errs.loteId = "El lote es obligatorio.";
    }

    if (formLinea.cantidadBotellas === "") {
      errs.cantidadBotellas = "La cantidad de botellas es obligatoria.";
    } else {
      const n = Number(formLinea.cantidadBotellas);
      if (!Number.isInteger(n) || n <= 0) {
        errs.cantidadBotellas =
          "La cantidad debe ser un número entero mayor que 0.";
      }
    }

    if (formLinea.precioBotellaAplicado === "") {
      errs.precioBotellaAplicado =
        "El precio por botella es obligatorio (puede ser 0).";
    } else {
      const p = Number(formLinea.precioBotellaAplicado);
      if (isNaN(p) || p < 0) {
        errs.precioBotellaAplicado =
          "El precio por botella debe ser un número mayor o igual que 0.";
      }
    }

    setErroresLinea(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCrearLinea(e) {
    e.preventDefault();
    if (!authData || !entrega) return;

    if (!esBorrador) {
      alert("Solo se pueden modificar líneas en entregas en BORRADOR.");
      return;
    }

    if (!validarLineaNueva()) return;

    const { token, slug } = authData;
    setSavingLinea(true);
    setError("");
    setSuccess("");

    try {
      const productoIdNum = Number(formLinea.productoId);
      const loteIdNum = Number(formLinea.loteId);
      const cantidadNueva = Number(formLinea.cantidadBotellas);
      const precioNum = Number(formLinea.precioBotellaAplicado);

      // Si existe ya una línea con mismo producto+lote+precio → sumamos
      const lineaExistente = lineas.find(
        (l) =>
          l.productoId === productoIdNum &&
          l.loteId === loteIdNum &&
          Number(l.precioBotellaAplicado ?? 0) === precioNum
      );

      if (lineaExistente) {
        const nuevaCantidadTotal =
          Number(lineaExistente.cantidadBotellas || 0) + cantidadNueva;

        const bodyUpdate = {
          productoId: lineaExistente.productoId,
          loteId: lineaExistente.loteId,
          cantidadBotellas: nuevaCantidadTotal,
          precioBotellaAplicado: precioNum,
        };

        const respUpdate = await fetch(
          `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas/${lineaExistente.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyUpdate),
          }
        );
        if (!respUpdate.ok) throw await buildErrorFromResponse(respUpdate);

        const lineaActualizada = await respUpdate.json();
        setLineas((prev) =>
          prev.map((l) => (l.id === lineaActualizada.id ? lineaActualizada : l))
        );
        setSuccess("Cantidad sumada a la línea existente.");
      } else {
        const bodyNew = {
          productoId: productoIdNum,
          loteId: loteIdNum,
          cantidadBotellas: cantidadNueva,
          precioBotellaAplicado: precioNum,
        };

        const resp = await fetch(
          `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyNew),
          }
        );
        if (!resp.ok) throw await buildErrorFromResponse(resp);

        const nuevaLinea = await resp.json();
        setLineas((prev) => [...prev, nuevaLinea]);
        setSuccess("Línea creada correctamente.");
      }

      setFormLinea({
        productoId: "",
        loteId: "",
        cantidadBotellas: "",
        tarifa: "",
        precioBotellaAplicado: "",
      });
      setErroresLinea({});
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al crear la línea. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingLinea(false);
    }
  }

  function iniciarEdicionLinea(linea) {
    setLineaEditandoId(linea.id);
    setFormLineaEdicion({
      cantidadBotellas:
        linea.cantidadBotellas != null ? String(linea.cantidadBotellas) : "",
      precioBotellaAplicado:
        linea.precioBotellaAplicado != null
          ? String(linea.precioBotellaAplicado)
          : "",
    });
    setErroresLineaEdicion({});
  }

  function cancelarEdicionLinea() {
    setLineaEditandoId(null);
    setFormLineaEdicion({
      cantidadBotellas: "",
      precioBotellaAplicado: "",
    });
    setErroresLineaEdicion({});
  }

  function validarLineaEdicion() {
    const errs = {};

    if (formLineaEdicion.cantidadBotellas === "") {
      errs.cantidadBotellas = "La cantidad de botellas es obligatoria.";
    } else {
      const n = Number(formLineaEdicion.cantidadBotellas);
      if (!Number.isInteger(n)) {
        errs.cantidadBotellas = "La cantidad debe ser un número entero.";
      } else if (n === 0) {
        errs.cantidadBotellas = "La cantidad no puede ser cero.";
      }
    }

    if (formLineaEdicion.precioBotellaAplicado === "") {
      errs.precioBotellaAplicado =
        "El precio por botella es obligatorio (puede ser 0).";
    } else {
      const p = Number(formLineaEdicion.precioBotellaAplicado);
      if (isNaN(p) || p < 0) {
        errs.precioBotellaAplicado =
          "El precio por botella debe ser un número mayor o igual que 0.";
      }
    }

    setErroresLineaEdicion(errs);
    return Object.keys(errs).length === 0;
  }

  async function guardarLineaEditada(linea) {
    if (!authData) return;
    if (!esBorrador) {
      alert("Solo se pueden modificar líneas en entregas en BORRADOR.");
      return;
    }

    if (!validarLineaEdicion()) return;

    const { token, slug } = authData;
    setSavingLineaEdicion(true);
    setError("");
    setSuccess("");

  try {
      const body = {
        productoId: linea.productoId,
        loteId: linea.loteId,
        cantidadBotellas: Number(formLineaEdicion.cantidadBotellas),
        precioBotellaAplicado: Number(
          formLineaEdicion.precioBotellaAplicado
        ),
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas/${linea.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const lineaActualizada = await resp.json();
      setLineas((prev) =>
        prev.map((l) => (l.id === lineaActualizada.id ? lineaActualizada : l))
      );
      setSuccess("Línea actualizada correctamente.");
      cancelarEdicionLinea();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al actualizar la línea. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingLineaEdicion(false);
    }
  }

  async function eliminarLinea(linea) {
    if (!authData) return;
    if (!esBorrador) {
      alert("Solo se pueden eliminar líneas en BORRADOR.");
      return;
    }

    const confirmado = window.confirm(
      "¿Seguro que quieres eliminar esta línea?"
    );
    if (!confirmado) return;

    const { token, slug } = authData;
    setError("");
    setSuccess("");

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas/${linea.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      setLineas((prev) => prev.filter((l) => l.id !== linea.id));
      setSuccess("Línea eliminada correctamente.");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al eliminar la línea. Inténtalo de nuevo más tarde."
      );
    }
  }

  // =====================================================
  // EMPAQUETADO (cajas / estuches)
  // =====================================================

  function handleEmpaquetadoChange(e) {
    const { name, value } = e.target;
    setFormEmpaquetado((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarEmpaquetadoNuevo() {
    const errs = {};

    if (!formEmpaquetado.configEmpaquetadoId) {
      errs.configEmpaquetadoId = "La caja/estuche es obligatoria.";
    }

    if (formEmpaquetado.cantidadCajas === "") {
      errs.cantidadCajas = "La cantidad de cajas es obligatoria.";
    } else {
      const n = Number(formEmpaquetado.cantidadCajas);
      if (!Number.isInteger(n) || n <= 0) {
        errs.cantidadCajas =
          "La cantidad de cajas debe ser un número entero mayor que 0.";
      }
    }

    setErroresEmpaquetado(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCrearEmpaquetado(e) {
    e.preventDefault();
    if (!authData || !entrega) return;

    if (!esBorrador) {
      alert(
        "Solo se puede modificar el empaquetado en entregas en estado BORRADOR."
      );
      return;
    }

    if (!validarEmpaquetadoNuevo()) return;

    const { token, slug } = authData;
    setSavingEmpaquetado(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        configEmpaquetadoId: Number(formEmpaquetado.configEmpaquetadoId),
        cantidadCajas: Number(formEmpaquetado.cantidadCajas),
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/empaquetado`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const lineaEmpaq = await resp.json();

      // Puede ser nueva o actualizar una existente (el servicio suma cantidades)
      setEmpaquetados((prev) => {
        const idx = prev.findIndex((e) => e.id === lineaEmpaq.id);
        if (idx >= 0) {
          const copia = [...prev];
          copia[idx] = lineaEmpaq;
          return copia;
        }
        return [...prev, lineaEmpaq];
      });

      setSuccess("Empaquetado añadido correctamente.");
      setFormEmpaquetado({
        configEmpaquetadoId: "",
        cantidadCajas: "",
      });
      setErroresEmpaquetado({});
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al añadir el empaquetado. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingEmpaquetado(false);
    }
  }

  function iniciarEdicionEmpaquetado(linea) {
    setEmpaquetadoEditandoId(linea.id);
    setFormEmpaquetadoEdicion({
      cantidadCajas:
        linea.cantidadCajas != null ? String(linea.cantidadCajas) : "",
    });
    setErroresEmpaquetadoEdicion({});
  }

  function cancelarEdicionEmpaquetado() {
    setEmpaquetadoEditandoId(null);
    setFormEmpaquetadoEdicion({
      cantidadCajas: "",
    });
    setErroresEmpaquetadoEdicion({});
  }

  function validarEmpaquetadoEdicion() {
    const errs = {};

    if (formEmpaquetadoEdicion.cantidadCajas === "") {
      errs.cantidadCajas = "La cantidad de cajas es obligatoria.";
    } else {
      const n = Number(formEmpaquetadoEdicion.cantidadCajas);
      if (!Number.isInteger(n) || n <= 0) {
        errs.cantidadCajas =
          "La cantidad de cajas debe ser un número entero mayor que 0.";
      }
    }

    setErroresEmpaquetadoEdicion(errs);
    return Object.keys(errs).length === 0;
  }

  async function guardarEmpaquetadoEditado(linea) {
    if (!authData) return;
    if (!esBorrador) {
      alert(
        "Solo se puede modificar el empaquetado en entregas en estado BORRADOR."
      );
      return;
    }

    if (!validarEmpaquetadoEdicion()) return;

    const { token, slug } = authData;
    setSavingEmpaquetadoEdicion(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        configEmpaquetadoId: linea.configEmpaquetadoId,
        cantidadCajas: Number(formEmpaquetadoEdicion.cantidadCajas),
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/empaquetado/${linea.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const lineaActualizada = await resp.json();
      setEmpaquetados((prev) =>
        prev.map((e) => (e.id === lineaActualizada.id ? lineaActualizada : e))
      );
      setSuccess("Línea de empaquetado actualizada correctamente.");
      cancelarEdicionEmpaquetado();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al actualizar el empaquetado. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingEmpaquetadoEdicion(false);
    }
  }

  async function eliminarEmpaquetado(linea) {
    if (!authData) return;
    if (!esBorrador) {
      alert(
        "Solo se puede eliminar empaquetado en entregas en estado BORRADOR."
      );
      return;
    }

    const confirmado = window.confirm(
      "¿Seguro que quieres eliminar este registro de empaquetado?"
    );
    if (!confirmado) return;

    const { token, slug } = authData;
    setError("");
    setSuccess("");

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/empaquetado/${linea.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      setEmpaquetados((prev) => prev.filter((e) => e.id !== linea.id));
      setSuccess("Empaquetado eliminado correctamente.");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al eliminar el empaquetado. Inténtalo de nuevo más tarde."
      );
    }
  }

  // =====================================================
  // DEVOLUCIONES (solo ENTREGADO)
  // =====================================================

  function handleDevolucionChange(e) {
    const { name, value } = e.target;

    if (name === "productoId") {
      const nuevoProductoId = value;
      setFormDevolucion((prev) => ({
        ...prev,
        productoId: nuevoProductoId,
        loteId: "",
      }));

      if (nuevoProductoId) {
        cargarLotesParaProducto(nuevoProductoId);
      }
      return;
    }

    if (name === "loteId") {
      setFormDevolucion((prev) => ({
        ...prev,
        loteId: value,
      }));
      return;
    }

    setFormDevolucion((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validarDevolucion() {
    const errs = {};

    if (!formDevolucion.productoId) {
      errs.productoId = "El producto es obligatorio.";
    }
    if (!formDevolucion.loteId) {
      errs.loteId = "El lote es obligatorio.";
    }

    if (formDevolucion.cantidadDevuelta === "") {
      errs.cantidadDevuelta = "La cantidad devuelta es obligatoria.";
    } else {
      const n = Number(formDevolucion.cantidadDevuelta);
      if (!Number.isInteger(n) || n <= 0) {
        errs.cantidadDevuelta =
          "La cantidad devuelta debe ser un número entero mayor que 0.";
      }
    }

    setErroresDevolucion(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCrearDevolucion(e) {
    e.preventDefault();
    if (!authData || !entrega) return;

    // Solo tiene sentido devolver sobre entregas ENTREGADAS
    if (!esEntregado) {
      alert(
        "Solo se pueden registrar devoluciones sobre entregas en estado ENTREGADO."
      );
      return;
    }

    if (!validarDevolucion()) return;

    const { token, slug } = authData;
    setSavingDevolucion(true);
    setError("");
    setSuccess("");

    try {
      const productoIdNum = Number(formDevolucion.productoId);
      const loteIdNum = Number(formDevolucion.loteId);
      const cantidadDevueltaNum = Number(formDevolucion.cantidadDevuelta);

      // Buscar línea base (mismo vino + lote)
      const lineaBase = lineas.find(
        (l) => l.productoId === productoIdNum && l.loteId === loteIdNum
      );

      if (!lineaBase) {
        setError(
          "No existe ninguna línea en esta entrega para ese vino y lote sobre la que aplicar la devolución."
        );
        setSavingDevolucion(false);
        return;
      }

      const cantidadActual = Number(lineaBase.cantidadBotellas || 0);
      if (cantidadDevueltaNum > cantidadActual) {
        setError(
          "No puedes devolver más botellas de las que hay en esa línea."
        );
        setSavingDevolucion(false);
        return;
      }

      // Llamada al endpoint específico de devoluciones
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/lineas/devolucion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productoId: productoIdNum,
            loteId: loteIdNum,
            cantidadDevuelta: cantidadDevueltaNum,
          }),
        }
      );

      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const nuevasLineas = await resp.json();
      setLineas(Array.isArray(nuevasLineas) ? nuevasLineas : []);
      setSuccess("Devolución registrada correctamente.");

      setFormDevolucion({
        productoId: "",
        loteId: "",
        cantidadDevuelta: "",
      });
      setErroresDevolucion({});
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al registrar la devolución. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSavingDevolucion(false);
    }
  }

  // =====================================================
  // CAMBIO DE ESTADO
  // =====================================================

  async function cambiarEstado(accion) {
    if (!authData || !entrega) return;
    if (!esAdmin) {
      alert("Solo un ADMIN puede cambiar el estado de una entrega.");
      return;
    }

    const { token, slug } = authData;
    let endpoint = "";

    if (accion === "confirmar") {
      if (!esBorrador) {
        alert("Solo se pueden confirmar entregas en estado BORRADOR.");
        return;
      }
      endpoint = "confirmar";
    } else if (accion === "anular") {
      if (!esBorrador && !esConfirmado) {
        alert("Solo se pueden anular entregas en BORRADOR o CONFIRMADO.");
        return;
      }
      endpoint = "anular";
    } else if (accion === "marcar-entregado") {
      if (!esConfirmado) {
        alert("Solo se pueden marcar como ENTREGADAS las entregas CONFIRMADAS.");
        return;
      }
      endpoint = "marcar-entregado";
    } else {
      return;
    }

    let mensajeConfirmacion = "";
    if (accion === "confirmar") {
      mensajeConfirmacion =
        "¿Confirmar la entrega? Se descontará el stock de los lotes de vino y del material de empaquetado (cajas/estuches).";
    } else if (accion === "anular") {
      mensajeConfirmacion =
        "¿Anular la entrega? Si estaba confirmada, se revertirá el stock de vino y de empaquetado.";
    } else if (accion === "marcar-entregado") {
      mensajeConfirmacion =
        "¿Marcar la entrega como ENTREGADA? Esta acción solo cambia el estado.";
    }

    const ok = window.confirm(mensajeConfirmacion);
    if (!ok) return;

    setCambiandoEstado(true);
    setError("");
    setSuccess("");

    try {
      const resp = await fetch(
        `${API_BASE_URL}/api/${slug}/comercial/entregas/${entregaId}/${endpoint}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resp.ok) throw await buildErrorFromResponse(resp);

      const data = await resp.json();
      setEntrega(data);

      if (accion === "confirmar") setSuccess("Entrega confirmada correctamente.");
      else if (accion === "anular") setSuccess("Entrega anulada correctamente.");
      else if (accion === "marcar-entregado")
        setSuccess("Entrega marcada como ENTREGADA.");
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Error al cambiar el estado de la entrega. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setCambiandoEstado(false);
    }
  }

  // =====================================================
  // DERIVADOS PARA RENDER
  // =====================================================

  const lotesParaProductoSeleccionado = formLinea.productoId
    ? lotesPorProducto[formLinea.productoId] || []
    : [];

  const productoSeleccionado =
    formLinea.productoId
      ? productosVino.find((p) => p.id === Number(formLinea.productoId)) ||
        null
      : null;

  const lotesParaProductoDevolucion = formDevolucion.productoId
    ? lotesPorProducto[formDevolucion.productoId] || []
    : [];

  const baseImponibleEntrega =
    entrega && entrega.conPrecios
      ? lineas.reduce((acc, l) => {
          if (
            l.cantidadBotellas != null &&
            l.precioBotellaAplicado != null &&
            !isNaN(l.cantidadBotellas) &&
            !isNaN(l.precioBotellaAplicado)
          ) {
            return acc + l.cantidadBotellas * l.precioBotellaAplicado;
          }
          return acc;
        }, 0)
      : null;

  const ivaEntrega =
    baseImponibleEntrega != null
      ? baseImponibleEntrega * IVA_PORCENTAJE
      : null;

  const totalConIvaEntrega =
    baseImponibleEntrega != null ? baseImponibleEntrega + ivaEntrega : null;

  // Resumen botellas (líneas vs empaquetado)
  const totalBotellasLineas = lineas.reduce(
    (acc, l) => acc + (Number(l.cantidadBotellas) || 0),
    0
  );

  const totalBotellasEmpaquetado = empaquetados.reduce(
    (acc, e) =>
      acc +
      (Number(e.botellasPorCaja) || 0) * (Number(e.cantidadCajas) || 0),
    0
  );

  let mensajeBotellasEmpaquetado = "";
  if (totalBotellasLineas === 0 && totalBotellasEmpaquetado === 0) {
    mensajeBotellasEmpaquetado =
      "Añade líneas de vino y empaquetado para poder relacionar las cajas con las botellas.";
  } else if (totalBotellasLineas > 0 && totalBotellasEmpaquetado === 0) {
    mensajeBotellasEmpaquetado =
      "Añade líneas de empaquetado para relacionar las cajas/estuches con las botellas.";
  } else if (totalBotellasLineas === 0 && totalBotellasEmpaquetado > 0) {
    mensajeBotellasEmpaquetado =
      "Hay empaquetado registrado pero todavía no hay líneas de vino. Revisa los datos.";
  } else if (
    totalBotellasLineas > 0 &&
    totalBotellasEmpaquetado > 0 &&
    totalBotellasLineas === totalBotellasEmpaquetado
  ) {
    mensajeBotellasEmpaquetado =
      "La cantidad de cajas coincide exactamente con las botellas.";
  } else if (
    totalBotellasLineas > 0 &&
    totalBotellasEmpaquetado > 0 &&
    totalBotellasLineas !== totalBotellasEmpaquetado
  ) {
    mensajeBotellasEmpaquetado =
      "La cantidad de cajas no coincide exactamente con las botellas. Revisa los datos.";
  }

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) return <p>Cargando entrega...</p>;

  if (!entrega) {
    return (
      <div className="alert alert-danger" role="alert">
        No se ha encontrado la entrega.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        {/* ===================== VISTA NORMAL (UI) ===================== */}
        <div className="albaran-ui">
          {/* Botón descarga PDF (no va en el PDF) */}
          <div className="d-flex justify-content-end mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={handleDescargarPdf}
            >
              Descargar albarán PDF
            </button>
          </div>

          {/* Contenido del albarán en pantalla (igual que tenías antes) */}
          <div>
            {/* Cabecera de estado */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="h5 mb-1">
                  Entrega #{entrega.id}{" "}
                  {entrega.numeroAlbaran && (
                    <span className="text-muted">
                      · Albarán {entrega.numeroAlbaran}
                    </span>
                  )}
                </h2>
                <div className="d-flex align-items-center gap-2">
                  <span className={getEstadoBadgeClass(entrega.estado)}>
                    {entrega.estado}
                  </span>
                  <span className="text-muted">
                    Fecha: {formatearFechaCorta(entrega.fecha) || "—"}
                  </span>
                </div>
              </div>

              {/* Botones de estado (solo en pantalla) */}
              <div className="d-flex flex-column flex-sm-row gap-2 d-print-none">
                {esAdmin && esBorrador && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={cambiandoEstado}
                      onClick={() => cambiarEstado("confirmar")}
                    >
                      {cambiandoEstado ? "Confirmando..." : "Confirmar"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={cambiandoEstado}
                      onClick={() => cambiarEstado("anular")}
                    >
                      Anular
                    </button>
                  </>
                )}

                {esAdmin && esConfirmado && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      disabled={cambiandoEstado}
                      onClick={() => cambiarEstado("marcar-entregado")}
                    >
                      {cambiandoEstado ? "Actualizando..." : "Marcar entregado"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={cambiandoEstado}
                      onClick={() => cambiarEstado("anular")}
                    >
                      Anular
                    </button>
                  </>
                )}
              </div>
            </div>

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

            {/* DATOS GENERALES */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 mb-0">Datos generales</h3>
                {esBorrador && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setModoEdicionCabecera((prev) => !prev)
                    }
                  >
                    {modoEdicionCabecera ? "Cancelar edición" : "Editar"}
                  </button>
                )}
              </div>

              <form className="row g-3" onSubmit={handleGuardarCabecera}>
                <div className="col-12 col-md-6">
                  <label className="form-label">
                    Cliente <span className="text-danger">*</span>
                  </label>
                  {modoEdicionCabecera && esBorrador ? (
                    <>
                      <select
                        name="clienteId"
                        className={`form-select ${
                          erroresCabecera.clienteId ? "is-invalid" : ""
                        }`}
                        value={formCabecera.clienteId}
                        onChange={handleCabeceraChange}
                      >
                        <option value="">Selecciona un cliente...</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                            {c.cifNif ? ` (${c.cifNif})` : ""}
                            {!c.activo ? " [INACTIVO]" : ""}
                          </option>
                        ))}
                      </select>
                      {erroresCabecera.clienteId && (
                        <div className="invalid-feedback">
                          {erroresCabecera.clienteId}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="form-control-plaintext mb-0">
                      {entrega.clienteNombre || "-"}
                    </p>
                  )}
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label">
                    Fecha <span className="text-danger">*</span>
                  </label>
                  {modoEdicionCabecera && esBorrador ? (
                    <>
                      <input
                        type="date"
                        name="fecha"
                        className={`form-control ${
                          erroresCabecera.fecha ? "is-invalid" : ""
                        }`}
                        value={formCabecera.fecha}
                        onChange={handleCabeceraChange}
                      />
                      {erroresCabecera.fecha && (
                        <div className="invalid-feedback">
                          {erroresCabecera.fecha}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="form-control-plaintext mb-0">
                      {formatearFechaCorta(entrega.fecha) || "—"}
                    </p>
                  )}
                </div>

                <div className="col-6 col-md-3 d-flex align-items-center">
                  {modoEdicionCabecera && esBorrador ? (
                    <div className="form-check mt-4">
                      <input
                        type="checkbox"
                        id="conPrecios"
                        name="conPrecios"
                        className="form-check-input"
                        checked={formCabecera.conPrecios}
                        onChange={handleCabeceraChange}
                      />
                      <label
                        className="form-check-label"
                        htmlFor="conPrecios"
                      >
                        Incluir precios en el albarán
                      </label>
                    </div>
                  ) : (
                    <p className="form-control-plaintext mb-0 mt-4">
                      {entrega.conPrecios ? "Con precios" : "Sin precios"}
                    </p>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label">Observaciones</label>
                  {modoEdicionCabecera && esBorrador ? (
                    <>
                      <textarea
                        name="observaciones"
                        className={`form-control ${
                          erroresCabecera.observaciones ? "is-invalid" : ""
                        }`}
                        rows={3}
                        value={formCabecera.observaciones}
                        onChange={handleCabeceraChange}
                      />
                      {erroresCabecera.observaciones && (
                        <div className="invalid-feedback">
                          {erroresCabecera.observaciones}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="form-control-plaintext mb-0">
                      {entrega.observaciones || "—"}
                    </p>
                  )}
                </div>

                {modoEdicionCabecera && esBorrador && (
                  <div className="col-12 d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleCancelarEdicionCabecera}
                      disabled={savingCabecera}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={savingCabecera}
                    >
                      {savingCabecera ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* LÍNEAS DE VINO */}
            <div className="mb-3">
              <h3 className="h6 mb-2">Líneas de vino</h3>

              <div className="table-responsive mb-3">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Lote</th>
                      <th className="text-end">Cant. botellas</th>
                      {entrega.conPrecios && (
                        <>
                          <th className="text-end">Precio botella</th>
                          <th className="text-end">Importe</th>
                        </>
                      )}
                      <th style={{ width: "1%" }} className="d-print-none">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={entrega.conPrecios ? 6 : 4}
                          className="text-center py-3"
                        >
                          No hay líneas en esta entrega.
                        </td>
                      </tr>
                    ) : (
                      lineas.map((linea) => {
                        const enEdicion = lineaEditandoId === linea.id;
                        const cantidad =
                          linea.cantidadBotellas != null
                            ? linea.cantidadBotellas
                            : "";
                        const precio =
                          linea.precioBotellaAplicado != null
                            ? linea.precioBotellaAplicado
                            : null;
                        const importe =
                          entrega.conPrecios &&
                          precio != null &&
                          cantidad != null
                            ? cantidad * precio
                            : null;

                        return (
                          <tr key={linea.id}>
                            <td>{linea.productoNombre || "-"}</td>
                            <td>{linea.codLote || "-"}</td>

                            <td className="text-end">
                              {enEdicion ? (
                                <>
                                  <input
                                    type="number"
                                    className={`form-control form-control-sm text-end ${
                                      erroresLineaEdicion.cantidadBotellas
                                        ? "is-invalid"
                                        : ""
                                    }`}
                                    value={
                                      formLineaEdicion.cantidadBotellas
                                    }
                                    onChange={(e) =>
                                      setFormLineaEdicion((prev) => ({
                                        ...prev,
                                        cantidadBotellas: e.target.value,
                                      }))
                                    }
                                  />
                                  {erroresLineaEdicion.cantidadBotellas && (
                                    <div className="invalid-feedback">
                                      {
                                        erroresLineaEdicion.cantidadBotellas
                                      }
                                    </div>
                                  )}
                                </>
                              ) : (
                                cantidad
                              )}
                            </td>

                            {entrega.conPrecios && (
                              <>
                                <td className="text-end">
                                  {enEdicion ? (
                                    <>
                                      <input
                                        type="number"
                                        step="0.01"
                                        className={`form-control form-control-sm text-end ${
                                          erroresLineaEdicion
                                            .precioBotellaAplicado
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        value={
                                          formLineaEdicion.precioBotellaAplicado
                                        }
                                        onChange={(e) =>
                                          setFormLineaEdicion((prev) => ({
                                            ...prev,
                                            precioBotellaAplicado:
                                              e.target.value,
                                          }))
                                        }
                                      />
                                      {erroresLineaEdicion
                                        .precioBotellaAplicado && (
                                        <div className="invalid-feedback">
                                          {
                                            erroresLineaEdicion
                                              .precioBotellaAplicado
                                          }
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    formatearImporte(precio ?? 0)
                                  )}
                                </td>
                                <td className="text-end">
                                  {importe != null
                                    ? formatearImporte(importe)
                                    : ""}
                                </td>
                              </>
                            )}

                            <td className="d-print-none">
                              {esBorrador ? (
                                enEdicion ? (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      disabled={savingLineaEdicion}
                                      onClick={() =>
                                        guardarLineaEditada(linea)
                                      }
                                    >
                                      {savingLineaEdicion
                                        ? "Guardando..."
                                        : "Guardar"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={cancelarEdicionLinea}
                                      disabled={savingLineaEdicion}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() =>
                                        iniciarEdicionLinea(linea)
                                      }
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() => eliminarLinea(linea)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted small">
                                  Solo lectura
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* RESUMEN ECONÓMICO ABAJO */}
              {baseImponibleEntrega != null && (
                <div className="d-flex justify-content-end mb-3">
                  <div
                    className="text-end"
                    style={{ minWidth: "230px" }}
                  >
                    <div>
                      Base imponible:{" "}
                      <strong>
                        {formatearImporte(baseImponibleEntrega)}
                      </strong>
                    </div>
                    <div>
                      IVA (21%):{" "}
                      <strong>{formatearImporte(ivaEntrega)}</strong>
                    </div>
                    <div>
                      Total con IVA:{" "}
                      <strong>
                        {formatearImporte(totalConIvaEntrega)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* FORMULARIO AÑADIR LÍNEA (solo BORRADOR) */}
              {esBorrador && (
                <div className="card mt-3">
                  <div className="card-body">
                    <h3 className="h6 mb-3">Añadir línea</h3>

                    <form
                      onSubmit={handleCrearLinea}
                      className="row g-3 align-items-end"
                    >
                      {/* Producto */}
                      <div className="col-12 col-md-4">
                        <label className="form-label">
                          Producto (vino){" "}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          name="productoId"
                          className={`form-select form-select-sm ${
                            erroresLinea.productoId ? "is-invalid" : ""
                          }`}
                          value={formLinea.productoId}
                          onChange={handleLineaChange}
                        >
                          <option value="">
                            Selecciona un vino...
                          </option>
                          {productosVino.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                        {erroresLinea.productoId && (
                          <div className="invalid-feedback">
                            {erroresLinea.productoId}
                          </div>
                        )}
                      </div>

                      {/* Lote */}
                      <div className="col-12 col-md-4">
                        <label className="form-label">
                          Lote{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          name="loteId"
                          className={`form-select form-select-sm ${
                            erroresLinea.loteId ? "is-invalid" : ""
                          }`}
                          value={formLinea.loteId}
                          onChange={handleLineaChange}
                          disabled={!formLinea.productoId}
                        >
                          <option value="">
                            {formLinea.productoId
                              ? "Selecciona un lote..."
                              : "Selecciona primero un vino"}
                          </option>
                          {lotesParaProductoSeleccionado.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.codLote} · campaña {l.campanaAnio || "-"} ·
                              stock: {l.botellasDisponibles ?? 0}
                            </option>
                          ))}
                        </select>
                        {erroresLinea.loteId && (
                          <div className="invalid-feedback">
                            {erroresLinea.loteId}
                          </div>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="col-6 col-md-2">
                        <label className="form-label">
                          Cant. botellas{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          name="cantidadBotellas"
                          className={`form-control form-control-sm ${
                            erroresLinea.cantidadBotellas
                              ? "is-invalid"
                              : ""
                          }`}
                          value={formLinea.cantidadBotellas}
                          onChange={handleLineaChange}
                        />
                        {erroresLinea.cantidadBotellas && (
                          <div className="invalid-feedback">
                            {erroresLinea.cantidadBotellas}
                          </div>
                        )}
                      </div>

                      {/* Tarifa + precio */}
                      <div className="col-6 col-md-2">
                        <label className="form-label">
                          Precio botella{" "}
                          <span className="text-danger">*</span>
                        </label>

                        {productoSeleccionado && (
                          <select
                            name="tarifa"
                            className="form-select form-select-sm mb-1"
                            value={formLinea.tarifa}
                            onChange={handleLineaChange}
                          >
                            <option value="">
                              Selecciona tarifa...
                            </option>
                            {productoSeleccionado.precioProfesional !=
                              null && (
                              <option value="PROFESIONAL">
                                Profesional –{" "}
                                {formatearImporte(
                                  productoSeleccionado.precioProfesional
                                )}
                              </option>
                            )}
                            {productoSeleccionado.precioParticular !=
                              null && (
                              <option value="PARTICULAR">
                                Particular –{" "}
                                {formatearImporte(
                                  productoSeleccionado.precioParticular
                                )}
                              </option>
                            )}
                          </select>
                        )}

                        <input
                          type="number"
                          step="0.01"
                          name="precioBotellaAplicado"
                          className={`form-control form-control-sm ${
                            erroresLinea.precioBotellaAplicado
                              ? "is-invalid"
                              : ""
                          }`}
                          value={formLinea.precioBotellaAplicado}
                          onChange={handleLineaChange}
                        />
                        {erroresLinea.precioBotellaAplicado && (
                          <div className="invalid-feedback">
                            {erroresLinea.precioBotellaAplicado}
                          </div>
                        )}
                      </div>

                      <div className="col-12 d-flex justify-content-end">
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary"
                          disabled={savingLinea}
                        >
                          {savingLinea
                            ? "Añadiendo..."
                            : "Añadir línea"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* EMPAQUETADO: cajas / estuches */}
            <div className="mb-4">
              <h3 className="h6 mb-1">
                Empaquetado (cajas / estuches)
              </h3>
              <p className="text-muted small mb-2">
                Botellas de vino en las líneas de esta entrega:{" "}
                <strong>{totalBotellasLineas}</strong>. Botellas
                calculadas a partir del empaquetado:{" "}
                <strong>{totalBotellasEmpaquetado}</strong>.{" "}
                {mensajeBotellasEmpaquetado}
              </p>

              <div className="table-responsive mb-3">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Caja / estuche</th>
                      <th className="text-end">
                        Botellas por caja
                      </th>
                      <th className="text-end">Cantidad cajas</th>
                      <th className="text-end">
                        Total botellas
                      </th>
                      <th
                        style={{ width: "1%" }}
                        className="d-print-none"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {empaquetados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-3"
                        >
                          No hay empaquetado registrado en esta
                          entrega.
                        </td>
                      </tr>
                    ) : (
                      empaquetados.map((e) => {
                        const enEdicion =
                          empaquetadoEditandoId === e.id;
                        const botPorCaja = e.botellasPorCaja ?? 0;
                        const cajas = e.cantidadCajas ?? 0;
                        const totalBotellas =
                          botPorCaja != null && cajas != null
                            ? botPorCaja * cajas
                            : null;
                        return (
                          <tr key={e.id}>
                            <td>{e.cajaMaterialNombre || "-"}</td>
                            <td className="text-end">
                              {botPorCaja != null
                                ? botPorCaja
                                : "-"}
                            </td>
                            <td className="text-end">
                              {enEdicion ? (
                                <>
                                  <input
                                    type="number"
                                    className={`form-control form-control-sm text-end ${
                                      erroresEmpaquetadoEdicion
                                        .cantidadCajas
                                        ? "is-invalid"
                                        : ""
                                    }`}
                                    value={
                                      formEmpaquetadoEdicion.cantidadCajas
                                    }
                                    onChange={(ev) =>
                                      setFormEmpaquetadoEdicion(
                                        (prev) => ({
                                          ...prev,
                                          cantidadCajas:
                                            ev.target.value,
                                        })
                                      )
                                    }
                                  />
                                  {erroresEmpaquetadoEdicion.cantidadCajas && (
                                    <div className="invalid-feedback">
                                      {
                                        erroresEmpaquetadoEdicion.cantidadCajas
                                      }
                                    </div>
                                  )}
                                </>
                              ) : (
                                cajas
                              )}
                            </td>
                            <td className="text-end">
                              {totalBotellas != null
                                ? totalBotellas
                                : ""}
                            </td>
                            <td className="d-print-none">
                              {esBorrador ? (
                                enEdicion ? (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      disabled={
                                        savingEmpaquetadoEdicion
                                      }
                                      onClick={() =>
                                        guardarEmpaquetadoEditado(e)
                                      }
                                    >
                                      {savingEmpaquetadoEdicion
                                        ? "Guardando..."
                                        : "Guardar"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={
                                        cancelarEdicionEmpaquetado
                                      }
                                      disabled={
                                        savingEmpaquetadoEdicion
                                      }
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() =>
                                        iniciarEdicionEmpaquetado(e)
                                      }
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger"
                                      onClick={() =>
                                        eliminarEmpaquetado(e)
                                      }
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-muted small">
                                  Solo lectura
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {esBorrador && (
                <div className="card">
                  <div className="card-body">
                    <h4 className="h6 mb-3">
                      Añadir empaquetado
                    </h4>
                    <form
                      onSubmit={handleCrearEmpaquetado}
                      className="row g-3 align-items-end"
                    >
                      <div className="col-12 col-md-6">
                        <label className="form-label">
                          Caja / estuche{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          name="configEmpaquetadoId"
                          className={`form-select form-select-sm ${
                            erroresEmpaquetado.configEmpaquetadoId
                              ? "is-invalid"
                              : ""
                          }`}
                          value={formEmpaquetado.configEmpaquetadoId}
                          onChange={handleEmpaquetadoChange}
                        >
                          <option value="">
                            Selecciona un tipo de caja/estuche...
                          </option>
                          {configsEmpaquetado.map((cfg) => (
                            <option key={cfg.id} value={cfg.id}>
                              {cfg.cajaMaterialNombre ||
                                "Sin nombre"}{" "}
                              · {cfg.botellasPorCaja ?? "-"}{" "}
                              botellas/caja
                            </option>
                          ))}
                        </select>
                        {erroresEmpaquetado.configEmpaquetadoId && (
                          <div className="invalid-feedback">
                            {
                              erroresEmpaquetado.configEmpaquetadoId
                            }
                          </div>
                        )}
                      </div>
                      <div className="col-6 col-md-3">
                        <label className="form-label">
                          Cantidad cajas{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          name="cantidadCajas"
                          className={`form-control form-control-sm ${
                            erroresEmpaquetado.cantidadCajas
                              ? "is-invalid"
                              : ""
                          }`}
                          value={formEmpaquetado.cantidadCajas}
                          onChange={handleEmpaquetadoChange}
                        />
                        {erroresEmpaquetado.cantidadCajas && (
                          <div className="invalid-feedback">
                            {erroresEmpaquetado.cantidadCajas}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-3 d-flex justify-content-end">
                        <button
                          type="submit"
                          className="btn btn-sm btn-primary"
                          disabled={savingEmpaquetado}
                        >
                          {savingEmpaquetado
                            ? "Añadiendo..."
                            : "Añadir empaquetado"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* APARTADO DEVOLUCIONES (solo ENTREGADO) */}
            {esEntregado && (
              <div className="card mt-4">
                <div className="card-body">
                  <h3 className="h6 mb-1">Registrar devolución</h3>
                  <p className="text-muted small mb-3">
                    Solo puedes devolver sobre entregas ENTREGADAS. La
                    cantidad se resta sobre la línea correspondiente
                    (mismo vino y lote); se mantiene el mismo precio que
                    en la venta. Si la línea queda a 0 botellas, se
                    elimina.
                  </p>

                  <form
                    onSubmit={handleCrearDevolucion}
                    className="row g-3 align-items-end"
                  >
                    {/* Producto */}
                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Producto (vino){" "}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        name="productoId"
                        className={`form-select form-select-sm ${
                          erroresDevolucion.productoId
                            ? "is-invalid"
                            : ""
                        }`}
                        value={formDevolucion.productoId}
                        onChange={handleDevolucionChange}
                      >
                        <option value="">
                          Selecciona un vino...
                        </option>
                        {productosVino.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                      {erroresDevolucion.productoId && (
                        <div className="invalid-feedback">
                          {erroresDevolucion.productoId}
                        </div>
                      )}
                    </div>

                    {/* Lote */}
                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Lote{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        name="loteId"
                        className={`form-select form-select-sm ${
                          erroresDevolucion.loteId ? "is-invalid" : ""
                        }`}
                        value={formDevolucion.loteId}
                        onChange={handleDevolucionChange}
                        disabled={!formDevolucion.productoId}
                      >
                        <option value="">
                          {formDevolucion.productoId
                            ? "Selecciona un lote..."
                            : "Selecciona primero un vino"}
                        </option>
                        {lotesParaProductoDevolucion.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.codLote} · campaña {l.campanaAnio || "-"}
                            · stock: {l.botellasDisponibles ?? 0}
                          </option>
                        ))}
                      </select>
                      {erroresDevolucion.loteId && (
                        <div className="invalid-feedback">
                          {erroresDevolucion.loteId}
                        </div>
                      )}
                    </div>

                    {/* Cantidad devuelta */}
                    <div className="col-6 col-md-2">
                      <label className="form-label">
                        Cant. devueltas{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        name="cantidadDevuelta"
                        className={`form-control form-control-sm ${
                          erroresDevolucion.cantidadDevuelta
                            ? "is-invalid"
                            : ""
                        }`}
                        value={formDevolucion.cantidadDevuelta}
                        onChange={handleDevolucionChange}
                      />
                      {erroresDevolucion.cantidadDevuelta && (
                        <div className="invalid-feedback">
                          {erroresDevolucion.cantidadDevuelta}
                        </div>
                      )}
                    </div>

                    <div className="col-12 d-flex justify-content-end">
                      <button
                        type="submit"
                        className="btn btn-sm btn-outline-primary"
                        disabled={savingDevolucion}
                      >
                        {savingDevolucion
                          ? "Registrando..."
                          : "Añadir devolución"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Volver al listado (no entra en el PDF) */}
          <div className="d-flex justify-content-between mt-3 d-print-none">
            <a
              href="/app/comercial/entregas"
              className="btn btn-outline-secondary btn-sm"
            >
              &larr; Volver al listado
            </a>
          </div>
        </div>

        {/* ===================== VISTA LIMPIA SOLO PDF ===================== */}
        <div ref={albaranRef} className="albaran-print">
          <div className="albaran-pdf-wrapper">
            {/* Cabecera empresa + datos albarán */}
            <div className="d-flex justify-content-between mb-3">
              <div>
                <h1 className="h5 mb-1">Bodegas Horizonte.</h1>
                <div className="small">Zamora</div>
                <div className="small">Tel.: __________</div>
                <div className="small">CIF: __________</div>
              </div>
              <div style={{ minWidth: "220px" }}>
                <table className="table table-bordered table-sm mb-0">
                  <tbody>
                    <tr>
                      <th style={{ width: "45%" }}>Nº albarán</th>
                      <td>{entrega.numeroAlbaran || entrega.id}</td>
                    </tr>
                    <tr>
                      <th>Fecha</th>
                      <td>{formatearFechaCorta(entrega.fecha) || "—"}</td>
                    </tr>
                    <tr>
                      <th>Estado</th>
                      <td>{entrega.estado}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Datos cliente */}
            <div className="mb-3">
              <table className="table table-bordered table-sm mb-0">
                <tbody>
                  <tr>
                    <th style={{ width: "20%" }}>Cliente</th>
                    <td>{entrega.clienteNombre || ""}</td>
                  </tr>
                  {entrega.clienteCifNif && (
                    <tr>
                      <th>CIF/NIF</th>
                      <td>{entrega.clienteCifNif}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Líneas de vino */}
            <div className="mb-3">
              <table className="table table-bordered table-sm mb-1">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Lote</th>
                    <th className="text-end" style={{ width: "10%" }}>
                      Botellas
                    </th>
                    {entrega.conPrecios && (
                      <>
                        <th className="text-end" style={{ width: "12%" }}>
                          P. botella
                        </th>
                        <th className="text-end" style={{ width: "14%" }}>
                          Importe
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={entrega.conPrecios ? 5 : 3}
                        className="text-center"
                      >
                        Sin líneas.
                      </td>
                    </tr>
                  ) : (
                    lineas.map((l) => {
                      const cantidad = l.cantidadBotellas ?? 0;
                      const precio = l.precioBotellaAplicado ?? 0;
                      const importe =
                        entrega.conPrecios &&
                        !isNaN(cantidad) &&
                        !isNaN(precio)
                          ? cantidad * precio
                          : null;
                      return (
                        <tr key={l.id}>
                          <td>{l.productoNombre || "-"}</td>
                          <td>{l.codLote || "-"}</td>
                          <td className="text-end">{cantidad}</td>
                          {entrega.conPrecios && (
                            <>
                              <td className="text-end">
                                {formatearImporte(precio)}
                              </td>
                              <td className="text-end">
                                {importe != null
                                  ? formatearImporte(importe)
                                  : ""}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            {baseImponibleEntrega != null && (
              <div className="d-flex justify-content-end mb-3">
                <div style={{ minWidth: "220px" }}>
                  <div className="d-flex justify-content-between">
                    <span>Base imponible</span>
                    <strong>
                      {formatearImporte(baseImponibleEntrega)}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>IVA (21%)</span>
                    <strong>{formatearImporte(ivaEntrega)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total con IVA</span>
                    <strong>
                      {formatearImporte(totalConIvaEntrega)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Empaquetado */}
            {empaquetados.length > 0 && (
              <div className="mb-3">
                <h2 className="h6">Empaquetado</h2>
                <table className="table table-bordered table-sm">
                  <thead>
                    <tr>
                      <th>Caja / estuche</th>
                      <th className="text-end">Botellas/caja</th>
                      <th className="text-end">Cajas</th>
                      <th className="text-end">Total botellas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empaquetados.map((e) => {
                      const botPorCaja = e.botellasPorCaja ?? 0;
                      const cajas = e.cantidadCajas ?? 0;
                      const totalBotellas =
                        !isNaN(botPorCaja) && !isNaN(cajas)
                          ? botPorCaja * cajas
                          : null;
                      return (
                        <tr key={e.id}>
                          <td>{e.cajaMaterialNombre || "-"}</td>
                          <td className="text-end">{botPorCaja}</td>
                          <td className="text-end">{cajas}</td>
                          <td className="text-end">
                            {totalBotellas != null ? totalBotellas : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="small mt-1">
                  Botellas en líneas:{" "}
                  <strong>{totalBotellasLineas}</strong>. Botellas por
                  empaquetado:{" "}
                  <strong>{totalBotellasEmpaquetado}</strong>.{" "}
                  {mensajeBotellasEmpaquetado}
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div className="mb-4">
              <strong>Observaciones:</strong>
              <div
                style={{
                  minHeight: "35mm",
                  border: "1px solid #000",
                  padding: "4mm",
                  marginTop: "2mm",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entrega.observaciones || ""}
              </div>
            </div>

            {/* Firmas */}
            <div className="d-flex justify-content-between mt-4">
              <div style={{ width: "45%" }}>
                <div className="mb-3 text-center">
                  <strong>Firma Bodega</strong>
                </div>
                <div
                  style={{
                    borderTop: "1px solid #000",
                    height: "25mm",
                  }}
                />
              </div>
              <div style={{ width: "45%" }}>
                <div className="mb-3 text-center">
                  <strong>Firma Cliente</strong>
                </div>
                <div
                  style={{
                    borderTop: "1px solid #000",
                    height: "25mm",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntregaDetalle;
