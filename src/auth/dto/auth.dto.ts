// src/auth/dto/auth.dto.ts - 简化的DTO设计
import { IsString, IsEnum, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

// 统一注册DTO
export class AuthDto {
  @ApiProperty({
    description: '用户凭证（用户名/邮箱/手机号）',
    example: 'john@example.com',
  })
  @IsString()
  @MinLength(3)
  identifier: string;

  @ApiPropertyOptional({
    description: '密码（与验证码二选一）',
    minLength: 8,
  })
  @ValidateIf((o: AuthDto) => !o.verificationCode)
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: '验证码（与密码二选一）',
    example: '123456',
  })
  @ValidateIf((o: AuthDto) => !o.password)
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

// 发送验证码DTO
export class SendCodeDto {
  @ApiProperty({
    description: '用户凭证（邮箱/手机号）',
    example: 'john@example.com',
  })
  @IsString()
  identifier: string;
}

// 登录DTO（用于指定角色登录）
export class LoginDto {
  @ApiProperty({
    description: '用户凭证（用户名/邮箱/手机号）',
    example: 'john@example.com',
  })
  @IsString()
  @MinLength(3)
  identifier: string;

  @ApiPropertyOptional({
    description: '密码（与验证码二选一）',
    minLength: 8,
  })
  @ValidateIf((o: LoginDto) => !o.verificationCode)
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: '验证码（与密码二选一）',
    example: '123456',
  })
  @ValidateIf((o: LoginDto) => !o.password)
  @IsString()
  verificationCode?: string;

  @ApiProperty({
    description: '要登录的角色类型',
    enum: RoleType,
    example: RoleType.CUSTOMER,
  })
  @IsEnum(RoleType)
  roleType: RoleType;
}

// 刷新令牌DTO
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsString()
  refreshToken: string;
}
