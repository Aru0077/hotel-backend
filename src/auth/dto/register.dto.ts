// src/auth/dto/register.dto.ts
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RegisterType {
  USERNAME_PASSWORD = 'username_password',
  EMAIL_CODE = 'email_code',
  PHONE_CODE = 'phone_code',
  FACEBOOK = 'facebook',
  GOOGLE = 'google',
}

export class RegisterDto {
  @ApiProperty({ description: '注册类型', enum: RegisterType })
  @IsEnum(RegisterType)
  type: RegisterType;

  @ApiPropertyOptional({ description: '用户名' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

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
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(6)
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
