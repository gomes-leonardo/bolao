import type { INestApplication } from "@nestjs/common";

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env["WEB_ORIGIN"] ?? "http://localhost:5174",
  });
  app.enableShutdownHooks();
}
