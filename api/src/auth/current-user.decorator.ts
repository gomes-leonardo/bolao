import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { unauthenticated } from "../common/errors.js";
import type { AuthenticatedUser } from "./authenticated-user.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw unauthenticated();
    return user;
  },
);
