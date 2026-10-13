import type { Db } from "../../db.ts";
import type { UsersGateway } from "../../domain/users/users-gateway.ts";
import { violatedUniqueConstraint } from "./unique-constraint.ts";

export function createPrismaUsersGateway(db: Db): UsersGateway {
  return {
    async createUnlessEmailTaken(command) {
      try {
        return await db.user.create({
          data: command,
          select: { id: true, name: true, email: true },
        });
      } catch (error) {
        // Saber que P2002 com esta constraint significa "e-mail já usado" é
        // conhecimento do Postgres, e para aqui. Quem chama recebe null.
        if (violatedUniqueConstraint(error) === "users_email_key") return null;
        throw error;
      }
    },

    findCredentialsByEmail(email) {
      return db.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, passwordHash: true },
      });
    },

    findById(id) {
      return db.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true },
      });
    },

    async exists(id) {
      const user = await db.user.findUnique({
        where: { id },
        select: { id: true },
      });
      return user !== null;
    },
  };
}
