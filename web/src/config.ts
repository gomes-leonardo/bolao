export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3333/api",
  authMode: import.meta.env.VITE_AUTH_MODE === "dev" ? "dev" : "jwt",
} as const;
