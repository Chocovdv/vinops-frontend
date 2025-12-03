import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";

function ProductoNuevo() {
  const [authData, setAuthData] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [tipoProducto, setTipoProducto] = useState("VINO");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precioProfesional: "",
    precioParticular: "",
    familiaMaterial: "",
    stockUnidades: "",
    stockMinimoUnidades: "",
  });

  const isAdmin =
    userRole === "ADMIN" || userRole === "ROLE_ADMIN";

  // ===== auth inicial =====
  useEffect(() => {
    const auth = getAuthDataOrRedirect();
    if (!auth) return;

    setAuthData(auth);
    setUserRole(auth.role || null);

    if (!(auth.role === "ADMIN" || auth.role === "ROLE_ADMIN")) {
      setError("Solo un usuario ADMIN puede crear productos.");
    }
  }, []);

  // ===== handlers =====
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleTipoChange(e) {
    const value = e.target.value;
    setTipoProducto(value);
  }

  function volverAlListado() {
    window.location.href = "/app/inventario/productos";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!authData) return;
    if (!isAdmin) return;

    setError("");

    const nombreTrim = formData.nombre.trim();
    const descripcionTrim = formData.descripcion.trim();

    if (!nombreTrim) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (nombreTrim.length > 150) {
      setError(
        "El nombre del producto no puede superar los 150 caracteres."
      );
      return;
    }
    if (descripcionTrim.length > 2000) {
      setError("La descripción no puede superar los 2000 caracteres.");
      return;
    }

    if (tipoProducto === "VINO") {
      const precioProfStr = formData.precioProfesional.trim();
      const precioPartStr = formData.precioParticular.trim();

      if (precioProfStr === "" || precioPartStr === "") {
        setError(
          "Los precios profesional y particular son obligatorios para un vino."
        );
        return;
      }

      const precioProfNum = parseFloat(precioProfStr);
      const precioPartNum = parseFloat(precioPartStr);

      if (Number.isNaN(precioProfNum) || precioProfNum < 0) {
        setError(
          "El precio profesional debe ser un número mayor o igual que 0."
        );
        return;
      }
      if (Number.isNaN(precioPartNum) || precioPartNum < 0) {
        setError(
          "El precio particular debe ser un número mayor o igual que 0."
        );
        return;
      }
    } else {
      const familiaTrim = formData.familiaMaterial.trim();
      const stockStr = formData.stockUnidades.trim();
      const stockMinStr = formData.stockMinimoUnidades.trim();

      if (!familiaTrim) {
        setError("La familia de material es obligatoria.");
        return;
      }

      if (stockStr === "" || stockMinStr === "") {
        setError(
          "El stock y el stock mínimo son obligatorios para un material."
        );
        return;
      }

      const stockNum = parseInt(stockStr, 10);
      const stockMinNum = parseInt(stockMinStr, 10);

      if (Number.isNaN(stockNum) || stockNum < 0) {
        setError("El stock debe ser un número mayor o igual que 0.");
        return;
      }
      if (Number.isNaN(stockMinNum) || stockMinNum < 0) {
        setError("El stock mínimo debe ser un número mayor o igual que 0.");
        return;
      }
    }

    setSaving(true);

    const { token, slug } = authData;
    const url = `${API_BASE_URL}/api/${slug}/inventario/productos`;

    const body = {
      nombre: nombreTrim,
      descripcion: descripcionTrim || null,
      tipoProducto,
    };

    if (tipoProducto === "VINO") {
      const precioProfNum = parseFloat(formData.precioProfesional.trim());
      const precioPartNum = parseFloat(formData.precioParticular.trim());

      body.precioProfesional = precioProfNum;
      body.precioParticular = precioPartNum;
    } else {
      const familiaTrim = formData.familiaMaterial.trim();
      const stockNum = parseInt(formData.stockUnidades.trim(), 10);
      const stockMinNum = parseInt(
        formData.stockMinimoUnidades.trim(),
        10
      );

      body.familiaMaterial = familiaTrim || null;
      body.stockUnidades = stockNum;
      body.stockMinimoUnidades = stockMinNum;
    }

    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          let msg = "Error al crear el producto";
          try {
            const data = await res.json();
            if (data && data.message) msg = data.message;
          } catch (_) {
            // ignoramos si no es JSON
          }
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.id != null) {
          window.location.href = `/app/inventario/productos/${data.id}`;
        } else {
          volverAlListado();
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Error desconocido al crear el producto");
      })
      .finally(() => {
        setSaving(false);
      });
  }

  const esVino = tipoProducto === "VINO";

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            type="button"
            className="btn btn-link btn-sm px-0"
            onClick={volverAlListado}
          >
            &larr; Volver al listado
          </button>
          <h2 className="h4 mb-0 mt-1">Nuevo producto</h2>
          <div className="small text-muted">
            Define si es un vino o un material y completa los datos.
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {isAdmin && (
        <div className="card">
          <div className="card-header">Datos del nuevo producto</div>
          <div className="card-body">
            <form noValidate onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    className="form-control"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Tipo de producto</label>
                  <select
                    className="form-select"
                    value={tipoProducto}
                    onChange={handleTipoChange}
                  >
                    <option value="VINO">VINO</option>
                    <option value="MATERIAL">MATERIAL</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                  />
                </div>

                {esVino ? (
                  <>
                    <div className="col-md-4">
                      <label className="form-label">
                        Precio profesional (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        name="precioProfesional"
                        value={formData.precioProfesional}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Precio particular (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        name="precioParticular"
                        value={formData.precioParticular}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-md-4">
                      <label className="form-label">Familia de material</label>
                      <select
                        className="form-select"
                        name="familiaMaterial"
                        value={formData.familiaMaterial}
                        onChange={handleChange}
                      >
                        <option value="">Selecciona familia...</option>
                        <option value="BOTELLA">BOTELLA</option>
                        <option value="CORCHO">CORCHO</option>
                        <option value="CAPSULA">CÁPSULA</option>
                        <option value="ETIQUETA_FRONTAL">
                          ETIQUETA FRONTAL
                        </option>
                        <option value="CONTRAETIQUETA">
                          CONTRAETIQUETA
                        </option>
                        <option value="CAJA">CAJA</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Stock (unidades)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        name="stockUnidades"
                        value={formData.stockUnidades}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Stock mínimo (unidades)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        name="stockMinimoUnidades"
                        value={formData.stockMinimoUnidades}
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Creando..." : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductoNuevo;
