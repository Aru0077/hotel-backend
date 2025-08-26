// src/auth/auth.service.ts - 重构后的认证服务
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AuthDto, LoginDto, SendCodeDto } from './dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  CurrentUser,
  UserWithRoles,
  FacebookProfile,
  GoogleProfile,
  ROLE_TYPE_CHINESE,
} from '../types';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { VerificationCodeService } from './services/verification-code.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  /**
   * 统一注册方法
   */
  async register(dto: AuthDto): Promise<AuthTokenResponse> {
    const identifierType = this.userService.detectIdentifierType(
      dto.identifier,
    );

    // 检查用户是否已存在
    const existingUser = await this.userService.findUserByIdentifier(
      dto.identifier,
    );

    if (existingUser) {
      // 用户已存在，检查是否已有该角色
      const hasRole = await this.userService.userHasRole(
        existingUser.id,
        dto.roleType,
      );

      if (hasRole) {
        throw new ConflictException(
          `该账号已注册为${ROLE_TYPE_CHINESE[dto.roleType]}角色`,
        );
      }

      // 提示用户使用已有账号登录
      throw new ConflictException(
        `该手机号已注册，请使用原密码登录${ROLE_TYPE_CHINESE[dto.roleType]}端，系统将自动创建${ROLE_TYPE_CHINESE[dto.roleType]}角色信息`,
      );
    }

    // 用户不存在，创建新用户（原有逻辑）
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

    // 构建用户数据 - Merchant默认为待审核状态
    const roleStatus = dto.roleType === 'MERCHANT' ? 'INACTIVE' : 'ACTIVE';
    const userData: CreateUserData = {
      roleType: dto.roleType,
      roleStatus,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      ...this.userService.buildCredentialsByType(
        dto.identifier,
        identifierType,
        !!dto.verificationCode,
      ),
    };

    // 创建用户
    const user = await this.userService.createUser(userData);

    // 清除验证码
    if (dto.verificationCode) {
      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    }

    this.logger.log(
      `用户注册成功: ${this.userService.maskIdentifier(dto.identifier, identifierType)}, 角色: ${ROLE_TYPE_CHINESE[dto.roleType]}`,
    );

    return this.generateTokens(user);
  }

  /**
   * 统一登录方法（支持角色验证）
   */
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
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

      user = await this.userService.findUserByIdentifier(dto.identifier);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    } else {
      // 密码登录
      if (!dto.password) {
        throw new BadRequestException('密码登录需要提供密码');
      }

      user = await this.userService.findUserByIdentifier(dto.identifier);
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

    // 验证用户是否拥有指定角色
    const roleCheck = await this.userService.checkUserRole(
      user.id,
      dto.roleType,
    );

    if (!roleCheck.hasRole) {
      // 首次登录该角色端，自动创建角色
      const roleStatus = dto.roleType === 'MERCHANT' ? 'INACTIVE' : 'ACTIVE';
      await this.userService.addRoleToUser(user.id, dto.roleType, {
        status: roleStatus,
      });

      this.logger.log(
        `首次登录自动创建角色: userId=${user.id}, roleType=${dto.roleType}, status=${roleStatus}`,
      );

      // 如果是商家角色，提示待审核
      if (dto.roleType === 'MERCHANT') {
        throw new UnauthorizedException(
          '您的商家角色已创建，但需要管理员审核后才能使用，请联系管理员',
        );
      }

      // 重新获取用户信息（包含新创建的角色）
      user = await this.userService.findUserById(user.id);
      if (!user) {
        throw new UnauthorizedException('用户信息获取失败');
      }
    } else {
      // 检查角色状态
      if (roleCheck.roleStatus === 'INACTIVE') {
        if (dto.roleType === 'MERCHANT') {
          throw new UnauthorizedException('您的商家账号待审核，请联系管理员');
        } else {
          throw new UnauthorizedException('您的账号已被禁用，请联系管理员');
        }
      }

      if (roleCheck.roleStatus === 'SUSPENDED') {
        throw new UnauthorizedException('您的账号已被暂停，请联系管理员');
      }
    }

    // 更新登录时间
    await this.userService.updateLastLoginTime(user.id);

    // 过滤用户角色，只返回当前登录的角色信息
    const filteredUser = {
      ...user,
      roles: user.roles.filter((role) => role.roleType === dto.roleType),
    };

    this.logger.log(
      `用户登录成功: userId=${user.id}, 角色: ${ROLE_TYPE_CHINESE[dto.roleType]}`,
    );

    return this.generateTokens(filteredUser);
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
      const user = await this.userService.findUserById(payload.sub);

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
    const user = await this.userService.findUserByIdentifier(identifier);
    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    const isValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );

    return isValid ? user : null;
  }

  // ============ OAuth认证方法 ============

  /**
   * Facebook认证
   */
  async authenticateWithFacebook(
    facebookId: string,
    profile: FacebookProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByFacebookId(facebookId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        facebookId,
        isFacebookVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
    }

    return user;
  }

  /**
   * Google认证
   */
  async authenticateWithGoogle(
    googleId: string,
    profile: GoogleProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByGoogleId(googleId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        googleId,
        isGoogleVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
    }

    return user;
  }

  // ============ 私有方法 ============

  /**
   * 生成认证令牌
   */
  private async generateTokens(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}
