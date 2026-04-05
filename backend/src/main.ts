import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  // Unknown fields → 400 Bad Request (TC-023)
  // Invalid content (e.g. weak password) → 422 Unprocessable Entity (TC-022)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const hasUnknownField = errors.some(
          (e) => e.constraints && 'whitelistValidation' in e.constraints,
        );
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
        return hasUnknownField
          ? new BadRequestException(messages)
          : new UnprocessableEntityException(messages);
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('BIM AI Assistant API')
    .setDescription('API for BIM AI Assistant')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
