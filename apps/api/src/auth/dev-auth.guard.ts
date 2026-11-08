import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ENV, type Env } from "../config/env";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DEV_SECRET_HEADER, DEV_USER_HEADER } from "../demo/personas";
import { DomainError } from "../domain/errors";
import { secretsMatch } from "../domain/hash";
import type { Actor } from "../domain/types";
import { IS_PUBLIC } from "./public.decorator";

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: Env,
    @Inject(HANGWISE_DATA) private readonly data: HangwiseData,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    if (this.env.authMode !== "development" || !this.env.devAuthSecret) {
      throw new DomainError(
        "AUTH_UNAVAILABLE",
        "Authentication is not configured. This skeleton fails closed outside development auth.",
        401,
      );
    }
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; actor?: Actor }>();
    const userId = headerValue(request.headers, DEV_USER_HEADER);
    const secret = headerValue(request.headers, DEV_SECRET_HEADER);
    if (!userId || !secret || !secretsMatch(secret, this.env.devAuthSecret)) {
      throw new DomainError("AUTH_REQUIRED", "Development authentication was rejected.", 401);
    }
    const user = await this.data.getUser(userId);
    if (!user?.isDemo) {
      throw new DomainError("AUTH_REQUIRED", "Development authentication was rejected.", 401);
    }
    request.actor = { userId: user.id, role: user.role, displayName: user.displayName, isDemo: true };
    return true;
  }
}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}
