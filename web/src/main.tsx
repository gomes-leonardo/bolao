import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ApiRequestError } from "./api/client";
import { AuthProvider } from "./auth/AuthProvider";
import { router } from "./router";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failures, error) =>
        !(
          error instanceof ApiRequestError &&
          error.status >= 400 &&
          error.status < 500
        ) && failures < 2,
    },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no index.html.");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
