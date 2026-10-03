import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { buildMatch } from "../test/factories";
import { type Draft, MatchCard } from "./MatchCard";

function makeSut(overrides: Partial<Parameters<typeof MatchCard>[0]> = {}) {
  const onDraftChange = vi.fn<(draft: Draft) => void>();
  const onSave = vi.fn<() => void>();
  render(
    <MemoryRouter>
      <MatchCard
        match={buildMatch()}
        draft={{ home: 1, away: 0 }}
        onDraftChange={onDraftChange}
        onSave={onSave}
        timeLeft="FECHA EM 2H14"
        {...overrides}
      />
    </MemoryRouter>,
  );
  return { onDraftChange, onSave, user: userEvent.setup() };
}

describe("MatchCard aberto", () => {
  it("mostra quanto falta e chama a gravação", async () => {
    const { onSave, user } = makeSut();

    expect(screen.getByText("FECHA EM 2H14")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "COLA TEU PALPITE" }));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("muda o rascunho pelos botões de gol", async () => {
    const { onDraftChange, user } = makeSut();

    await user.click(
      screen.getByRole("button", { name: "Mais um gol do São Paulo" }),
    );

    expect(onDraftChange).toHaveBeenCalledWith({ home: 1, away: 1 });
  });

  it("não deixa gol negativo", () => {
    makeSut({ draft: { home: 0, away: 0 } });

    expect(
      screen.getByRole("button", { name: "Menos um gol do Corinthians" }),
    ).toBeDisabled();
  });

  it("mostra o palpite já colado e desabilita até mudar", () => {
    makeSut({
      match: buildMatch({ myPrediction: { home: 1, away: 0, points: null } }),
    });

    expect(screen.getByRole("button", { name: "COLADO: 1–0" })).toBeDisabled();
  });

  it("oferece trocar quando o rascunho difere do palpite colado", () => {
    makeSut({
      match: buildMatch({ myPrediction: { home: 2, away: 2, points: null } }),
      draft: { home: 3, away: 2 },
    });

    expect(
      screen.getByRole("button", { name: "TROCA O PALPITE" }),
    ).toBeEnabled();
  });

  it("mostra o erro da gravação", () => {
    makeSut({ error: "Bola rolou, palpite trancado." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bola rolou, palpite trancado.",
    );
  });
});

describe("MatchCard trancado", () => {
  it("carimba TRANCADO e mostra o placar ao vivo", () => {
    makeSut({
      match: buildMatch({
        status: "live",
        locked: true,
        score: { home: 1, away: 1 },
        myPrediction: { home: 2, away: 0, points: null },
      }),
      wallHref: "/boloes/1/jogos/1",
    });

    expect(screen.getByText("AO VIVO")).toBeInTheDocument();
    expect(screen.getByText("1–1")).toBeInTheDocument();
    expect(screen.getByText("TRANCADO")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver o muro da galera" }),
    ).toHaveAttribute("href", "/boloes/1/jogos/1");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("carimba o veredito do jogo encerrado", () => {
    makeSut({
      match: buildMatch({
        status: "finished",
        locked: true,
        score: { home: 2, away: 1 },
        myPrediction: { home: 2, away: 1, points: 3 },
      }),
    });

    expect(screen.getByText("ENCERRADO")).toBeInTheDocument();
    expect(screen.getByText("CRAVOU +3")).toBeInTheDocument();
  });

  it("avisa quando não houve palpite", () => {
    makeSut({
      match: buildMatch({
        status: "live",
        locked: true,
        score: { home: 0, away: 0 },
      }),
    });

    expect(screen.getByText("Tu não palpitou")).toBeInTheDocument();
  });
});
