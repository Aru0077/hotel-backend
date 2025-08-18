// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
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
  async registerWithUsernamePassword() {}

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
  async registerWithEmailCode() {}

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
  async registerWithPhoneCode() {}

  /**
   * Facebook注册
   */
  @Public()
  @Post('register/facebook')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Facebook注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: 'Facebook令牌无效' })
  @ApiResponse({ status: 409, description: 'Facebook账户已绑定其他用户' })
  async registerWithFacebook() {}

  /**
   * Google注册
   */
  @Public()
  @Post('register/google')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Google注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: 'Google令牌无效' })
  @ApiResponse({ status: 409, description: 'Google账户已绑定其他用户' })
  async registerWithGoogle() {}

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
  async loginWithPassword() {}

  /**
   * 邮箱验证码登录
   */
  @Public()
  @Post('login/email-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '邮箱验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  async loginWithEmailCode() {}

  /**
   * 手机验证码登录
   */
  @Public()
  @Post('login/phone-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  async loginWithPhoneCode() {}

  /**
   * Facebook登录
   */
  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook')
  @ApiResponse({ status: 200 })
  @ApiOperation({ summary: 'Facebook登录重定向' })
  async facebookLogin() {
    // 这个端点会重定向到Facebook进行认证
    // 实际的逻辑在FacebookStrategy中处理
  }

  /**
   * Facebook登录回调
   */
  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  @ApiResponse({ status: 200 })
  @ApiOperation({ summary: 'Facebook登录回调' })
  async facebookCallback() {}

  /**
   * Google登录
   */
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiResponse({ status: 200 })
  @ApiOperation({ summary: 'Google登录重定向' })
  async googleLogin() {
    // 这个端点会重定向到Google进行认证
    // 实际的逻辑在GoogleStrategy中处理
  }

  /**
   * Google登录回调
   */
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiResponse({ status: 200 })
  @ApiOperation({ summary: 'Google登录回调' })
  async googleCallback() {
    // GoogleStrategy已经验证了用户，用户信息在req.user中
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
  async sendVerificationCode() {}

  /**
   * 刷新令牌
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '刷新令牌无效' })
  async refreshToken() {}

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
  async logout() {}
}
