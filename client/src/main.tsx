import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./components/auth-provider";
import { CreditsProvider } from "./components/credits-provider";

// Create a default initial auth context value
const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CreditsProvider>
          <App />
        </CreditsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
