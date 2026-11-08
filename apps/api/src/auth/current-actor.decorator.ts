import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { DomainError } from "../domain/errors";
import type { Actor } from "../domain/types";

export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext): Actor => {
  const request = context.switchToHttp().getRequest<{ actor?: Actor }>();
  if (!request.actor) {
    throw new DomainError("AUTH_REQUIRED", "Development authentication was rejected.", 401);
  }
  return request.actor;
});
