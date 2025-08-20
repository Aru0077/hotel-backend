// auth/admin-auth.controller.ts - 管理员专用认证
import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('管理员认证')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '管理员注册' })
  @ApiResponse({})
  async register(@Body() dto: AdminRegisterDto): Promise<AuthTokenResponse> {
    return this.authService.registerAdmin(dto);
  }
}
