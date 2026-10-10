import React from "react";
import ReactDOM from "react-dom/client";
import { InterstitialApp } from "./InterstitialApp";
import "../index.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <InterstitialApp />
    </React.StrictMode>
  );
}
