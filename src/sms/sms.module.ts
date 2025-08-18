// ===================================
// 6. 创建短信模块
// ===================================
// src/sms/sms.module.ts
import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
