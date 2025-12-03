// src/components/eventos/EventosCalendario.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL, getAuthDataOrRedirect } from "../../lib/auth";
import { getCurrentLang, txtCalendario } from "../../lib/i18nEventos";

function EventosCalendario() {
  const [lang, setLang] = useState("es");
  const t = txtCalendario(lang);
  const locale = lang === "en" ? "en-GB" : "es-ES";

  const [authData, setAuthData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventos, setEventos] = useState([]);

  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    setLang(getCurrentLang());
  }, []);

  useEffect(() => {
    const data = getAuthDataOrRedirect();
    if (!data) return;
    setAuthData(data);
  }, []);

  useEffect(() => {
    if (!authData) return;
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData]);

  const cargarEventos = async () => {
    setLoading(true);
    setError("");

    const { token, slug } = authData;

    try {
      const resp = await fetch(`${API_BASE_URL}/api/${slug}/eventos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        throw new Error("Error HTTP " + resp.status);
      }

      const data = await resp.json();
      if (Array.isArray(data)) {
        setEventos(data);
      } else {
        setEventos([]);
      }
    } catch (err) {
      console.error(err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (!authData) return null;

  const monthLabel = currentDate.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const buildCalendarWeeks = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      const d = new Date(year, month, 1 - (startDayOfWeek - i));
      days.push({ date: d, inCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), inCurrentMonth: true });
    }

    const remainder = days.length % 7;
    if (remainder !== 0) {
      const extra = 7 - remainder;
      const last = days[days.length - 1].date;
      for (let i = 1; i <= extra; i++) {
        const d = new Date(
          last.getFullYear(),
          last.getMonth(),
          last.getDate() + i,
        );
        days.push({ date: d, inCurrentMonth: false });
      }
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  };

  const calendarWeeks = buildCalendarWeeks(currentDate);

  const eventsByDay = {};
  eventos.forEach((ev) => {
    if (!ev.fecha) return;
    const d = new Date(ev.fecha);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  const irADetalleEvento = (id) => {
    window.location.href = `/app/eventos/${id}`;
  };

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="card-title mb-0 text-capitalize">{monthLabel}</h5>
            <small className="text-muted">{t.subtitle}</small>
          </div>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={goPrevMonth}
            >
              &lt;
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={goToday}
            >
              {t.btnToday}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={goNextMonth}
            >
              &gt;
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-1 mb-2">
            <small>{error}</small>
          </div>
        )}

        {loading ? (
          <p className="mb-0">{t.loading}</p>
        ) : (
          <table className="table table-bordered table-sm mb-0 calendar-table w-100">
            <thead className="table-light">
              <tr className="text-center small">
                {t.daysShort.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarWeeks.map((week, wIdx) => (
                <tr key={wIdx}>
                  {week.map(({ date, inCurrentMonth }) => {
                    const key = date.toISOString().slice(0, 10);
                    const dayEvents = eventsByDay[key] || [];
                    const isToday = key === todayKey;

                    return (
                      <td
                        key={key}
                        className={`align-top p-1 small ${
                          inCurrentMonth ? "" : "text-muted bg-light"
                        }`}
                        style={{ height: "90px" }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-semibold">
                            {date.getDate()}
                          </span>
                          {isToday && (
                            <span className="badge bg-primary">
                              {t.todayBadge}
                            </span>
                          )}
                        </div>

                        <div className="d-flex flex-column gap-1">
                          {dayEvents.map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              className="btn btn-xs btn-outline-info text-truncate"
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.25rem",
                              }}
                              onClick={() => irADetalleEvento(ev.id)}
                              title={ev.nombre}
                            >
                              {ev.nombre}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default EventosCalendario;
