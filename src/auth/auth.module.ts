// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AppConfigService } from '../config/config.service';

// Passport 策略
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

// 认证服务
import { AuthService } from './auth.service';

// 专门化服务
import { PasswordService } from './services/password.service';
import { VerificationCodeService } from './services/verification-code.service';
import { TokenService } from './services/token.service';

// Guards
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwt.secret,
        signOptions: {
          expiresIn: configService.jwt.expiresIn,
          issuer: 'hotel-management-system',
          audience: 'hotel-users',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // 核心认证服务
    AuthService,

    // 专门化服务
    PasswordService,
    VerificationCodeService,
    TokenService,

    // Passport策略
    JwtStrategy,
    LocalStrategy,

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
