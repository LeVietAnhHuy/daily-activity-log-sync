import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "./supabase";
import Auth from "./Auth";
import Calendar from "./Calendar";
import Spending from "./Spending";
import ThemePicker from "./ThemePicker";
import { applyTheme, getStoredTheme } from "./themes";
import "./App.css";

function App() {
  const [logs, setLogs] = useState([]);
  const [taskCounts, setTaskCounts] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const [themeId, setThemeId] = useState(() => getStoredTheme().id);
  const [session, setSession] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Apply persisted theme on first load
    applyTheme(getStoredTheme());
    fetchLogs();
    fetchTaskCounts();
    if (inputRef.current) inputRef.current.focus();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

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
      subscription.unsubscribe();
    };
  }, [activeTab]);

  // When selectedDate changes, fetch logs for that date
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

      if (session) {
        const { data: cloudLogs, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false });
        
        if (!error && cloudLogs && cloudLogs.length > 0) {
          // Merge or prefer cloud logs (simplified)
          setLogs(cloudLogs);
        }
      }
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
    if (!keyword.trim()) { fetchLogs(); return; }
    try {
      const results = await invoke("search_logs", { keyword });
      setLogs(results);
    } catch (e) {
      console.error("Failed to search:", e);
    }
  }

  async function handleKeyDown(e) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      try {
        await invoke("add_log", { content: inputValue.trim(), duration: null, tags: null });
        
        if (session) {
          await supabase.from('activity_logs').insert({
            user_id: session.user.id,
            content: inputValue.trim(),
            timestamp: new Date().toISOString(),
            is_starred: false
          });
        }

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
    if (ds) setActiveTab("log"); // jump to log tab to show filtered results
  }

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric", year: "numeric"
    });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(log);
    return acc;
  }, {});

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });

  if (!session) {
    return <div className="app-container"><Auth /></div>;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <h1 className="title">Daily Log</h1>
          <div className="header-controls">
            {session && (
              <div className="sync-status">
                <span className="sync-dot"></span>
                Cloud Sync Active
              </div>
            )}
            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>Sign Out</button>
            <ThemePicker currentThemeId={themeId} onThemeChange={setThemeId} />
            <div className="tab-bar">
              <button
                id="tab-log"
                className={`tab-btn${activeTab === "log" ? " tab-btn--active" : ""}`}
                onClick={() => setActiveTab("log")}
              >
                ☰ Log
              </button>
              <button
                id="tab-calendar"
                className={`tab-btn${activeTab === "calendar" ? " tab-btn--active" : ""}`}
                onClick={() => setActiveTab("calendar")}
              >
                📅 Calendar
              </button>
              <button
                id="tab-spending"
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
              id="log-input"
              type="text"
              className="log-input"
              placeholder={
                selectedDate
                  ? `Viewing ${selectedDate} — type to add a new log`
                  : "What are you doing right now? (Enter to save)"
              }
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.startsWith("?")) {
                  handleSearch(e.target.value.substring(1));
                } else if (inputValue.startsWith("?") && !e.target.value.startsWith("?")) {
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

      {/* Tab content */}
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
  );
}

export default App;
