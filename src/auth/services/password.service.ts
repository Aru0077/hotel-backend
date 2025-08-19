// src/auth/services/password.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class PasswordService {
  constructor(private readonly configService: AppConfigService) {}

  /**
   * 加密密码
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.configService.security.bcryptSaltRounds);
  }

  /**
   * 验证密码
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
