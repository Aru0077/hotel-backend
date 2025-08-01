// src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './configuration';
import { AppConfigService } from './config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema, // 使用 Joi 验证
      isGlobal: true,
      cache: true,
      validationOptions: {
        allowUnknown: true, // 允许环境变量中有未定义的键
        abortEarly: false, // 收集所有错误而不是在第一个错误时停止
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
