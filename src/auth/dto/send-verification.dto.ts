// src/auth/dto/send-verification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator';

export class SendVerificationCodeDto {
  @ApiProperty({ description: '发送类型', enum: ['email', 'phone'] })
  @IsEnum(['email', 'phone'])
  type: 'email' | 'phone';

  @ApiPropertyOptional({ description: '邮箱地址' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号码' })
  @IsOptional()
  @IsPhoneNumber('CN')
  phone?: string;

  @ApiProperty({
    description: '验证码用途',
    enum: ['register', 'login', 'reset_password'],
  })
  @IsEnum(['register', 'login', 'reset_password'])
  purpose: 'register' | 'login' | 'reset_password';
}
