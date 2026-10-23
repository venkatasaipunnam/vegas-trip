import React from "react";
import { createRoot } from "react-dom/client";
// MapLibre's stylesheet first: our own rules deliberately override some of it
// (marker positioning, popup chrome) and have to win.
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
