import { themes, applyTheme } from "./themes";

export default function ThemePicker({ currentThemeId, onThemeChange }) {
  function handleSelect(theme) {
    applyTheme(theme);
    onThemeChange(theme.id);
  }

  return (
    <div className="theme-picker" aria-label="Theme selector">
      {themes.map((theme) => (
        <button
          key={theme.id}
          title={theme.name}
          aria-pressed={currentThemeId === theme.id}
          className={`theme-swatch${currentThemeId === theme.id ? " theme-swatch--active" : ""}`}
          onClick={() => handleSelect(theme)}
        >
          {/* 4-quadrant mini preview */}
          <span className="theme-swatch-grid">
            {theme.preview.map((color, i) => (
              <span key={i} style={{ background: color }} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}
