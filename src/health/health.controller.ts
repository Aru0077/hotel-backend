// src/health/health.controller.ts
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async checkHealth(@Res() res: Response) {
    const health = await this.healthService.getOverallHealth();

    // 根据健康状态返回适当的HTTP状态码
    let httpStatus = HttpStatus.OK;
    if (health.status === 'unhealthy') {
      httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
    } else if (health.status === 'degraded') {
      httpStatus = HttpStatus.OK; // 降级但仍可用
    }

    return res.status(httpStatus).json(health);
  }

  @Get('database')
  async checkDatabaseHealth() {
    return this.healthService.checkDatabaseHealth();
  }

  @Get('redis')
  async checkRedisHealth() {
    return this.healthService.checkRedisHealth();
  }

  @Get('memory')
  async checkMemoryHealth() {
    return this.healthService.checkMemoryHealth();
  }

  @Get('liveness')
  liveness() {
    // Kubernetes liveness probe - 简单检查应用是否存活
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async readiness(@Res() res: Response) {
    // Kubernetes readiness probe - 检查应用是否准备好接收流量
    const dbHealth = await this.healthService.checkDatabaseHealth();

    if (dbHealth.status === 'unhealthy') {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        reason: 'Database connection unavailable',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HttpStatus.OK).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }
}
