// ===============================
// src/types/common.types.ts

import { ApiProperty } from '@nestjs/swagger';

// ===============================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// API响应接口（用于装饰器）
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

// 用于 Swagger 的 DTO 类
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: '操作成功' })
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

export class PaginatedResponseDto<T = unknown> {
  @ApiProperty({ type: [Object], isArray: true })
  data: T[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
