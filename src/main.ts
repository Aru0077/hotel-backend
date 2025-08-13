import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  // 获取配置服务实例
  const configService = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // 1. 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离DTO中未定义的属性
      forbidNonWhitelisted: true, // 如果有未定义的属性则抛出错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
      validationError: {
        target: false, // 生产环境不返回目标对象
        value: false, // 生产环境不返回验证值
      },
    }),
  );

  // // 2. 全局异常过滤器
  // app.useGlobalFilters(new HttpExceptionFilter());

  // // 3. 全局拦截器
  // app.useGlobalInterceptors(new PrismaErrorInterceptor());

  // 4. CORS配置
  app.enableCors({
    origin: configService.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 5. 优雅关闭
  app.enableShutdownHooks();

  // 使用配置服务的端口设置
  await app.listen(configService.port);

  logger.log(
    `Application is running on: http://localhost:${configService.port}`,
  );
}
void bootstrap();
