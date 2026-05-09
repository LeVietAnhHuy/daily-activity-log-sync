import { useEffect, useMemo, useRef, useState } from "react";
import "./AppBackground.css";
import { animeDarkTheme } from "./theme/animeDarkTheme";
import { applyTheme, getStoredTheme } from "./themes";

const APP_SETTINGS_KEY = "spend-app-settings";
const SETTINGS_EVENT = "daily-log-settings-changed";
const LARGE_VIEWPORT_AREA = 1800000;
const NEAR_FULLSCREEN_AREA = 1700000;

function getStoredBackgroundSettings(defaultMotion) {
  try {
    const settings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || "{}");
    const backgroundEffects =
      settings.backgroundEffects || settings.backgroundMotion || defaultMotion;
    return {
      theme: settings.theme || "default-dark",
      backgroundEffects,
      themeIntensity: settings.themeIntensity || "medium",
      autoReduceMotionInFullscreen:
        settings.autoReduceMotionInFullscreen !== false,
    };
  } catch {
    return {
      theme: "default-dark",
      backgroundEffects: defaultMotion,
      themeIntensity: "medium",
      autoReduceMotionInFullscreen: true,
    };
  }
}

function getInitialReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AppBackground({
  backgroundImage = "",
  defaultMotion = "on",
  intensity = "medium",
}) {
  const backgroundRef = useRef(null);
  const [backgroundSettings, setBackgroundSettings] = useState(() =>
    getStoredBackgroundSettings(defaultMotion)
  );
  const [reducedMotion, setReducedMotion] = useState(getInitialReducedMotion);

  const visualTheme = backgroundSettings.theme;
  const motionMode = backgroundSettings.backgroundEffects;
  const themeIntensity = backgroundSettings.themeIntensity;
  const autoReduceMotionInFullscreen =
    backgroundSettings.autoReduceMotionInFullscreen;
  const effectiveMotion = reducedMotion && motionMode === "on" ? "reduced" : motionMode;

  useEffect(() => {
    const handleSettingsChange = (event) => {
      setBackgroundSettings({
        theme: event.detail?.theme || "default-dark",
        backgroundEffects:
          event.detail?.backgroundEffects ||
          event.detail?.backgroundMotion ||
          getStoredBackgroundSettings(defaultMotion).backgroundEffects,
        themeIntensity: event.detail?.themeIntensity || "medium",
        autoReduceMotionInFullscreen:
          event.detail?.autoReduceMotionInFullscreen !== false,
      });
    };
    const handleStorage = (event) => {
      if (event.key === APP_SETTINGS_KEY) {
        setBackgroundSettings(getStoredBackgroundSettings(defaultMotion));
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [defaultMotion]);

  useEffect(() => {
    const root = document.documentElement;
    const themeClasses = [
      "theme-default-dark",
      "theme-anime-dark",
      "theme-intensity-low",
      "theme-intensity-medium",
      "theme-intensity-high",
    ];
    root.classList.remove(...themeClasses);
    root.classList.add(
      visualTheme === "anime-dark" ? "theme-anime-dark" : "theme-default-dark",
      `theme-intensity-${themeIntensity}`
    );

    if (visualTheme === "anime-dark") {
      Object.entries(animeDarkTheme.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      Object.entries(animeDarkTheme.assets).forEach(([key, value]) => {
        root.style.setProperty(`--anime-asset-${key}`, `url("${value}")`);
      });
    } else {
      applyTheme(getStoredTheme());
      Object.keys(animeDarkTheme.assets).forEach((key) => {
        root.style.removeProperty(`--anime-asset-${key}`);
      });
    }

    return () => {
      root.classList.remove(...themeClasses);
    };
  }, [visualTheme, themeIntensity]);

  useEffect(() => {
    if (!window.matchMedia) return undefined;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreference = () => setReducedMotion(query.matches);

    handleMotionPreference();
    query.addEventListener?.("change", handleMotionPreference);

    return () => query.removeEventListener?.("change", handleMotionPreference);
  }, []);

  useEffect(() => {
    const node = backgroundRef.current;
    if (!node || effectiveMotion === "off") return undefined;

    let scrollTimer = 0;
    let isScrolling = false;
    const handleScroll = () => {
      if (!isScrolling) {
        node.classList.add("app-background--scrolling");
        isScrolling = true;
      }
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        node.classList.remove("app-background--scrolling");
        isScrolling = false;
      }, 180);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      node.classList.remove("app-background--scrolling");
    };
  }, [effectiveMotion]);

  useEffect(() => {
    const node = backgroundRef.current;
    if (!node) return undefined;

    let resizeTimer = 0;
    let isResizing = false;
    const handleResize = () => {
      if (!isResizing) {
        node.classList.add("app-background--resizing");
        isResizing = true;
      }

      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        node.classList.remove("app-background--resizing");
        isResizing = false;
      }, 240);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      node.classList.remove("app-background--resizing");
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const node = backgroundRef.current;
    let disposed = false;
    let resizeTimer = 0;
    let tauriWindow = null;

    function isLargeOrFullscreenViewport() {
      const area = window.innerWidth * window.innerHeight;
      const nearScreen =
        typeof window.screen?.availWidth === "number" &&
        window.innerWidth >= window.screen.availWidth * 0.92 &&
        window.innerHeight >= window.screen.availHeight * 0.86 &&
        area > NEAR_FULLSCREEN_AREA;

      return area > LARGE_VIEWPORT_AREA || nearScreen || Boolean(document.fullscreenElement);
    }

    async function getTauriFullscreenState() {
      if (!tauriWindow) return false;

      try {
        const timeout = new Promise((resolve) => {
          window.setTimeout(() => resolve(false), 120);
        });
        const state = Promise.all([
          tauriWindow.isFullscreen(),
          tauriWindow.isMaximized(),
        ]).then(([isFullscreen, isMaximized]) => isFullscreen || isMaximized);

        return await Promise.race([state, timeout]);
      } catch {
        return false;
      }
    }

    async function updatePerformanceMode() {
      const shouldUsePerformanceMode =
        motionMode !== "on" ||
        reducedMotion ||
        (autoReduceMotionInFullscreen &&
          (isLargeOrFullscreenViewport() || (await getTauriFullscreenState())));

      if (disposed) return;

      root.classList.toggle("performance-mode", shouldUsePerformanceMode);
      node?.classList.toggle("app-background--performance", shouldUsePerformanceMode);
    }

    function scheduleUpdate() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updatePerformanceMode, 120);
    }

    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        if (disposed) return;
        tauriWindow = getCurrentWindow();
        updatePerformanceMode();
      })
      .catch(() => {
        updatePerformanceMode();
      });

    updatePerformanceMode();
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    document.addEventListener("fullscreenchange", scheduleUpdate);

    return () => {
      disposed = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("fullscreenchange", scheduleUpdate);
      root.classList.remove("performance-mode");
      node?.classList.remove("app-background--performance");
    };
  }, [motionMode, reducedMotion, autoReduceMotionInFullscreen]);

  const style = useMemo(
    () => ({
      "--app-background-image": backgroundImage ? `url("${backgroundImage}")` : "none",
    }),
    [backgroundImage]
  );

  return (
    <div
      ref={backgroundRef}
      className={[
        "app-background",
        `app-background--motion-${effectiveMotion}`,
        `app-background--intensity-${intensity}`,
        `app-background--theme-${visualTheme}`,
        `app-background--theme-intensity-${themeIntensity}`,
        backgroundImage ? "app-background--image" : "app-background--mesh",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden="true"
    >
      <div className="app-background__image" />
      <div className="app-background__mesh" />
      <div className="app-background__matrix" />
      <div className="app-background__anime-silhouette app-background__anime-silhouette--left" />
      <div className="app-background__anime-silhouette app-background__anime-silhouette--right" />
      <div className="app-background__anime-circle" />
      <div className="app-background__anime-particles" />
      <div className="app-background__veil" />
    </div>
  );
}
