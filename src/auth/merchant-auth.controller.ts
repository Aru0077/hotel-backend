import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('商家认证')
@Controller('auth/merchant')
export class MerchantAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '商家注册' })
  @ApiResponse({})
  async register(@Body() dto: MerchantRegisterDto): Promise<AuthTokenResponse> {
    return this.authService.registerMerchant(dto);
  }
}
