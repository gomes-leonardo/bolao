import { Inject, Injectable } from "@nestjs/common";
import { MAX_ID } from "@bolao/core/contracts";
import { jwtVerify, SignJWT } from "jose";
import { AUTH_CONFIG, type AuthConfig } from "./auth-config.js";

const ACCESS_TOKEN_TTL = "15m";

@Injectable()
export class TokenService {
  private readonly key: Uint8Array;

  constructor(@Inject(AUTH_CONFIG) config: AuthConfig) {
    this.key = new TextEncoder().encode(config.accessSecret);
  }

  sign(userId: number): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(userId))
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(this.key);
  }

  async verify(token: string): Promise<number> {
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: ["HS256"],
    });
    const sub = Number(payload.sub);
    if (!Number.isInteger(sub) || sub < 1 || sub > MAX_ID)
      throw new Error("Token sem um sub válido.");
    return sub;
  }
}
