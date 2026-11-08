import { DocumentBuilder } from "@nestjs/swagger";

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle("Hangwise API")
    .setDescription(
      "Demo skeleton for a paid, non-sexual, one-day public date marketplace. " +
        "Payments, identity verification, and production authentication are not implemented. " +
        "Development auth is rejected unless NODE_ENV is development or test and AUTH_MODE=development. " +
        "Companion ages are fictional and unverified. A hold does not charge a card.",
    )
    .setVersion("0.1.0")
    .addServer("http://127.0.0.1:3000", "Local API")
    .addApiKey({ type: "apiKey", name: "X-Hangwise-Dev-User", in: "header" }, "devUser")
    .addApiKey({ type: "apiKey", name: "X-Hangwise-Dev-Secret", in: "header" }, "devSecret")
    .build();
}
