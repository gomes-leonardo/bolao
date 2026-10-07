import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { unauthenticated } from "../common/errors.js";
import { DevAuthGuard } from "./dev-auth.guard.js";
import { IS_PUBLIC } from "./public.decorator.js";
import { TokenService } from "./token.service.js";

const BEARER = /^Bearer\s+(\S+)$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    @Inject(DevAuthGuard) private readonly dev: DevAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header("authorization");
    if (authorization === undefined) return this.dev.canActivate(context);

    const token = BEARER.exec(authorization)?.[1];
    if (!token) throw unauthenticated("Token de acesso inválido.");

    let id: number;
    try {
      id = await this.tokens.verify(token);
    } catch {
      throw unauthenticated("Token de acesso inválido.");
    }
    request.user = { id };
    return true;
  }
}
