import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AUTH_CONFIG, loadAuthConfig } from "./auth-config.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { DevAuthGuard } from "./dev-auth.guard.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { TokenService } from "./token.service.js";
import {
  USERS_GATEWAY,
  usersGatewayProvider,
} from "./users-gateway.provider.js";

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AUTH_CONFIG, useFactory: loadAuthConfig },
    usersGatewayProvider,
    DevAuthGuard,
    TokenService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // O MeController está registrado no AppModule, não aqui, então ele só resolve
  // a porta se este módulo a exportar.
  exports: [USERS_GATEWAY],
})
export class AuthModule {}
