import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAdBlock } from "./lib/adblock";

// Boot ad blocker BEFORE React renders (important for fetch/XHR patching)
initAdBlock();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
