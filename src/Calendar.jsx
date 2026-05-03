import { useState, useMemo } from "react";

const VIEWS = ["month", "week", "day"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function Calendar({ taskCounts, selectedDate, onSelectDate }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());

  // Build a map: dateStr -> count
  const countMap = useMemo(() => {
    const m = {};
    (taskCounts || []).forEach(({ date, count }) => { m[date] = count; });
    return m;
  }, [taskCounts]);

  const today = new Date();

  function navigate(dir) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  }

  function handleDayClick(date) {
    const ds = toDateStr(date);
    onSelectDate(selectedDate === ds ? null : ds);
  }

  // ─── MONTH VIEW ───────────────────────────────────────────
  function renderMonth() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();

    const cells = [];
    // Leading empty cells
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(year, month, d));
    }
    // Trailing to fill 6 rows
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="cal-month-grid">
        {WEEKDAYS.map(w => (
          <div key={w} className="cal-weekday-label">{w}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="cal-cell cal-cell--empty" />;
          const ds = toDateStr(date);
          const count = countMap[ds] || 0;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate === ds;
          return (
            <div
              key={ds}
              className={`cal-cell${isToday ? " cal-cell--today" : ""}${isSelected ? " cal-cell--selected" : ""}${count > 0 ? " cal-cell--has-tasks" : ""}`}
              onClick={() => handleDayClick(date)}
            >
              <span className="cal-day-num">{date.getDate()}</span>
              {count > 0 && <span className="cal-badge">{count}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── WEEK VIEW ────────────────────────────────────────────
  function renderWeek() {
    // Find Monday of the current week
    const start = new Date(cursor);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek); // go to Sunday

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    return (
      <div className="cal-week-grid">
        {days.map((date) => {
          const ds = toDateStr(date);
          const count = countMap[ds] || 0;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate === ds;
          return (
            <div
              key={ds}
              className={`cal-week-cell${isToday ? " cal-cell--today" : ""}${isSelected ? " cal-cell--selected" : ""}${count > 0 ? " cal-cell--has-tasks" : ""}`}
              onClick={() => handleDayClick(date)}
            >
              <span className="cal-week-dayname">{WEEKDAYS[date.getDay()]}</span>
              <span className="cal-week-daynum">{date.getDate()}</span>
              {count > 0 && (
                <span className="cal-week-badge">{count} task{count > 1 ? "s" : ""}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── DAY VIEW ─────────────────────────────────────────────
  function renderDay() {
    const ds = toDateStr(cursor);
    const count = countMap[ds] || 0;
    const isSelected = selectedDate === ds;
    return (
      <div className="cal-day-view" onClick={() => handleDayClick(cursor)}>
        <div className={`cal-day-card${isSelected ? " cal-cell--selected" : ""}`}>
          <span className="cal-day-card-date">
            {cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <span className="cal-day-card-count">
            {count > 0 ? `${count} task${count > 1 ? "s" : ""} logged` : "No tasks logged"}
          </span>
        </div>
      </div>
    );
  }

  // ─── HEADER LABEL ─────────────────────────────────────────
  function headerLabel() {
    if (view === "month") {
      return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
    if (view === "week") {
      const start = new Date(cursor);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <div className="calendar-widget">
      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-view-switcher">
          {VIEWS.map(v => (
            <button
              key={v}
              className={`cal-view-btn${view === v ? " cal-view-btn--active" : ""}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => navigate(-1)}>‹</button>
          <span className="cal-nav-label">{headerLabel()}</span>
          <button className="cal-nav-btn" onClick={() => navigate(1)}>›</button>
        </div>

        <button
          className="cal-today-btn"
          onClick={() => { setCursor(new Date()); onSelectDate(null); }}
        >
          Today
        </button>
      </div>

      {/* Calendar body */}
      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "day" && renderDay()}
    </div>
  );
}
