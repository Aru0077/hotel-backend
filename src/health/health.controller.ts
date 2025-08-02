// src/health/health.controller.ts
import { Controller } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  // @Get()
  // async checkOverallHealth() {
  //   const dbHealthy = await this.prisma.healthCheck();

  //   return {
  //     status: dbHealthy ? 'healthy' : 'unhealthy',
  //     timestamp: new Date().toISOString(),
  //     services: {
  //       database: dbHealthy ? 'operational' : 'failed',
  //     },
  //   };
  // }

  // @Get('database')
  // async checkDatabaseHealth() {
  //   const connectionInfo = await this.prisma.getConnectionInfo();

  //   if (!connectionInfo.isConnected) {
  //     return {
  //       status: 'unhealthy',
  //       message: 'Database connection unavailable',
  //       timestamp: new Date().toISOString(),
  //       details: connectionInfo,
  //     };
  //   }

  //   return {
  //     status: 'healthy',
  //     message: 'Database connection operational',
  //     timestamp: new Date().toISOString(),
  //     details: {
  //       database: connectionInfo.databaseName,
  //       serverVersion: connectionInfo.serverVersion?.split(' ')[0], // 简化版本信息显示
  //     },
  //   };
  // }
}
