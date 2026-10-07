import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type { Db } from "@bolao/core";
import { hashPassword, verifyPassword } from "@bolao/core/auth";
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  UserView,
} from "@bolao/core/contracts";
import { emailTaken, invalidCredentials } from "../common/errors.js";
import { violatedUniqueConstraint } from "../common/prisma-errors.js";
import { DB } from "../db/db.module.js";
import { AUTH_CONFIG, type AuthConfig } from "./auth-config.js";
import { TokenService } from "./token.service.js";

const SENTINEL_PASSWORD = "sentinel-carimbou";

@Injectable()
export class AuthService implements OnModuleInit {
  private sentinelHash = "";

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
    private readonly tokens: TokenService,
  ) {}

  /** Compara contra este hash quando o e-mail não existe, para gastar o mesmo tempo. */
  async onModuleInit(): Promise<void> {
    this.sentinelHash = await hashPassword(
      SENTINEL_PASSWORD,
      this.config.bcryptRounds,
    );
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    let user: UserView;
    try {
      user = await this.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(
            input.password,
            this.config.bcryptRounds,
          ),
        },
        select: { id: true, name: true, email: true },
      });
    } catch (error) {
      if (violatedUniqueConstraint(error) === "users_email_key")
        throw emailTaken();
      throw error;
    }
    return { user, accessToken: await this.tokens.sign(user.id) };
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
    const hash = user?.passwordHash ?? this.sentinelHash;
    const ok = await verifyPassword(input.password, hash);
    if (!user || !ok) throw invalidCredentials();
    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: await this.tokens.sign(user.id),
    };
  }
}
