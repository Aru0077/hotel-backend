// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AppConfigService } from '../config/config.service';

/**
 * 认证模块
 * 整合用户认证相关的所有组件，包括JWT配置、Passport策略和认证服务
 * 作为整个认证系统的核心协调模块
 */
@Module({
  imports: [
    // 导入用户模块以使用用户服务
    UsersModule,

    // 配置Passport模块
    PassportModule.register({
      defaultStrategy: 'jwt', // 设置默认认证策略为JWT
      property: 'user', // 将用户信息附加到request.user
      session: false, // 禁用session，使用无状态JWT
    }),

    // 配置JWT模块 - 访问令牌
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: {
          expiresIn: configService.jwt.expiresIn,
        },
      }),
    }),
  ],

  providers: [
    AuthService,
    // JWT策略和本地策略将在后续步骤中添加
  ],

  exports: [
    AuthService,
    JwtModule, // 导出JWT模块供其他模块使用
    PassportModule, // 导出Passport模块供其他模块使用
  ],
})
export class AuthModule {}
