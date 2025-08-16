// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  RegisterDto,
  LoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
} from './dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  /**
   * 用户注册
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 409, description: '用户已存在' })
  async register(@Body() registerDto: RegisterDto) {
    // TODO: 实现注册逻辑
    switch (registerDto.type) {
      case 'username_password':
        // TODO: 用户名密码注册
        break;
      case 'email_code':
        // TODO: 邮箱验证码注册
        break;
      case 'phone_code':
        // TODO: 手机验证码注册
        break;
      case 'facebook':
        // TODO: Facebook注册
        break;
      case 'google':
        // TODO: Google注册
        break;
    }
    return { message: '注册成功' };
  }

  /**
   * 用户登录
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '认证失败' })
  async login(@Body() loginDto: LoginDto) {
    // TODO: 实现登录逻辑
    switch (loginDto.type) {
      case 'credentials':
        // TODO: 账号/邮箱/手机+密码登录
        break;
      case 'email_code':
        // TODO: 邮箱验证码登录
        break;
      case 'phone_code':
        // TODO: 手机验证码登录
        break;
      case 'facebook':
        // TODO: Facebook登录
        break;
      case 'google':
        // TODO: Google登录
        break;
    }
    return { message: '登录成功' };
  }

  /**
   * 发送验证码
   */
  @Public()
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    // TODO: 实现验证码发送逻辑
    // if (dto.type === 'email') {
    //   // TODO: 发送邮箱验证码
    // } else if (dto.type === 'phone') {
    //   // TODO: 发送短信验证码
    // }
    // return { message: '验证码已发送' };
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
  async refreshToken(@Body() dto: RefreshTokenDto) {
    // TODO: 实现令牌刷新逻辑
    // return { message: '令牌刷新成功' };
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
  async logout(@Request() req) {
    // TODO: 实现注销逻辑
    // const userId = req.user.sub;
    // return { message: '注销成功' };
  }

  /**
   * 获取当前用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getProfile(@Request() req) {
    // // TODO: 获取用户详细信息
    // return { user: req.user };
  }
}
