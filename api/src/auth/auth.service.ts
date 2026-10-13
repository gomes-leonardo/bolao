import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { hashPassword, verifyPassword } from "@bolao/core/auth";
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
} from "@bolao/core/contracts";
import type { UsersGateway } from "@bolao/core/domain";
import { emailTaken, invalidCredentials } from "../common/errors.js";
import { AUTH_CONFIG, type AuthConfig } from "./auth-config.js";
import { TokenService } from "./token.service.js";
import { USERS_GATEWAY } from "./users-gateway.provider.js";

const SENTINEL_PASSWORD = "sentinel-carimbou";

@Injectable()
export class AuthService implements OnModuleInit {
  private sentinelHash = "";

  constructor(
    @Inject(USERS_GATEWAY) private readonly users: UsersGateway,
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
    const user = await this.users.createUnlessEmailTaken({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(
        input.password,
        this.config.bcryptRounds,
      ),
    });
    if (!user) throw emailTaken();
    return { user, accessToken: await this.tokens.sign(user.id) };
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.users.findCredentialsByEmail(input.email);
    // Os dois ramos comparam uma senha: e-mail que não existe compara contra o
    // sentinela, para o tempo de resposta não dizer qual foi o caso.
    const hash = user?.passwordHash ?? this.sentinelHash;
    const ok = await verifyPassword(input.password, hash);
    if (!user || !ok) throw invalidCredentials();
    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: await this.tokens.sign(user.id),
    };
  }
}
