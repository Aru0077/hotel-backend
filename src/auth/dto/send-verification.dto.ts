// src/auth/dto/send-verification.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator';
import { VerificationCodeType, VerificationCodePurpose } from '../../types';

export class SendVerificationCodeDto {
  @ApiProperty({
    description: '验证码发送类型',
    enum: VerificationCodeType,
    enumName: 'VerificationCodeType',
    example: VerificationCodeType.EMAIL,
  })
  @IsEnum(VerificationCodeType)
  type: VerificationCodeType;

  @ApiPropertyOptional({
    description: '邮箱地址（当type为EMAIL时必填）',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码（当type为PHONE时必填）',
    example: '+8613800138000',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiProperty({
    description: '验证码用途',
    enum: VerificationCodePurpose,
    enumName: 'VerificationCodePurpose',
    example: VerificationCodePurpose.REGISTER,
  })
  @IsEnum(VerificationCodePurpose)
  purpose: VerificationCodePurpose;
}
