async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. 获取配置服务（Config已在模块级别配置）
  const configService = app.get(AppConfigService);
  
  // 2. 安全中间件配置
  app.use(helmet());
  
  // 3. CORS配置
  app.enableCors({
    origin: configService.allowedOrigins,
    credentials: true,
  });
  
  // 4. 请求日志中间件
  app.use(morgan('combined'));
  
  // 5. 速率限制
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100 // 限制每个IP最多100个请求
  }));
  
  // 6. 全局验证管道（Pipes）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // 7. 全局卫士
  app.useGlobalGuards(new JwtAuthGuard());
  
  // 8. 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  
  // 9. 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // 10. Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  // 11. 启动应用
  await app.listen(configService.port);
}




// src/example/example.controller.ts - 使用示例
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('示例')
@Controller('example')
export class ExampleController {
  
  // 公开接口示例 - 无需JWT认证
  @Public()
  @Get('public')
  @ApiOperation({ summary: '公开接口示例' })
  @ApiResponse({ status: 200, description: '成功返回数据' })
  getPublicData() {
    return { message: '这是一个公开接口，无需认证' };
  }

  // 受保护接口示例 - 需要JWT认证
  @Get('protected')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '受保护接口示例' })
  @ApiResponse({ status: 200, description: '成功返回数据' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  getProtectedData() {
    return { message: '这是一个受保护的接口，需要有效的JWT令牌' };
  }

  // 自定义速率限制示例
  @Post('limited')
  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分钟内最多5次请求
  @ApiOperation({ summary: '自定义速率限制接口' })
  @ApiResponse({ status: 200, description: '成功处理请求' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  createWithLimit(@Body() data: any) {
    return { 
      message: '请求已处理',
      data,
      rateLimit: '此接口限制为每分钟5次请求'
    };
  }
}