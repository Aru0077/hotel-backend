import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import { AuthTokenResponse } from '../types';

@ApiTags('客户认证')
@Controller('auth/customer')
export class CustomerAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiResponse({})
  @ApiOperation({ summary: '客户注册' })
  async register(@Body() dto: CustomerRegisterDto): Promise<AuthTokenResponse> {
    return this.authService.registerCustomer(dto);
  }
}
