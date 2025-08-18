// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { AppConfigService } from '../config/config.service';
import {
  UsernamePasswordRegisterDto,
  EmailCodeRegisterDto,
  PhoneCodeRegisterDto,
  FacebookRegisterDto,
  GoogleRegisterDto,
  EmailCodeLoginDto,
  PhoneCodeLoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
} from './dto';
import {
  AuthTokenResponse,
  JwtPayload,
  SocialUserInfo,
  UserWithCredentials,
  VerificationCodeType,
} from '../types';
import { SmsService } from 'src/sms/sms.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name); // 添加logger定义

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly configService: AppConfigService,
    private readonly smsService: SmsService,
  ) {}

  // ============ 注册相关方法 ============

  /**
   * 用户名密码注册
   */
  async registerWithUsernamePassword(
    dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 1. 验证用户名是否已存在
    const existingUser = await this.checkUserExists(dto.username, 'username');
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }
    // 2. 对密码进行加密
    const hashedPassword = await this.hashPassword(dto.password);
    // 3. 创建用户记录
    const user = await this.prisma.$transaction(async (tx) => {
      // 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 4. 创建认证凭证记录
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          username: dto.username,
          hashedPassword,
          isUsernameVerified: true,
        },
      });

      // 5. 创建用户角色记录
      const roleType = dto.roleTypes ?? 'customer';
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType,
          status: 'ACTIVE',
        },
      });

      // 返回包含关联数据的用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
          },
        },
      });
    });

    if (!user) {
      throw new Error('用户创建失败');
    }
    // 6. 生成JWT令牌
    const tokens = await this.generateTokens(user);
    // 7. 返回认证响应
    return this.formatAuthResponse(tokens, user);
  }

  /**
   * 邮箱验证码注册
   */
  async registerWithEmailCode(
    dto: EmailCodeRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 1. 验证邮箱验证码
    const isCodeValid = await this.verifyCode(
      dto.email,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }
    // 2. 验证邮箱是否已存在
    const existingUser = await this.checkUserExists(dto.email, 'email');
    if (existingUser) {
      throw new ConflictException('邮箱已存在');
    }
    // 3. 对密码进行加密（如果提供）
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await this.hashPassword(dto.password);
    }
    // 4. 创建用户记录
    const user = await this.prisma.$transaction(async (tx) => {
      // 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 5. 创建认证凭证记录，标记邮箱已验证
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          email: dto.email,
          hashedPassword,
          isEmailVerified: true,
          lastUsedEmail: new Date(),
        },
      });

      // 6. 创建用户角色记录
      const roleType = dto.roleTypes ?? 'customer';
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType,
          status: 'ACTIVE',
        },
      });

      // 返回包含关联数据的用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
          },
        },
      });
    });

    if (!user) {
      throw new Error('用户创建失败');
    }
    // 7. 生成JWT令牌
    const token = await this.generateTokens(user);
    // 8. 清除验证码缓存
    await this.redis.del(this.buildVerificationKey(dto.email, 'register'));
    // 9. 返回认证响应
    return this.formatAuthResponse(token, user);
  }

  /**
   * 手机验证码注册
   */
  async registerWithPhoneCode(
    dto: PhoneCodeRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 1. 验证手机验证码
    const isCodeValid = await this.verifyCode(
      dto.phone,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 2. 验证手机号是否已存在
    const existingUser = await this.checkUserExists(dto.phone, 'phone');
    if (existingUser) {
      throw new ConflictException('手机号已存在');
    }
    // 3. 对密码进行加密（如果提供）
    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await this.hashPassword(dto.password);
    }

    // 4. 创建用户记录
    const user = await this.prisma.$transaction(async (tx) => {
      // 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 5. 创建认证凭证记录，标记手机号已验证
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          phone: dto.phone,
          hashedPassword,
          isPhoneVerified: true,
          lastUsedPhone: new Date(),
        },
      });

      // 6. 创建用户角色记录
      const roleType = dto.roleTypes ?? 'customer';
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType,
          status: 'ACTIVE',
        },
      });

      // 返回包含关联数据的用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
          },
        },
      });
    });

    if (!user) {
      throw new Error('用户创建失败');
    }

    // 7. 生成JWT令牌
    const token = await this.generateTokens(user);

    // 8. 清除验证码缓存
    await this.redis.del(this.buildVerificationKey(dto.phone, 'register'));

    // 9. 返回认证响应
    return this.formatAuthResponse(token, user);
  }

  /**
   * Facebook注册
   */
  async registerWithFacebook(
    dto: FacebookRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 1. 验证Facebook令牌
    // 2. 获取Facebook用户信息
    // 3. 验证Facebook ID是否已存在
    // 4. 创建用户记录
    // 5. 创建认证凭证记录，标记Facebook已验证
    // 6. 创建用户角色记录
    // 7. 生成JWT令牌
    // 8. 返回认证响应
    throw new Error('方法未实现');
  }

  /**
   * Google注册
   */
  async registerWithGoogle(dto: GoogleRegisterDto): Promise<AuthTokenResponse> {
    // 1. 验证Google令牌
    // 2. 获取Google用户信息
    // 3. 验证Google ID是否已存在
    // 4. 创建用户记录
    // 5. 创建认证凭证记录，标记Google已验证
    // 6. 创建用户角色记录
    // 7. 生成JWT令牌
    // 8. 返回认证响应
    throw new Error('方法未实现');
  }

  // ============ 登录相关方法 ============

  /**
   * 验证用户凭证（用于LocalStrategy）
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    // 1. 根据标识符（用户名/邮箱/手机号）查找用户
    const user = await this.prisma.user.findFirst({
      where: {
        credentials: {
          OR: [
            { username: identifier },
            { email: identifier },
            { phone: identifier },
          ],
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    // 2. 验证密码是否正确
    const isPasswordValid = await this.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    if (!isPasswordValid) {
      return null;
    }

    // 3. 检查用户状态是否正常
    const hasActiveRoles = user.roles.length > 0;
    if (!hasActiveRoles) {
      return null;
    }

    // 4. 更新最后登录时间和使用时间
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const updateData: Record<string, Date> = {};
      if (user.credentials?.username === identifier) {
        updateData.lastUsedUsername = new Date();
      } else if (user.credentials?.email === identifier) {
        updateData.lastUsedEmail = new Date();
      } else if (user.credentials?.phone === identifier) {
        updateData.lastUsedPhone = new Date();
      }

      if (Object.keys(updateData).length > 0) {
        await tx.authCredential.update({
          where: { userId: user.id },
          data: updateData,
        });
      }
    });

    // 5. 返回用户信息或null
    return user;
  }

  /**
   * 邮箱验证码登录
   */
  async loginWithEmailCode(dto: EmailCodeLoginDto): Promise<AuthTokenResponse> {
    // 1. 验证邮箱验证码
    const isCodeValid = await this.verifyCode(
      dto.email,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 2. 查找对应的用户
    const user = await this.prisma.user.findFirst({
      where: {
        credentials: {
          email: dto.email,
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 3. 检查用户状态
    const hasActiveRoles = user.roles.length > 0;
    if (!hasActiveRoles) {
      throw new UnauthorizedException('用户账户状态异常');
    }

    // 4. 更新最后登录时间和邮箱使用时间
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await tx.authCredential.update({
        where: { userId: user.id },
        data: { lastUsedEmail: new Date() },
      });
    });

    // 5. 生成JWT令牌
    const token = await this.generateTokens(user);

    // 6. 清除验证码缓存
    await this.redis.del(this.buildVerificationKey(dto.email, 'login'));

    // 7. 返回认证响应
    return this.formatAuthResponse(token, user);
  }

  /**
   * 手机验证码登录
   */
  async loginWithPhoneCode(dto: PhoneCodeLoginDto): Promise<AuthTokenResponse> {
    // 1. 验证手机验证码
    const isCodeValid = await this.verifyCode(
      dto.phone,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    // 2. 查找对应的用户
    const user = await this.prisma.user.findFirst({
      where: {
        credentials: {
          phone: dto.phone,
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    // 3. 检查用户状态
    const hasActiveRoles = user.roles.length > 0;
    if (!hasActiveRoles) {
      throw new UnauthorizedException('用户账户状态异常');
    }
    // 4. 更新最后登录时间和手机使用时间
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await tx.authCredential.update({
        where: { userId: user.id },
        data: { lastUsedPhone: new Date() },
      });
    });
    // 5. 生成JWT令牌
    const token = await this.generateTokens(user);
    // 6. 清除验证码缓存
    await this.redis.del(this.buildVerificationKey(dto.phone, 'login'));
    // 7. 返回认证响应
    return this.formatAuthResponse(token, user);
  }

  /**
   * 验证或创建社交媒体用户（用于FacebookStrategy和GoogleStrategy）
   */
  async validateOrCreateSocialUser(
    provider: 'facebook' | 'google',
    userInfo: SocialUserInfo,
  ): Promise<UserWithCredentials> {}

  // ============ 验证码相关方法 ============

  /**
   * 发送验证码 - 重构后的方法
   */
  async sendVerificationCode(dto: SendVerificationCodeDto): Promise<void> {
    let identifier: string;

    // 1. 根据类型验证邮箱或手机号格式并获取标识符
    if (dto.type === VerificationCodeType.EMAIL) {
      if (!dto.email) {
        throw new BadRequestException('邮箱地址不能为空');
      }
      identifier = dto.email;
      this.validateEmailFormat(identifier);
    } else if (dto.type === VerificationCodeType.PHONE) {
      if (!dto.phone) {
        throw new BadRequestException('手机号码不能为空');
      }
      identifier = dto.phone;
      this.validatePhoneFormat(identifier);
    } else {
      throw new BadRequestException('不支持的验证码类型');
    }

    // 2. 检查发送频率限制
    const rateLimitKey = `rate_limit:${dto.type}:${identifier}`;
    const lastSentTime = await this.redis.get(rateLimitKey);

    if (lastSentTime) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }

    // 3. 生成验证码
    const code = this.generateVerificationCode();

    // 4. 存储到Redis缓存
    const cacheKey = this.buildVerificationKey(identifier, dto.purpose);
    await this.redis.set(cacheKey, code, 300); // 5分钟有效期

    // 设置发送频率限制（60秒内不能重复发送）
    await this.redis.set(rateLimitKey, Date.now().toString(), 60);

    // 5. 发送验证码（邮件或短信）
    try {
      if (dto.type === VerificationCodeType.PHONE) {
        // 发送短信验证码
        const smsResult = await this.smsService.sendVerificationCodeSms({
          phoneNumber: identifier,
          code,
          purpose: dto.purpose,
        });

        if (!smsResult.success) {
          throw new Error(`短信发送失败: ${smsResult.message}`);
        }

        this.logger.log(
          `短信验证码发送成功: ${this.maskIdentifier(identifier, 'phone')}, 用途: ${dto.purpose}`,
        );
      } else {
        // 发送邮件验证码
        // TODO: 实现邮件发送功能
        // await this.emailService.sendVerificationCode(identifier, code, dto.purpose);

        this.logger.log(
          `邮件验证码发送成功: ${this.maskIdentifier(identifier, 'email')}, 用途: ${dto.purpose}`,
        );

        // 临时处理：开发环境下在日志中显示验证码
        if (this.configService.isDevelopment) {
          this.logger.debug(`开发环境验证码: ${code}`);
        }
      }
    } catch (error) {
      // 发送失败时清除缓存
      await this.redis.del(cacheKey);
      await this.redis.del(rateLimitKey);

      this.logger.error(
        `验证码发送失败: ${identifier}`,
        error instanceof Error ? error.stack : error,
      );

      throw new BadRequestException('验证码发送失败，请稍后重试');
    }

    // 6. 记录发送日志
    this.logger.log(
      `验证码发送请求完成: ${dto.type} - ${this.maskIdentifier(identifier, dto.type.toLowerCase())}, 用途: ${dto.purpose}`,
    );
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    identifier: string,
    code: string,
    purpose: string,
  ): Promise<boolean> {
    // 1. 从Redis获取存储的验证码
    const cacheKey = this.buildVerificationKey(identifier, purpose);
    const storedCode = await this.redis.get(cacheKey);

    if (!storedCode) {
      return false;
    }
    // 2. 比较验证码是否匹配
    const isMatch = storedCode === code;

    if (!isMatch) {
      return false;
    }

    // 验证成功后不立即删除缓存，等到实际使用时再删除
    // 这样可以避免验证成功后用户没有继续操作导致需要重新获取验证码
    return true;
  }

  // ============ 令牌相关方法 ============

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(user: UserWithCredentials): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }> {
    // 1. 构建JWT载荷
    const payload = this.buildJwtPayload(user);
    // 2. 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwt.secret,
      expiresIn: this.configService.jwt.expiresIn,
    });
    // 3. 生成刷新令牌
    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.jwt.refreshSecret,
      expiresIn: this.configService.jwt.refreshExpiresIn,
    });
    // 4. 将刷新令牌存储到Redis
    const refreshTokenKey = `refresh_token:${user.id}:${Date.now()}`;
    const refreshTokenTtl = this.parseExpirationTime(
      this.configService.jwt.refreshExpiresIn,
    );
    await this.redis.set(refreshTokenKey, refreshToken, refreshTokenTtl);

    // 5. 返回令牌信息
    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.jwt.expiresIn,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    try {
      // 1. 验证刷新令牌格式
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.jwt.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌类型');
      }
      // 2. 从Redis验证刷新令牌有效性
      const userId = payload.sub;
      const refreshTokenPattern = `refresh_token:${userId}:*`;
      // 3. 解析令牌获取用户信息
      // 这里简化处理，实际可以使用Redis的SCAN命令遍历匹配的键
      // 由于Redis服务没有提供pattern匹配方法，我们使用用户ID作为键
      const userRefreshTokenKey = `refresh_token:${userId}:current`;
      const storedToken = await this.redis.get(userRefreshTokenKey);

      if (!storedToken || storedToken !== dto.refreshToken) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }
      // 4. 查找用户确认仍然有效
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
          },
        },
      });
      if (!user || user.roles.length === 0) {
        throw new UnauthorizedException('用户不存在或状态异常');
      }
      // 5. 生成新的访问令牌和刷新令牌
      const token = await this.generateTokens(user);
      // 6. 更新Redis中的刷新令牌
      await this.redis.set(
        userRefreshTokenKey,
        token.refreshToken,
        this.parseExpirationTime(this.configService.jwt.refreshExpiresIn),
      );
      // 7. 返回新的认证响应
      return this.formatAuthResponse(token, user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 用户注销
   */
  async logout(userId: number, refreshToken?: string): Promise<void> {
    // 1. 删除Redis中的刷新令牌
    if (refreshToken) {
      const userRefreshTokenKey = `refresh_token:${userId}:current`;
      await this.redis.del(userRefreshTokenKey);
    }
    // 2. 将访问令牌加入黑名单（如果需要）
    // 3. 记录注销日志
  }

  // ============ 第三方认证相关方法 ============

  /**
   * 验证Facebook令牌
   */
  async validateFacebookToken(token: string): Promise<SocialUserInfo> {
    // 1. 调用Facebook Graph API验证令牌
    // 2. 获取用户基本信息
    // 3. 格式化返回用户信息
    throw new Error('方法未实现');
  }

  /**
   * 验证Google令牌
   */
  async validateGoogleToken(token: string): Promise<SocialUserInfo> {
    // 1. 调用Google API验证令牌
    // 2. 获取用户基本信息
    // 3. 格式化返回用户信息
    throw new Error('方法未实现');
  }

  // ============ 辅助方法 ============

  /**
   * 加密密码
   */
  async hashPassword(password: string): Promise<string> {
    // 1. 使用bcrypt加密密码
    // 2. 使用配置中的盐值轮数
    return bcrypt.hash(password, this.configService.security.bcryptSaltRounds);
  }

  /**
   * 验证密码
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    // 1. 使用bcrypt比较密码
    return bcrypt.compare(password, hash);
  }

  /**
   * 构建JWT载荷
   */
  private buildJwtPayload(user: UserWithCredentials): JwtPayload {
    return {
      sub: user.id,
      username: user.credentials?.username ?? undefined,
      email: user.credentials?.email ?? undefined,
      phone: user.credentials?.phone ?? undefined,
      roles: user.roles.roleType,
      iat: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 格式化认证响应
   */
  private formatAuthResponse(
    tokens: { accessToken: string; refreshToken: string; expiresIn: string },
    user: UserWithCredentials,
  ): AuthTokenResponse {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: 'Bearer',
      user,
    };
  }

  /**
   * 检查用户是否存在（根据不同标识符）
   */
  private async checkUserExists(
    identifier: string,
    type: 'username' | 'email' | 'phone' | 'facebook' | 'google',
  ): Promise<boolean> {
    // 1. 根据类型构建查询条件
    const whereCondition: Record<string, string> = {};
    switch (type) {
      case 'username':
        whereCondition.username = identifier;
        break;
      case 'email':
        whereCondition.email = identifier;
        break;
      case 'phone':
        whereCondition.phone = identifier;
        break;
      case 'facebook':
        whereCondition.facebookId = identifier;
        break;
      case 'google':
        whereCondition.googleId = identifier;
        break;
    }
    // 2. 查询数据库
    const credential = await this.prisma.authCredential.findFirst({
      where: whereCondition,
    });
    // 3. 返回是否存在
    return Boolean(credential);
  }

  /**
   * 生成随机验证码
   */
  private generateVerificationCode(length = 6): string {
    // 1. 生成指定长度的数字验证码
    // 2. 返回验证码字符串
    return Math.random()
      .toString()
      .slice(2, 2 + length);
  }

  /**
   * 构建验证码缓存键
   */
  private buildVerificationKey(identifier: string, purpose: string): string {
    // 1. 构建Redis缓存键
    // 2. 格式：verification:{purpose}:{identifier}
    return `verification:${purpose}:${identifier}`;
  }

  /**
   * 解析过期时间字符串为秒数
   */
  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return value; // 默认为秒
    }
  }

  /**
   * 验证邮箱格式
   */
  private validateEmailFormat(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  /**
   * 验证手机号格式
   */
  private validatePhoneFormat(phone: string): void {
    // 支持国内手机号和国际手机号格式
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  /**
   * 标识符脱敏处理
   */
  private maskIdentifier(identifier: string, type: string): string {
    if (type === 'email' || type === VerificationCodeType.EMAIL.toLowerCase()) {
      // 邮箱脱敏: john@example.com -> j***@example.com
      return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
    } else if (
      type === 'phone' ||
      type === VerificationCodeType.PHONE.toLowerCase()
    ) {
      // 手机号脱敏处理
      if (identifier.startsWith('+86')) {
        // +8613812345678 -> +86138****5678
        return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
      } else if (identifier.startsWith('+')) {
        // 其他国际号码 -> +1234****7890
        return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
      } else {
        // 国内号码 13812345678 -> 138****5678
        return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
    }
    return identifier;
  }
}
