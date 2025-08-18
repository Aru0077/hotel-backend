// src/auth/dto/register.dto.ts
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 基础注册DTO
export abstract class BaseRegisterDto {
  @ApiPropertyOptional({
    description: '默认用户角色',
    example: 'customer',
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  roleTypes?: string = 'customer';
}

// 用户名密码注册
export class UsernamePasswordRegisterDto extends BaseRegisterDto {
  @ApiProperty({
    description: '用户名',
    example: 'johndoe',
    minLength: 3,
    maxLength: 50,
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  username: string;

  @ApiProperty({
    description: '密码',
    minLength: 8,
    maxLength: 128,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(128, { message: '密码最多128个字符' })
  password: string;
}

// 邮箱验证码注册
export class EmailCodeRegisterDto extends BaseRegisterDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
    minLength: 4,
    maxLength: 6,
  })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  @MaxLength(6, { message: '验证码最多6位' })
  verificationCode: string;

  @ApiPropertyOptional({
    description: '设置密码（可选）',
    required: false,
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(128, { message: '密码最多128个字符' })
  password?: string;
}

// 手机验证码注册
export class PhoneCodeRegisterDto extends BaseRegisterDto {
  @ApiProperty({
    description: '手机号码',
    example: '+8613800138000',
  })
  @IsNotEmpty({ message: '手机号码不能为空' })
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
    minLength: 4,
    maxLength: 6,
  })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  @MaxLength(6, { message: '验证码最多6位' })
  verificationCode: string;

  @ApiPropertyOptional({
    description: '设置密码（可选）',
    required: false,
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(128, { message: '密码最多128个字符' })
  password?: string;
}

// Facebook注册
export class FacebookRegisterDto extends BaseRegisterDto {
  @ApiProperty({
    description: 'Facebook访问令牌',
  })
  @IsNotEmpty({ message: 'Facebook令牌不能为空' })
  @IsString()
  facebookToken: string;
}

// Google注册
export class GoogleRegisterDto extends BaseRegisterDto {
  @ApiProperty({
    description: 'Google访问令牌',
  })
  @IsNotEmpty({ message: 'Google令牌不能为空' })
  @IsString()
  googleToken: string;
}
