import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取配置服务实例
  const configService = app.get(AppConfigService);

  // 配置跨域
  app.enableCors({
    origin: configService.allowedOrigins,
    credentials: true,
  });

  // 使用配置服务的端口设置
  await app.listen(configService.port);

  console.log(
    `Application is running on: http://localhost:${configService.port}`,
  );
}
void bootstrap();
