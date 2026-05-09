import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import AppBackground from "./AppBackground";
import Calendar from "./Calendar";
import Spending from "./Spending";
import ThemePicker from "./ThemePicker";
import { applyTheme, getStoredTheme } from "./themes";
import "./App.css";
import "./theme-anime-dark.css";

function App() {
  const [logs, setLogs] = useState([]);
  const [taskCounts, setTaskCounts] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const [themeId, setThemeId] = useState(() => getStoredTheme().id);
  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    applyTheme(getStoredTheme());
    fetchTaskCounts();
    if (inputRef.current) inputRef.current.focus();

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (
        activeTab === "log" &&
        document.activeElement !== inputRef.current &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        e.key.length === 1
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeTab]);

  useEffect(() => {
    if (selectedDate) {
      fetchLogsForDate(selectedDate);
    } else {
      fetchLogs();
    }
  }, [selectedDate]);

  async function fetchLogs() {
    try {
      const fetched = await invoke("get_logs");
      setLogs(fetched);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }

  async function fetchLogsForDate(date) {
    try {
      const fetched = await invoke("get_logs_for_date", { date });
      setLogs(fetched);
    } catch (e) {
      console.error("Failed to fetch logs for date:", e);
    }
  }

  async function fetchTaskCounts() {
    try {
      const counts = await invoke("get_task_counts");
      setTaskCounts(counts);
    } catch (e) {
      console.error("Failed to fetch task counts:", e);
    }
  }

  async function handleSearch(keyword) {
    const requestId = ++searchRequestRef.current;
    try {
      const results = keyword.trim()
        ? await invoke("search_logs", { keyword })
        : await invoke("get_logs");
      if (requestId === searchRequestRef.current) {
        setLogs(results);
      }
    } catch (e) {
      console.error("Failed to search:", e);
    }
  }

  function scheduleSearch(keyword) {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      handleSearch(keyword);
    }, 180);
  }

  async function handleKeyDown(e) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (inputValue.trim().startsWith("?")) return;
      try {
        await invoke("add_log", { content: inputValue.trim(), duration: null, tags: null });
        setInputValue("");
        if (selectedDate) fetchLogsForDate(selectedDate);
        else fetchLogs();
        fetchTaskCounts();
      } catch (e) {
        console.error("Failed to add log:", e);
      }
    }
  }

  function handleSelectDate(ds) {
    setSelectedDate(ds);
    if (ds) setActiveTab("log");
  }

  const groupedLogs = useMemo(() => logs.reduce((acc, log) => {
    const date = new Date(log.timestamp);
    const displayDate = date.toLocaleDateString("en-GB", {
      weekday: "long", month: "short", day: "numeric", year: "numeric"
    });
    if (!acc[displayDate]) acc[displayDate] = [];
    acc[displayDate].push(log);
    return acc;
  }, {}), [logs]);

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <div className="app-shell">
      <AppBackground />
      <div className="app-content">
        <div className="app-container">
          <header className="header">
            <div className="header-top">
              <h1 className="title">Daily Log</h1>
              <div className="header-controls">
                <ThemePicker currentThemeId={themeId} onThemeChange={setThemeId} />
                <div className="tab-bar">
                  <button
                    className={`tab-btn${activeTab === "log" ? " tab-btn--active" : ""}`}
                    onClick={() => setActiveTab("log")}
                  >
                    ☰ Log
                  </button>
                  <button
                    className={`tab-btn${activeTab === "calendar" ? " tab-btn--active" : ""}`}
                    onClick={() => setActiveTab("calendar")}
                  >
                    📅 Calendar
                  </button>
                  <button
                    className={`tab-btn${activeTab === "spending" ? " tab-btn--active" : ""}`}
                    onClick={() => setActiveTab("spending")}
                  >
                    💰 Spending
                  </button>
                </div>
              </div>
            </div>

            {activeTab === "log" && (
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  className="log-input"
                  placeholder={
                    selectedDate
                      ? `Viewing ${selectedDate} — type to add a new log`
                      : "What are you doing right now? (Enter to save)"
                  }
                  value={inputValue}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setInputValue(nextValue);
                    if (nextValue.startsWith("?")) {
                      scheduleSearch(nextValue.substring(1));
                    } else if (inputValue.startsWith("?") && !nextValue.startsWith("?")) {
                      searchRequestRef.current += 1;
                      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                      selectedDate ? fetchLogsForDate(selectedDate) : fetchLogs();
                    }
                  }}
                  onKeyDown={handleKeyDown}
                />
                {selectedDate && (
                  <button className="clear-filter-btn" onClick={() => setSelectedDate(null)}>
                    ✕ Clear filter
                  </button>
                )}
              </div>
            )}
          </header>

          {activeTab === "calendar" && (
            <Calendar
              taskCounts={taskCounts}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          )}

          {activeTab === "log" && (
            <main className="timeline-container">
              {selectedDate && (
                <div className="filter-banner">
                  Showing logs for <strong>{selectedDate}</strong>
                </div>
              )}
              {Object.entries(groupedLogs).map(([dateStr, dayLogs]) => (
                <div key={dateStr} className="date-group animate-slide-in">
                  <h2 className="date-header">
                    {dateStr}
                    <span className="date-count">{dayLogs.length} task{dayLogs.length !== 1 ? "s" : ""}</span>
                  </h2>
                  {dayLogs.map((log) => (
                    <div key={log.id} className="log-entry">
                      <span className="log-time">{formatTime(log.timestamp)}</span>
                      <span className="log-content">{log.content}</span>
                    </div>
                  ))}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="empty-state">
                  {selectedDate
                    ? `No activities logged on ${selectedDate}.`
                    : "No activity logged yet. Start typing above!"}
                </div>
              )}
            </main>
          )}

          {activeTab === "spending" && (
            <Spending />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
