import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

// 全局组件
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [
    // 配置模块
    AppConfigModule,

    // 基础设施模块
    PrismaModule,
    RedisModule,

    // 功能模块
    AuthModule,
    SmsModule,

    // 系统模块
    HealthModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => [
        {
          ttl: 60000, // 60秒
          limit: configService.isProduction ? 100 : 1000, // 生产环境更严格
        },
      ],
    }),
  ],
  providers: [
    // 全局守卫 - 速率限制
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // 全局守卫 - JWT认证
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // 全局拦截器 - 请求日志
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // 全局拦截器 - 响应转换
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },

    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
