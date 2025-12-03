// src/lib/i18nEventos.js

export const LANG_KEY = "vinops_lang";

export function getCurrentLang() {
  if (typeof window === "undefined") {
    return "es";
  }
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    return stored === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

// Códigos de tipo de evento usados en el back
export const EVENT_TYPE_CODES = ["TODOS", "CATA", "FERIA", "VISITA", "OTRO"];

const TYPE_LABELS = {
  es: {
    TODOS: "Todos",
    CATA: "Cata",
    FERIA: "Feria",
    VISITA: "Visita",
    OTRO: "Otro",
  },
  en: {
    TODOS: "All",
    CATA: "Tasting",
    FERIA: "Fair",
    VISITA: "Visit",
    OTRO: "Other",
  },
};

export function getEventTypeLabel(code, lang) {
  const dict = TYPE_LABELS[lang] || TYPE_LABELS.es;
  return dict[code] || code || "-";
}

/* ============ DETALLE ============ */

const DETALLE = {
  es: {
    loading: "Cargando evento...",
    notFound: "No se ha encontrado el evento solicitado.",
    backToList: "← Volver al listado",
    eventLabel: "Evento",
    edit: "Editar",
    cancelEdit: "Cancelar edición",
    delete: "Eliminar",
    onlyAdminDelete: "Solo un usuario ADMIN puede eliminar eventos.",
    confirmDelete:
      "¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.",
    errorLoadFallback: "Error al cargar el evento",
    errorUpdateFallback: "Error al actualizar el evento",
    errorDeleteFallback: "Error al eliminar el evento",
    updatedOk: "Evento actualizado correctamente.",
    basicInfo: "Información básica",
    type: "Tipo",
    dateTime: "Fecha y hora",
    location: "Ubicación",
    locationNotSpecified: "Sin especificar",
    descriptionTitle: "Descripción",
    descriptionEmpty: "Sin descripción registrada.",
  },
  en: {
    loading: "Loading event...",
    notFound: "The requested event could not be found.",
    backToList: "← Back to list",
    eventLabel: "Event",
    edit: "Edit",
    cancelEdit: "Cancel edit",
    delete: "Delete",
    onlyAdminDelete: "Only ADMIN users can delete events.",
    confirmDelete:
      "Are you sure you want to delete this event? This action cannot be undone.",
    errorLoadFallback: "Error loading event",
    errorUpdateFallback: "Error updating event",
    errorDeleteFallback: "Error deleting event",
    updatedOk: "Event updated successfully.",
    basicInfo: "Basic information",
    type: "Type",
    dateTime: "Date and time",
    location: "Location",
    locationNotSpecified: "Not specified",
    descriptionTitle: "Description",
    descriptionEmpty: "No description registered.",
  },
};

export function txtDetalle(lang) {
  return DETALLE[lang] || DETALLE.es;
}

/* ============ FORM ============ */

const FORM = {
  es: {
    labels: {
      type: "Tipo",
      dateTime: "Fecha y hora",
      location: "Ubicación",
      name: "Nombre del evento",
      description: "Descripción",
    },
    placeholders: {
      type: "Selecciona tipo...",
      location: "Sala de catas, viñedo, feria...",
      name: "Ej: Cata presentación Altura 720",
      description: "Detalles del evento, dinámica, notas internas...",
    },
    validation: {
      general: "Por favor, corrige los campos marcados en rojo.",
      typeRequired: "El tipo de evento es obligatorio.",
      typeInvalid: "Selecciona un tipo de evento válido.",
      nameRequired: "El nombre del evento es obligatorio.",
      nameMin: "El nombre debe tener al menos 3 caracteres.",
      dateRequired: "La fecha del evento es obligatoria.",
      dateInvalid: "La fecha y hora no tienen un formato válido.",
      locationMin:
        "Si indicas una ubicación, debe tener al menos 3 caracteres.",
      descriptionMax:
        "La descripción es demasiado larga (máximo 1000 caracteres).",
    },
    buttons: {
      back: "Volver al listado",
      saving: "Guardando...",
      create: "Crear evento",
      update: "Guardar cambios",
    },
  },
  en: {
    labels: {
      type: "Type",
      dateTime: "Date & time",
      location: "Location",
      name: "Event name",
      description: "Description",
    },
    placeholders: {
      type: "Select type...",
      location: "Tasting room, vineyard, fair...",
      name: "E.g. Altura 720 launch tasting",
      description: "Event details, format, internal notes...",
    },
    validation: {
      general: "Please fix the fields marked in red.",
      typeRequired: "Event type is required.",
      typeInvalid: "Select a valid event type.",
      nameRequired: "Event name is required.",
      nameMin: "Name must be at least 3 characters long.",
      dateRequired: "Event date is required.",
      dateInvalid: "Date and time are not valid.",
      locationMin:
        "If you provide a location, it must be at least 3 characters long.",
      descriptionMax:
        "Description is too long (maximum 1000 characters).",
    },
    buttons: {
      back: "Back to list",
      saving: "Saving...",
      create: "Create event",
      update: "Save changes",
    },
  },
};

export function txtForm(lang) {
  return FORM[lang] || FORM.es;
}

/* ============ LISTA ============ */

const LISTA = {
  es: {
    filters: {
      type: "Tipo",
      from: "Desde",
      to: "Hasta",
      search: "Buscar",
      clear: "Limpiar filtros",
      searchPlaceholder: "Nombre, ubicación, descripción...",
    },
    summary: {
      total: "Total",
      tastings: "Catas",
      fairs: "Ferias",
      visits: "Visitas",
      others: "Otros",
    },
    table: {
      date: "Fecha",
      type: "Tipo",
      name: "Nombre",
      location: "Ubicación",
      description: "Descripción",
      actions: "Acciones",
      noResults: "No hay eventos para los filtros seleccionados.",
    },
    buttons: {
      new: "+ Nuevo evento",
      viewEdit: "Ver / editar",
      delete: "Eliminar",
    },
    loading: "Cargando eventos...",
    errorLoadFallback: "Error cargando eventos",
    confirmDelete:
      "¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.",
    errorDeleteFallback: "Error al eliminar el evento",
  },
  en: {
    filters: {
      type: "Type",
      from: "From",
      to: "To",
      search: "Search",
      clear: "Clear filters",
      searchPlaceholder: "Name, location, description...",
    },
    summary: {
      total: "Total",
      tastings: "Tastings",
      fairs: "Fairs",
      visits: "Visits",
      others: "Others",
    },
    table: {
      date: "Date",
      type: "Type",
      name: "Name",
      location: "Location",
      description: "Description",
      actions: "Actions",
      noResults: "There are no events for the selected filters.",
    },
    buttons: {
      new: "+ New event",
      viewEdit: "View / edit",
      delete: "Delete",
    },
    loading: "Loading events...",
    errorLoadFallback: "Error loading events",
    confirmDelete:
      "Are you sure you want to delete this event? This action cannot be undone.",
    errorDeleteFallback: "Error deleting event",
  },
};

export function txtLista(lang) {
  return LISTA[lang] || LISTA.es;
}

/* ============ PRÓXIMO ============ */

const PROX = {
  es: {
    searching: "Buscando próximo evento...",
    title: "Próximo evento",
    noUpcoming:
      "No hay eventos futuros programados. Crea un nuevo evento para verlo aquí.",
    error: "No se ha podido cargar el próximo evento.",
    btnViewEdit: "Ver / editar",
    btnNew: "+ Nuevo evento",
  },
  en: {
    searching: "Searching next event...",
    title: "Next event",
    noUpcoming:
      "There are no upcoming events. Create a new one to see it here.",
    error: "The next event could not be loaded.",
    btnViewEdit: "View / edit",
    btnNew: "+ New event",
  },
};

export function txtProximo(lang) {
  return PROX[lang] || PROX.es;
}

/* ============ CALENDARIO ============ */

const CAL = {
  es: {
    subtitle: "Calendario de eventos de la bodega",
    btnToday: "Hoy",
    loading: "Cargando eventos...",
    error: "No se han podido cargar los eventos.",
    todayBadge: "Hoy",
    daysShort: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  },
  en: {
    subtitle: "Winery events calendar",
    btnToday: "Today",
    loading: "Loading events...",
    error: "Events could not be loaded.",
    todayBadge: "Today",
    daysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
};

export function txtCalendario(lang) {
  return CAL[lang] || CAL.es;
}

/* ============ NUEVO (errores genéricos) ============ */

const NUEVO = {
  es: {
    errorCreateFallback: "Error al crear el evento",
  },
  en: {
    errorCreateFallback: "Error creating event",
  },
};

export function txtNuevo(lang) {
  return NUEVO[lang] || NUEVO.es;
}
