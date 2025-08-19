// src/types/api.types.ts
import { ApiProperty } from '@nestjs/swagger';

// ============ API响应基础类型 ============
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============ Swagger装饰器用DTO类 ============
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true, description: '请求是否成功' })
  success: boolean;

  @ApiProperty({ example: 200, description: 'HTTP状态码' })
  statusCode: number;

  @ApiProperty({ example: '操作成功', description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: '响应时间戳',
  })
  timestamp: string;
}

export class PaginatedResponseDto<T = unknown> {
  @ApiProperty({ description: '数据列表', isArray: true })
  data: T[];

  @ApiProperty({ example: 100, description: '总记录数' })
  total: number;

  @ApiProperty({ example: 1, description: '当前页码' })
  page: number;

  @ApiProperty({ example: 10, description: '每页大小' })
  limit: number;

  @ApiProperty({ example: true, description: '是否有下一页' })
  hasNext: boolean;

  @ApiProperty({ example: false, description: '是否有上一页' })
  hasPrev: boolean;
}

// ============ 分页查询参数 ============
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============ 基础实体接口 ============
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}
