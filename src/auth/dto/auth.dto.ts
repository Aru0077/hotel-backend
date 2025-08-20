// src/auth/dto/auth.dto.ts - 简化的DTO设计
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { VerificationCodePurpose } from '../../types';

// 统一注册DTO - 根据字段自动识别认证方式
export class RegisterDto {
  @ApiPropertyOptional({
    description: '用户名（3-50字符）',
    example: 'johndoe',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiPropertyOptional({ description: '邮箱地址', example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号码', example: '+8613800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '密码（8位以上）', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: '验证码（当使用邮箱或手机注册时）',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  verificationCode?: string;

  @ApiProperty({
    description: '角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsEnum(RoleType)
  roleType: RoleType;
}

// 统一登录DTO - 根据字段自动识别认证方式
export class LoginDto {
  @ApiPropertyOptional({ description: '用户标识符（用户名/邮箱/手机号）' })
  @ValidateIf((o) => !o.verificationCode)
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ description: '密码' })
  @ValidateIf((o) => !o.verificationCode)
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '邮箱地址（验证码登录时）' })
  @ValidateIf((o) => o.verificationCode && !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号码（验证码登录时）' })
  @ValidateIf((o) => o.verificationCode && !o.email)
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsOptional()
  @IsString()
  verificationCode?: string;

  @ApiPropertyOptional({
    description: '偏好角色（多角色用户使用）',
    enum: RoleType,
  })
  @IsOptional()
  @IsEnum(RoleType)
  preferredRole?: RoleType;
}

export class SendCodeDto {
  @ApiPropertyOptional({ description: '邮箱地址' })
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号码' })
  @ValidateIf((o) => !o.email)
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '验证码用途',
    enum: VerificationCodePurpose,
    enumName: 'VerificationCodePurpose',
  })
  @IsEnum(VerificationCodePurpose)
  purpose: VerificationCodePurpose;

  @ApiPropertyOptional({
    description: '角色类型（注册时需要）',
    enum: RoleType,
  })
  @IsOptional()
  @IsEnum(RoleType)
  roleType?: RoleType;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  refreshToken: string;
}
