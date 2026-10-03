import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Db } from "@bolao/core";
import type { Request } from "express";
import { unauthenticated } from "../common/errors.js";
import { DB } from "../db/db.module.js";
import { IS_PUBLIC } from "./public.decorator.js";

export const DEV_USER_HEADER = "x-dev-user-id";

/**
 * Guard provisório, só para desenvolvimento: confia no header X-Dev-User-Id.
 * A fase 4 troca este guard por um que valida o access token JWT e preenche
 * `request.user` do mesmo jeito. Controllers e services não mudam.
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
        "Autenticação ainda não implementada. Em desenvolvimento, use AUTH_MODE=dev.",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const id = Number(request.header(DEV_USER_HEADER));
    if (!Number.isInteger(id) || id < 1) {
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
