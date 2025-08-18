import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  // 获取配置服务实例
  const configService = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // ============ 第一阶段：安全中间件配置 ============
  // 1. Helmet安全头配置
  app.use(
    helmet({
      contentSecurityPolicy: configService.isProduction ? undefined : false,
    }),
  );

  // 2. 压缩中间件
  app.use(compression());

  // 3. CORS配置
  app.enableCors({
    origin: configService.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ============ 第二阶段：全局管道配置 ============

  // 1. 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离DTO中未定义的属性
      forbidNonWhitelisted: true, // 如果有未定义的属性则抛出错误
      forbidUnknownValues: true, // 未知属性抛出错误
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

  // ============ 第三阶段：API文档配置 ============

  if (configService.isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('酒店管理系统 API')
      .setDescription('酒店管理系统后端API文档')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '请输入JWT令牌',
        },
        'access-token',
      )
      .addTag('认证', '用户认证相关接口')
      .addTag('健康检查', '系统健康状态检查')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log(
      'API文档已启用，访问地址: http://localhost:${configService.port}/api/docs',
    );
  }

  // ============ 第四阶段：应用启动 ============

  // 启用优雅关闭
  app.enableShutdownHooks();

  // 使用配置服务的端口设置
  await app.listen(configService.port);

  logger.log(`应用程序运行在: http://localhost:${configService.port}`);
  logger.log(`环境: ${configService.nodeEnv}`);

  if (configService.isDevelopment) {
    logger.log('开发模式已启用，包含详细日志和API文档');
  }
}
void bootstrap();
