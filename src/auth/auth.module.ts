// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AppConfigService } from '../config/config.service';

// Passport 策略
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
// import { FacebookStrategy } from './strategies/facebook.strategy';
// import { GoogleStrategy } from './strategies/google.strategy';
import { AuthService } from './auth.service';

import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PasswordService } from './services/password.service';
import { VerificationCodeService } from './services/verification-code.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }), // 使用无状态JWT，不需要session
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: {
          expiresIn: configService.jwt.expiresIn,
          issuer: 'hotel-management-system', // 添加发行者标识
          audience: 'hotel-users', // 添加受众标识
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // 核心认证服务
    AuthService,

    // 专门化服务
    // 密码服务
    PasswordService,
    // 验证码服务
    VerificationCodeService,
    // Token黑名单
    TokenService,

    // Passport策略
    JwtStrategy,
    LocalStrategy,
    // FacebookStrategy,
    // GoogleStrategy,

    // Guards
    LocalAuthGuard,
    FacebookAuthGuard,
    GoogleAuthGuard,
  ],
  exports: [
    PassportModule,
    JwtModule,
    AuthService,
    PasswordService,
    VerificationCodeService,
    TokenService,
  ],
})
export class AuthModule {}
