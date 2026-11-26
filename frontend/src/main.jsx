/*
 * @feature: Frontend Entry Point
 * @description: Mounts the React app and loads global Tailwind styles.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
