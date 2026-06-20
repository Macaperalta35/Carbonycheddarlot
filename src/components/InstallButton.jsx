import React, { useEffect, useState } from "react";

export default function InstallButton({ variant = "default" }) {
  const [prompt,    setPrompt]    = useState(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // En iOS no hay evento — detectar si es Safari móvil y no está ya instalada
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.navigator.standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
  const showIosHint = isIos && !isInStandalone && !dismissed;

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
  };

  // Ya instalada
  if (installed || isInStandalone) return null;

  // iOS: mostrar instrucciones manuales
  if (showIosHint) {
    return (
      <div className={`install-ios-hint ${variant === "banner" ? "install-banner" : ""}`}>
        <span className="install-ios-icon">📲</span>
        <div>
          <strong>Instalar en iPhone / iPad</strong>
          <p>Toca <strong>Compartir</strong> <span style={{fontSize:"1.1em"}}>⬆️</span> y luego <strong>"Agregar a pantalla de inicio"</strong></p>
        </div>
        <button className="install-dismiss" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  // Android / Chrome: botón nativo
  if (!prompt) return null;

  if (variant === "banner") {
    return (
      <div className="install-banner">
        <span className="install-banner-icon">📲</span>
        <div>
          <strong>Instalar aplicación</strong>
          <p>Descarga la carta en tu celular o tablet</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleInstall}>
          Instalar
        </button>
        <button className="install-dismiss" onClick={() => setPrompt(null)}>✕</button>
      </div>
    );
  }

  return (
    <button className="install-btn" onClick={handleInstall}>
      📲 Instalar App
    </button>
  );
}
