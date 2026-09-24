import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles.css";

const rootElement = document.querySelector<HTMLElement>("#root");
if (rootElement === null) throw new Error("Missing #root element");

const configuredConvexUrl = import.meta.env.VITE_CONVEX_URL;
let convexUrl = configuredConvexUrl;

if (import.meta.env.DEV && configuredConvexUrl) {
  const url = new URL(configuredConvexUrl);
  if (
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    window.location.hostname !== "127.0.0.1" &&
    window.location.hostname !== "localhost"
  ) {
    url.hostname = window.location.hostname;
  }
  convexUrl = url.origin;
}

if (convexUrl === undefined || convexUrl.length === 0) {
  createRoot(rootElement).render(
    <StrictMode>
      <main className="setup-screen">
        <p className="eyebrow">Backend not configured</p>
        <h1>Start the local Convex deployment.</h1>
        <code>npm run convex:dev</code>
      </main>
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  createRoot(rootElement).render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <RouterProvider router={router} />
      </ConvexProvider>
    </StrictMode>,
  );
}
