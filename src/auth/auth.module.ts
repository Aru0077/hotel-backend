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
import { TokenBlacklistService } from './services/token-blacklist.service';

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
    AuthService,
    JwtStrategy,

    // Token黑名单
    TokenBlacklistService,

    LocalAuthGuard,
    LocalStrategy,

    FacebookAuthGuard,
    // FacebookStrategy,

    GoogleAuthGuard,
    // GoogleStrategy,
  ],
  exports: [PassportModule, JwtModule, AuthService],
})
export class AuthModule {}
