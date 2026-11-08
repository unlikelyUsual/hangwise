import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { DomainError } from "../domain/errors";
import { rateLimitDecision } from "../domain/rate-limit";

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.env.nodeEnv === "test") return true;
    const request = context.switchToHttp().getRequest<{ url?: string; ip?: string; socket?: { remoteAddress?: string } }>();
    const url = request.url ?? "";
    if (url.startsWith("/health") || url.startsWith("/docs") || url.startsWith("/openapi.json")) return true;
    const ip = request.ip || request.socket?.remoteAddress || "unknown";
    const decision = rateLimitDecision(this.hits.get(ip) ?? [], Date.now(), this.env.rateLimitWindowMs, this.env.rateLimitMax);
    this.hits.set(ip, decision.next);
    if (!decision.allowed) {
      throw new DomainError("RATE_LIMITED", "Too many requests from this client.", 429);
    }
    return true;
  }
}
