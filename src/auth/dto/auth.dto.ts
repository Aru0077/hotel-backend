// src/auth/dto/auth.dto.ts
import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { VerificationCodePurpose } from '../../types';

// ============ 注册相关DTO ============
export class UsernamePasswordRegisterDto {
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

  @ApiProperty({
    description: '用户角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

export class EmailRegisterDto {
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
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(128, { message: '密码最多128个字符' })
  password?: string;

  @ApiProperty({
    description: '用户角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

export class PhoneRegisterDto {
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
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: '密码至少8个字符' })
  @MaxLength(128, { message: '密码最多128个字符' })
  password?: string;

  @ApiProperty({
    description: '用户角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

// ============ 登录相关DTO ============
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

  @ApiProperty({
    description: '前端角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

export class EmailLoginDto {
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

  @ApiProperty({
    description: '前端角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

export class PhoneLoginDto {
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

  @ApiProperty({
    description: '前端角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsNotEmpty({ message: '角色类型不能为空' })
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType: RoleType;
}

// ============ 验证码相关DTO ============
export class SendVerificationCodeDto {
  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @ValidateIf((o: { phone?: string }) => !o.phone)
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '+8613800138000',
  })
  @ValidateIf((o: { email?: string }) => !o.email)
  @IsPhoneNumber('CN', { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiProperty({
    description: '验证码用途',
    enum: VerificationCodePurpose,
    enumName: 'VerificationCodePurpose',
    example: VerificationCodePurpose.REGISTER,
  })
  @IsEnum(VerificationCodePurpose, { message: '无效的验证码用途' })
  purpose: VerificationCodePurpose;

  @ApiPropertyOptional({
    description: '用户角色类型（用于注册时）',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(RoleType, { message: '无效的角色类型' })
  roleType?: RoleType;
}

// ============ 令牌相关DTO ============
export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @IsString()
  refreshToken: string;
}
