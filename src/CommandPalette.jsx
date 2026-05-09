import { useState, useEffect, useRef, useMemo } from "react";

export default function CommandPalette({ isOpen, onClose, t, actions }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const lowerQuery = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        (a.keywords && a.keywords.some((k) => k.toLowerCase().includes(lowerQuery)))
    );
  }, [actions, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredActions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].run();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const activeElement = listRef.current.children[selectedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className="cmd-header">
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder={t("cmd.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="cmd-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="cmd-list" ref={listRef}>
          {filteredActions.length === 0 ? (
            <div className="cmd-empty">No actions found.</div>
          ) : (
            filteredActions.map((action, index) => {
              const isSelected = index === selectedIndex;
              // Add group headers if needed (simplified for now: just flat list)
              return (
                <button
                  key={action.id}
                  className={`cmd-item ${isSelected ? "cmd-item--selected" : ""}`}
                  onClick={() => action.run()}
                  onMouseMove={() => {
                    if (selectedIndex !== index) setSelectedIndex(index);
                  }}
                >
                  <span className="cmd-item-title">{action.title}</span>
                  {action.group && (
                    <span className="cmd-item-group">{action.group}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
