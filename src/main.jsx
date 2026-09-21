import { jsx } from "react/jsx-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";
const router = getRouter();
const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  createRoot(rootElement).render(
    /* @__PURE__ */ jsx(React.StrictMode, {
      children: /* @__PURE__ */ jsx(RouterProvider, { router }),
    }),
  );
}
