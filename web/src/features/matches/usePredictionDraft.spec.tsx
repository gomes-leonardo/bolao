import type { MatchView } from "@bolao/core/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { buildMatch } from "../../test/factories";
import { usePredictionDraft } from "./usePredictionDraft";

function makeSut(initial: MatchView) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(({ match }) => usePredictionDraft(match), {
    wrapper,
    initialProps: { match: initial },
  });
}

const withPrediction = (home: number, away: number) =>
  buildMatch({ myPrediction: { home, away, points: null } });

describe("usePredictionDraft", () => {
  it("começa do palpite salvo, ou de 0 a 0", () => {
    expect(makeSut(withPrediction(2, 1)).result.current.draft).toEqual({
      home: 2,
      away: 1,
    });
    expect(makeSut(buildMatch()).result.current.draft).toEqual({
      home: 0,
      away: 0,
    });
  });

  it("acompanha um palpite mais novo vindo do servidor quando não houve edição", () => {
    const { result, rerender } = makeSut(withPrediction(2, 1));

    rerender({ match: withPrediction(0, 0) });

    expect(result.current.draft).toEqual({ home: 0, away: 0 });
  });

  it("preserva a edição local quando o servidor muda", () => {
    const { result, rerender } = makeSut(withPrediction(2, 1));
    act(() => result.current.setDraft({ home: 3, away: 1 }));

    rerender({ match: withPrediction(0, 0) });

    expect(result.current.draft).toEqual({ home: 3, away: 1 });
  });
});
