// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * 用户模块
 * 负责用户相关的业务逻辑，包括用户的创建、查询、更新等操作
 * 以及认证凭据的管理
 */
@Module({
  providers: [UsersService],
  exports: [UsersService], // 导出服务供其他模块使用
})
export class UsersModule {}
