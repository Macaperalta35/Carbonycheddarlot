import React, { useState, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useLocalStorage("a11y_font_size", "normal");
  const [contrast, setContrast] = useLocalStorage("a11y_contrast", false);
  const [theme, setTheme]       = useLocalStorage("cc_theme", "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("a11y-large", "a11y-xlarge");
    if (fontSize === "large")  html.classList.add("a11y-large");
    if (fontSize === "xlarge") html.classList.add("a11y-xlarge");
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle("a11y-contrast", Boolean(contrast));
  }, [contrast]);

  return (
    <div className="a11y-widget" role="region" aria-label="Opciones de accesibilidad">
      <button
        className="a11y-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Abrir opciones de accesibilidad"
        aria-expanded={open}
        title="Accesibilidad"
      >
        ♿
      </button>

      {open && (
        <div className="a11y-panel fade-in" role="dialog" aria-label="Panel de accesibilidad">
          <div className="a11y-panel-header">
            <span>Accesibilidad</span>
            <button
              className="a11y-close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel"
            >×</button>
          </div>

          <div className="a11y-section">
            <p className="a11y-label">Tamaño de texto</p>
            <div className="a11y-font-group" role="group" aria-label="Tamaño de texto">
              <button
                className={fontSize === "normal" ? "active" : ""}
                onClick={() => setFontSize("normal")}
                aria-pressed={fontSize === "normal"}
              >
                <span style={{ fontSize: "0.85rem" }}>A</span> Normal
              </button>
              <button
                className={fontSize === "large" ? "active" : ""}
                onClick={() => setFontSize("large")}
                aria-pressed={fontSize === "large"}
              >
                <span style={{ fontSize: "1rem" }}>A</span> Grande
              </button>
              <button
                className={fontSize === "xlarge" ? "active" : ""}
                onClick={() => setFontSize("xlarge")}
                aria-pressed={fontSize === "xlarge"}
              >
                <span style={{ fontSize: "1.15rem" }}>A</span> Máximo
              </button>
            </div>
          </div>

          <div className="a11y-section">
            <p className="a11y-label">Tema</p>
            <button
              className={`a11y-toggle-contrast ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme(t => (t === "light" ? "dark" : "light"))}
              aria-pressed={theme === "light"}
            >
              {theme === "light" ? "☀️ Modo claro ON" : "🌙 Modo oscuro ON"}
            </button>
          </div>

          <div className="a11y-section">
            <p className="a11y-label">Alto contraste</p>
            <button
              className={`a11y-toggle-contrast ${contrast ? "active" : ""}`}
              onClick={() => setContrast(c => !c)}
              aria-pressed={Boolean(contrast)}
            >
              {contrast ? "🌙 Alto contraste ON" : "☀️ Alto contraste OFF"}
            </button>
          </div>

          <div className="a11y-section">
            <p className="a11y-label">Restablecer todo</p>
            <button
              className="a11y-reset"
              onClick={() => { setFontSize("normal"); setContrast(false); setTheme("dark"); }}
            >
              Restablecer valores
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
