// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  UsernamePasswordRegisterDto,
  EmailRegisterDto,
  PhoneRegisterDto,
  PasswordLoginDto,
  EmailLoginDto,
  PhoneLoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
  LogoutDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthTokenResponse, CurrentUser } from '../types';
import { GetCurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============ 注册接口 ============

  /**
   * 用户名密码注册
   */
  @Public()
  @Post('register/username-password')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户名密码注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async registerWithUsernamePassword(
    @Body() dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.registerWithUsernamePassword(dto);
  }

  /**
   * 邮箱验证码注册
   */
  @Public()
  @Post('register/email-code')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '邮箱验证码注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '验证码错误或已过期' })
  @ApiResponse({ status: 409, description: '邮箱已存在' })
  async registerWithEmailCode(
    @Body() dto: EmailRegisterDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.registerWithEmailCode(dto);
  }

  /**
   * 手机验证码注册
   */
  @Public()
  @Post('register/phone-code')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '手机验证码注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '验证码错误或已过期' })
  @ApiResponse({ status: 409, description: '手机号已存在' })
  async registerWithPhoneCode(
    @Body() dto: PhoneRegisterDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.registerWithPhoneCode(dto);
  }

  // ============ 登录接口 ============

  /**
   * 密码登录 - 支持用户名/邮箱/手机号+密码
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '密码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '认证失败' })
  async loginWithPassword(
    @Body() dto: PasswordLoginDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.loginWithPassword(dto);
  }

  /**
   * 邮箱验证码登录
   */
  @Public()
  @Post('login/email-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '邮箱验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  async loginWithEmailCode(
    @Body() dto: EmailLoginDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.loginWithEmailCode(dto);
  }

  /**
   * 手机验证码登录
   */
  @Public()
  @Post('login/phone-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  async loginWithPhoneCode(
    @Body() dto: PhoneLoginDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.loginWithPhoneCode(dto);
  }

  // ============ 辅助接口 ============

  /**
   * 发送验证码
   */
  @Public()
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 429, description: '发送频率过高' })
  async sendVerificationCode(
    @Body() dto: SendVerificationCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.sendVerificationCode(dto);
  }

  /**
   * 刷新令牌
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * 用户注销
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '用户注销' })
  @ApiResponse({ status: 200, description: '注销成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 400, description: '注销失败' })
  async logout(
    @GetCurrentUser() currentUser: CurrentUser,
    @Body() dto?: LogoutDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(currentUser, dto);
  }
}
