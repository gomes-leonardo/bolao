import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  type AuthSession,
  type LoginInput,
  loginSchema,
  type RegisterInput,
  registerSchema,
} from "@bolao/core/contracts";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.decorator.js";

@Public()
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<AuthSession> {
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
  ): Promise<AuthSession> {
    return this.auth.login(body);
  }
}
