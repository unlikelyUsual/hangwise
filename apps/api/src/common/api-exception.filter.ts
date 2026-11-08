import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { DomainError } from "../domain/errors";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>();
    const request = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const requestId = headerValue(request.headers, "x-request-id");
    if (exception instanceof DomainError) {
      response.status(exception.status).send({ error: { code: exception.code, message: exception.message, requestId } });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const details = validationDetails(payload);
      response.status(status).send({
        error: {
          code: status === 400 ? "VALIDATION" : status === 429 ? "RATE_LIMITED" : "HTTP_ERROR",
          message: status === 400 ? "Request validation failed." : exception.message,
          requestId,
          ...(details.length ? { details } : {}),
        },
      });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.message : "Unhandled error");
    response.status(500).send({ error: { code: "INTERNAL", message: "Something went wrong.", requestId } });
  }
}

function validationDetails(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === "string" && message !== "Bad Request Exception") return [message];
  return [];
}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
