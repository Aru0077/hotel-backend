import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// auth/auth.controller.ts - 主认证控制器
@ApiTags('通用认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 通用登录（根据角色路由）
  @Public()
  @Post('login')
  @ApiResponse({})
  async login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  // 验证码登录
  @Public()
  @Post('login/code')
  @ApiResponse({})
  async loginWithCode(@Body() dto: CodeLoginDto): Promise<AuthTokenResponse> {
    return this.authService.loginWithCode(dto);
  }

  // 刷新令牌
  @Public()
  @Post('refresh')
  @ApiResponse({})
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  // 注销
  @Post('logout')
  @ApiResponse({})
  @ApiOperation({ summary: '用户注销' })
  async logout(
    @GetCurrentUser() user: CurrentUser,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(user);
  }
}
