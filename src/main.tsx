import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./index.css";

try {
  const t = localStorage.getItem("sam_theme");
  if (t === "dark") document.documentElement.classList.add("dark");
  else { document.documentElement.classList.remove("dark"); localStorage.setItem("sam_theme", "light"); }
} catch {}

const router = getRouter();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
