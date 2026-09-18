import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles.css";

const rootElement = document.querySelector<HTMLElement>("#root");
if (rootElement === null) throw new Error("Missing #root element");

const convexUrl = import.meta.env.VITE_CONVEX_URL;

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
