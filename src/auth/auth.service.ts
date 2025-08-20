// src/auth/auth.service.ts - 完整的认证服务
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AuthDto, SendCodeDto } from './dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  CurrentUser,
  UserWithRoles,
  CredentialType,
} from '../types';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { VerificationCodeService } from './services/verification-code.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  /**
   * 统一注册方法
   */
  async register(dto: AuthDto): Promise<AuthTokenResponse> {
    const identifierType = this.detectIdentifierType(dto.identifier);

    // 检查用户是否已存在
    if (await this.checkUserExists(dto.identifier, identifierType)) {
      throw new ConflictException('用户已存在');
    }

    // 验证码注册
    if (dto.verificationCode) {
      const isValid = await this.verificationCodeService.verifyCode(
        dto.identifier,
        dto.verificationCode,
      );
      if (!isValid) {
        throw new BadRequestException('验证码错误或已过期');
      }
    }

    // 密码强度验证
    if (dto.password) {
      const validation = this.passwordService.validatePasswordStrength(
        dto.password,
      );
      if (!validation.isValid) {
        throw new BadRequestException(
          `密码强度不足: ${validation.errors.join(', ')}`,
        );
      }
    }

    // 构建用户数据
    const userData: CreateUserData = {
      roleType: dto.roleType,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      ...this.buildCredentialsByType(
        dto.identifier,
        identifierType,
        !!dto.verificationCode,
      ),
    };

    // 创建用户
    const user = await this.createUser(userData);

    // 清除验证码
    if (dto.verificationCode) {
      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    }

    this.logger.log(
      `用户注册成功: ${this.maskIdentifier(dto.identifier, identifierType)}, 角色: ${dto.roleType}`,
    );

    return this.generateTokens(user);
  }

  /**
   * 统一登录方法
   */
  async login(dto: AuthDto): Promise<AuthTokenResponse> {
    let user: UserWithRoles | null = null;

    if (dto.verificationCode) {
      // 验证码登录
      const isValid = await this.verificationCodeService.verifyCode(
        dto.identifier,
        dto.verificationCode,
      );
      if (!isValid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }

      user = await this.findUserByIdentifier(dto.identifier);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    } else {
      // 密码登录
      if (!dto.password) {
        throw new BadRequestException('密码登录需要提供密码');
      }

      user = await this.findUserByIdentifier(dto.identifier);
      if (!user?.credentials?.hashedPassword) {
        throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
      }

      const isValid = await this.passwordService.comparePassword(
        dto.password,
        user.credentials.hashedPassword,
      );
      if (!isValid) {
        throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
      }
    }

    // 更新登录时间
    await this.updateLastLoginTime(user.id);

    this.logger.log(
      `用户登录成功: userId=${user.id}, 角色数量=${user.roles.length}`,
    );

    return this.generateTokens(user);
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(dto: SendCodeDto): Promise<void> {
    return this.verificationCodeService.sendVerificationCode(dto);
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.findUserById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      const dto = { refreshToken };
      return await this.tokenService.refreshToken(dto, user);
    } catch (error) {
      this.logger.warn(
        `刷新令牌失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  /**
   * 用户注销
   */
  async logout(user: CurrentUser): Promise<{ success: boolean }> {
    try {
      await this.tokenService.logout(user.userId);
      this.logger.log(`用户注销成功: userId=${user.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`用户注销失败: userId=${user.userId}`, error);
      throw error;
    }
  }

  /**
   * 验证用户凭证（供策略使用）
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithRoles | null> {
    const user = await this.findUserByIdentifier(identifier);
    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    const isValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );

    return isValid ? user : null;
  }

  // ============ 用户数据操作方法 ============

  /**
   * 检查用户是否存在
   */
  async checkUserExists(
    identifier: string,
    type: CredentialType,
  ): Promise<boolean> {
    const whereCondition = this.buildWhereCondition(identifier, type);
    const credential = await this.prisma.authCredential.findFirst({
      where: whereCondition,
    });
    return Boolean(credential);
  }

  /**
   * 创建用户
   */
  async createUser(data: CreateUserData): Promise<UserWithRoles> {
    this.validateCreateUserData(data);

    const user = await this.prisma.$transaction(async (tx) => {
      // 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 创建认证凭证记录
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          username: data.username,
          email: data.email,
          phone: data.phone,
          facebookId: data.facebookId,
          googleId: data.googleId,
          hashedPassword: data.hashedPassword,
          isEmailVerified: data.isEmailVerified ?? false,
          isPhoneVerified: data.isPhoneVerified ?? false,
          isFacebookVerified: data.isFacebookVerified ?? false,
          isGoogleVerified: data.isGoogleVerified ?? false,
        },
      });

      // 创建用户角色记录
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType: data.roleType,
          status: data.roleStatus ?? 'ACTIVE',
          expiresAt: data.roleExpiresAt,
        },
      });

      // 返回完整用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
            include: {
              merchant: true,
              customer: true,
              admin: true,
            },
          },
        },
      });
    });

    if (!user) {
      throw new Error('用户创建失败');
    }

    return user;
  }

  /**
   * 根据标识符查找用户
   */
  async findUserByIdentifier(
    identifier: string,
  ): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
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
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
        },
      },
    });
  }

  /**
   * 根据邮箱查找用户
   */
  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { email },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
        },
      },
    });
  }

  /**
   * 根据手机号查找用户
   */
  async findUserByPhone(phone: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { phone },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
        },
      },
    });
  }

  /**
   * 根据ID查找用户
   */
  async findUserById(userId: number): Promise<UserWithRoles | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
        },
      },
    });
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLoginTime(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // 同时更新认证凭证的最后登录时间
    await this.prisma.authCredential.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ============ 私有方法 ============

  /**
   * 自动检测标识符类型
   */
  private detectIdentifierType(
    identifier: string,
  ): 'username' | 'email' | 'phone' {
    // 邮箱正则
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return 'email';
    }
    // 手机号正则（国内外）
    if (/^(\+\d{1,3})?\d{10,14}$/.test(identifier.replace(/\s/g, ''))) {
      return 'phone';
    }
    // 默认为用户名
    return 'username';
  }

  /**
   * 根据标识符类型构建认证凭证
   */
  private buildCredentialsByType(
    identifier: string,
    type: 'username' | 'email' | 'phone',
    isVerified: boolean,
  ) {
    const credentials = {
      username: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
    };

    switch (type) {
      case 'email':
        credentials.email = identifier;
        credentials.isEmailVerified = isVerified;
        break;
      case 'phone':
        credentials.phone = identifier;
        credentials.isPhoneVerified = isVerified;
        break;
      case 'username':
        credentials.username = identifier;
        break;
    }

    return credentials;
  }

  /**
   * 生成认证令牌
   */
  private async generateTokens(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  /**
   * 标识符脱敏
   */
  private maskIdentifier(
    identifier: string,
    type: 'username' | 'email' | 'phone',
  ): string {
    switch (type) {
      case 'email':
        return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
      case 'phone':
        if (identifier.startsWith('+86')) {
          return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (identifier.startsWith('+')) {
          return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
        } else {
          return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
      case 'username':
        return identifier.length > 4
          ? identifier.slice(0, 2) + '***' + identifier.slice(-2)
          : identifier.slice(0, 1) + '***';
      default:
        return identifier.slice(0, 3) + '***';
    }
  }

  /**
   * 构建查询条件
   */
  private buildWhereCondition(
    identifier: string,
    type: CredentialType,
  ): Record<string, string> {
    const conditions: Record<CredentialType, string> = {
      username: 'username',
      email: 'email',
      phone: 'phone',
      facebook: 'facebookId',
      google: 'googleId',
    };

    return { [conditions[type]]: identifier };
  }

  /**
   * 验证创建用户数据
   */
  private validateCreateUserData(data: CreateUserData): void {
    const hasIdentifier =
      data.username ??
      data.email ??
      data.phone ??
      data.facebookId ??
      data.googleId;

    if (!hasIdentifier) {
      throw new BadRequestException('至少需要提供一个身份标识符');
    }

    if (data.username) this.validateUsername(data.username);
    if (data.email) this.validateEmail(data.email);
    if (data.phone) this.validatePhone(data.phone);
  }

  /**
   * 验证用户名格式
   */
  private validateUsername(username: string): void {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        '用户名格式不正确，只能包含字母、数字和下划线，长度3-50字符',
      );
    }
  }

  /**
   * 验证邮箱格式
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  /**
   * 验证手机号格式
   */
  private validatePhone(phone: string): void {
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }
}
