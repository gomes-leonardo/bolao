import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Db } from "@bolao/core";
import { MAX_ID } from "@bolao/core/contracts";
import type { Request } from "express";
import { unauthenticated } from "../common/errors.js";
import { DB } from "../db/db.module.js";
import { IS_PUBLIC } from "./public.decorator.js";

export const DEV_USER_HEADER = "x-dev-user-id";

/**
 * Caminho de desenvolvimento: confia no header X-Dev-User-Id, só com
 * `AUTH_MODE=dev`. O JwtAuthGuard (APP_GUARD) delega para cá quando a requisição
 * não traz `Authorization`, então o header continua funcionando só em dev.
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DB) private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    if (process.env["AUTH_MODE"] !== "dev") {
      throw unauthenticated(
        "Faz login pra continuar. Em desenvolvimento (AUTH_MODE=dev), dá pra entrar com o header X-Dev-User-Id.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const id = Number(request.header(DEV_USER_HEADER));
    if (!Number.isInteger(id) || id < 1 || id > MAX_ID) {
      throw unauthenticated(
        "Envie o header X-Dev-User-Id com o id do usuário.",
      );
    }
    const user = await this.db.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw unauthenticated(`Usuário ${id} não existe.`);

    request.user = user;
    return true;
  }
}
