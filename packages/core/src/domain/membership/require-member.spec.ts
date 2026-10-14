import { describe, expect, it } from "vitest";
import { fakeMembershipGateway } from "./__fixtures__/fake-membership-gateway.ts";
import { NotPoolOwnerError, PoolNotVisibleError } from "./membership-errors.ts";
import { requireMember, requireOwner } from "./require-member.ts";

const pool = { id: 42, ownerId: 7, season: 2026 };

describe("requireMember", () => {
  it("devolve o bolão quando ele está visível", async () => {
    const gateway = fakeMembershipGateway({ pool });

    await expect(requireMember(gateway, 42, 9)).resolves.toEqual(pool);
  });

  it("consulta a porta com o bolão e o usuário, nessa ordem", async () => {
    const gateway = fakeMembershipGateway({ pool });

    await requireMember(gateway, 42, 9);

    // Trocar os dois parâmetros autorizaria a pessoa errada sem mudar nenhum
    // valor de retorno, então nenhum outro caso deste spec pegaria a inversão.
    expect(gateway.findCalls).toEqual([{ poolId: 42, userId: 9 }]);
  });

  it("bolão invisível recusa sem dizer se existe", async () => {
    const gateway = fakeMembershipGateway();

    await expect(requireMember(gateway, 42, 9)).rejects.toBeInstanceOf(
      PoolNotVisibleError,
    );
  });

  it("não-membro e bolão inexistente são o mesmo erro", async () => {
    // Os dois casos entram pela porta como o mesmo `null`. Este caso existe
    // para pinar que o domínio não tem como distingui-los nem por acidente.
    const naoExiste = fakeMembershipGateway();
    const naoSouMembro = fakeMembershipGateway();

    const [a, b] = await Promise.all([
      requireMember(naoExiste, 42, 9).catch((error: unknown) => error),
      requireMember(naoSouMembro, 42, 9).catch((error: unknown) => error),
    ]);

    expect(a).toBeInstanceOf(PoolNotVisibleError);
    expect(b).toBeInstanceOf(PoolNotVisibleError);
    expect((a as Error).message).toBe((b as Error).message);
  });
});

describe("requireOwner", () => {
  it("o dono passa e recebe o bolão", async () => {
    const gateway = fakeMembershipGateway({ pool });

    await expect(requireOwner(gateway, 42, 7)).resolves.toEqual(pool);
  });

  it("membro que não é dono é recusado", async () => {
    const gateway = fakeMembershipGateway({ pool });

    await expect(requireOwner(gateway, 42, 9)).rejects.toBeInstanceOf(
      NotPoolOwnerError,
    );
  });

  it("não-membro é recusado por invisibilidade, não por não ser dono", async () => {
    // A ordem importa: checar a propriedade primeiro revelaria que o bolão
    // existe para quem não devia nem saber disso.
    const gateway = fakeMembershipGateway();

    await expect(requireOwner(gateway, 42, 9)).rejects.toBeInstanceOf(
      PoolNotVisibleError,
    );
  });
});
