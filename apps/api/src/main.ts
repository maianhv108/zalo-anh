import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cấu hình CORS (Hỗ trợ cả localhost và địa chỉ IP Wi-Fi/LAN của máy tính)
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép không có origin (mobile apps/curls), localhost, và các IP mạng nội bộ
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
          origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Trong môi trường dev, cho phép để điện thoại quét thuận tiện
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Prefix API v1
  app.setGlobalPrefix('api/v1');

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Error Handler Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Sales Zalo Management System API')
    .setDescription(
      'Hệ thống quản lý tập trung nhiều tài khoản Zalo cá nhân của đội ngũ Sale. Cung cấp API CRM khách hàng, phân công, hộp thư đa hội thoại và cơ chế xác minh Capability Gating.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  logger.log(`========================================================`);
  logger.log(`NestJS API đang chạy tại: http://localhost:${port}/api/v1`);
  logger.log(`Tài liệu Swagger OpenAPI: http://localhost:${port}/api/docs`);
  logger.log(`========================================================`);
}
bootstrap();
