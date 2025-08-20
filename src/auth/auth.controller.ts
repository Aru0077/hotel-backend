// src/auth/auth.controller.ts - 简化的统一认证控制器
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { GetCurrentUser } from '@common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { AuthDto, SendCodeDto, RefreshTokenDto } from './dto/auth.dto';
import { AuthTokenResponse, CurrentUser } from '../types';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 统一注册端点 - 自动识别认证方式
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册（自动识别认证方式）' })
  @ApiResponse({ status: 201, description: '注册成功' })
  async register(@Body() dto: AuthDto): Promise<AuthTokenResponse> {
    return this.authService.register(dto);
  }

  // 统一登录端点 - 自动识别认证方式
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录（自动识别认证方式）' })
  @ApiResponse({ status: 200, description: '登录成功' })
  async login(@Body() dto: AuthDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  // 发送验证码
  @Public()
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  async sendCode(@Body() dto: SendCodeDto): Promise<{ success: boolean }> {
    await this.authService.sendVerificationCode(dto);
    return { success: true };
  }

  // 刷新令牌
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // 注销
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户注销' })
  @ApiResponse({ status: 200, description: '注销成功' })
  async logout(
    @GetCurrentUser() user: CurrentUser,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(user);
  }
}
