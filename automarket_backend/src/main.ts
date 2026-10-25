import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS_ORIGINS (lista separada por vírgula; APP_CORS_ALLOWED_ORIGINS é
  // aceito como apelido) SUBSTITUI o padrão de dev — em produção inclua só
  // a(s) URL(s) do front.
  const origins = (
    process.env.CORS_ORIGINS ??
    process.env.APP_CORS_ALLOWED_ORIGINS ??
    'http://localhost:5173'
  )
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // 0.0.0.0: dentro de container (Render) o proxy não alcança 127.0.0.1.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
