import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { createDatabaseIfNotExists } from './config/create-database';

/**
 * The API's own version, read from its package.json so the Swagger docs can
 * never drift from the release bump. `__dirname` is `dist/` at runtime — and
 * `/app/` in the production image, where the Dockerfile copies package.json —
 * so `../package.json` is the package root in both cases.
 */
function readPackageVersion(): string {
  const raw = fs.readFileSync(
    path.join(__dirname, '..', 'package.json'),
    'utf8',
  );
  const pkg = JSON.parse(raw) as { version?: string };
  return pkg.version ?? '0.0.0';
}

async function bootstrap() {
  await createDatabaseIfNotExists();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind Caddy (the single reverse-proxy hop) in production: trust it so
  // `request.ip` is the real client address. Email rate limiting keys the
  // public contact form on the client IP, so without this every visitor would
  // share Caddy's address and the daily limit would be exhausted instantly.
  app.set('trust proxy', 1);

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['http://localhost:8100', 'http://localhost:5173'];

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Trade CRM API')
    .setDescription('Multi-tenant trade business CRM')
    .setVersion(readPackageVersion())
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
