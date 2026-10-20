import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";
import { App } from "./App";
import "./styles.css";
import "./canvas.css";

if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_REACT_DEVTOOLS !== "1") {
  void import("react-grab");
  void import("react-scan");
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
