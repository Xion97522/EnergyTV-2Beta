import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAdBlock } from "./lib/adblock";

// Boot ad blocker before any React rendering so fetch/XHR are patched first
initAdBlock();

createRoot(document.getElementById("root")!).render(<App />);
