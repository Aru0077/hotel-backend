// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsPhoneNumber,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';

// 密码登录DTO
export class PasswordLoginDto {
  @ApiProperty({
    description: '用户标识符（用户名、邮箱或手机号）',
    example: 'john@example.com',
  })
  @IsNotEmpty({ message: '用户标识符不能为空' })
  @IsString()
  identifier: string;

  @ApiProperty({
    description: '密码',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}

// 邮箱验证码登录
export class EmailCodeLoginDto {
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
  })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  @MaxLength(6, { message: '验证码最多6位' })
  verificationCode: string;
}

// 手机验证码登录
export class PhoneCodeLoginDto {
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
  })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  @MaxLength(6, { message: '验证码最多6位' })
  verificationCode: string;
}
