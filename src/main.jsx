import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import ScrollToTop from "./components/ScrollToTop";
import { KitHost, VariantHost, VariantSwitcher } from "./immersive/Hosts";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ScrollToTop />
    <Routes>
      <Route path="/kit/:name" element={<KitHost />} />
      <Route path="/v/:id/*" element={<VariantHost />} />
      <Route path="*" element={<App />} />
    </Routes>
    <VariantSwitcher />
  </BrowserRouter>
);
