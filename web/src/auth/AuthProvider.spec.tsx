import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { clearSession, readSession, writeSession } from "./session";
import { useAuth } from "./useAuth";

const leo = { id: 7, name: "Leo", email: "leo@carimbou.dev" };
const fetchMock = vi.fn<typeof fetch>();

function makeSut() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    clearSession();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("sem sessão, começa anônimo e não chama a API", () => {
    const { result } = makeSut();

    expect(result.current.status).toBe("anonymous");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com sessão válida, fica autenticado com o usuário do /me", async () => {
    writeSession({ kind: "dev", userId: 7 });
    fetchMock.mockResolvedValue(Response.json(leo));

    const { result } = makeSut();

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user).toEqual(leo);
  });

  it("com sessão recusada (401), fica anônimo e apaga a sessão guardada", async () => {
    writeSession({ kind: "dev", userId: 999 });
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Não." } },
        { status: 401 },
      ),
    );

    const { result } = makeSut();

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(readSession()).toBeNull();
  });

  it("com a API fora do ar, mostra erro e deixa tentar de novo", async () => {
    writeSession({ kind: "dev", userId: 7 });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = makeSut();

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(readSession()).toEqual({ kind: "dev", userId: 7 });

    fetchMock.mockResolvedValue(Response.json(leo));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
  });

  it("sair limpa a sessão", async () => {
    writeSession({ kind: "dev", userId: 7 });
    fetchMock.mockResolvedValue(Response.json(leo));
    const { result } = makeSut();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    act(() => result.current.signOut());

    expect(result.current.status).toBe("anonymous");
    expect(readSession()).toBeNull();
  });
});
