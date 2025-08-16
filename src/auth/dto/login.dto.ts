// src/auth/dto/login.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export enum LoginType {
  CREDENTIALS = 'credentials',
  EMAIL_CODE = 'email_code',
  PHONE_CODE = 'phone_code',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
}

export class LoginDto {
  @ApiProperty({ description: '登录类型', enum: LoginType })
  @IsEnum(LoginType)
  type: LoginType;

  @ApiPropertyOptional({ description: '登录标识符（用户名/邮箱/手机号）' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ description: '邮箱地址' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号码' })
  @IsOptional()
  @IsPhoneNumber('CN')
  phone?: string;

  @ApiPropertyOptional({ description: '密码' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsOptional()
  @IsString()
  verificationCode?: string;

  @ApiPropertyOptional({ description: 'Facebook访问令牌' })
  @IsOptional()
  @IsString()
  facebookToken?: string;

  @ApiPropertyOptional({ description: 'Google访问令牌' })
  @IsOptional()
  @IsString()
  googleToken?: string;
}
