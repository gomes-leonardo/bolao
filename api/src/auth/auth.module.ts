import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AUTH_CONFIG, loadAuthConfig } from "./auth-config.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { DevAuthGuard } from "./dev-auth.guard.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { TokenService } from "./token.service.js";

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AUTH_CONFIG, useFactory: loadAuthConfig },
    DevAuthGuard,
    TokenService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
