// src/types/api.types.ts
import { ApiProperty } from '@nestjs/swagger';

// ============ API响应基础类型 ============
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ Swagger装饰器用DTO类 ============
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: 200, description: '响应状态码' })
  code: number;

  @ApiProperty({ example: '操作成功', description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;
}

export class PaginationResponseDto<T = unknown> {
  @ApiProperty({ description: '数据列表', isArray: true })
  list: T[];

  @ApiProperty({ example: 100, description: '总记录数' })
  total: number;

  @ApiProperty({ example: 1, description: '当前页码' })
  page: number;

  @ApiProperty({ example: 10, description: '每页大小' })
  pageSize: number;

  @ApiProperty({ example: 10, description: '总页数' })
  totalPages: number;
}

// ============ 分页查询参数 ============
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============ 基础实体接口 ============
export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}
