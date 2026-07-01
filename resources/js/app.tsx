import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { Toaster } from "sonner";
import "./../css/app.css";

createInertiaApp({
  resolve: (name) =>
    resolvePageComponent(
      `./Pages/${name}.tsx`,
      import.meta.glob("./Pages/**/*.tsx")
    ),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(
      <>
        <App {...props} />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1A2438",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#fff",
              borderRadius: "12px",
            },
          }}
        />
      </>
    );
  },
  progress: {
    color: "#10B981",
  },
});
