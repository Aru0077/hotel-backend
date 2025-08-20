// src/auth/auth.service.ts - 简化的统一认证服务
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { RegisterDto, LoginDto, SendCodeDto } from './dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  CurrentUser,
  VerificationCodePurpose,
} from '../types';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { VerificationCodeService } from './services/verification-code.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly userService: UserService,
  ) {}

  /**
   * 统一注册方法 - 自动识别认证方式
   */
  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const { identifier, authType } = this.detectAuthType(dto);

    // 检查用户是否已存在
    if (await this.userService.checkUserExists(identifier, authType)) {
      throw new ConflictException(`${this.getAuthTypeLabel(authType)}已存在`);
    }

    // 验证码注册需要验证验证码
    if (dto.verificationCode) {
      const isValid = await this.verificationCodeService.verifyCode(
        identifier,
        dto.verificationCode,
        VerificationCodePurpose.REGISTER,
      );
      if (!isValid) {
        throw new BadRequestException('验证码错误或已过期');
      }
    }

    // 构建用户数据
    const userData: CreateUserData = {
      ...this.buildCredentialData(dto),
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType,
      ...this.buildRoleSpecificData(dto),
    };

    // 创建用户
    const user = await this.userService.createUser(userData);

    // 清除验证码
    if (dto.verificationCode) {
      await this.verificationCodeService.clearVerificationCode(
        identifier,
        VerificationCodePurpose.REGISTER,
      );
    }

    // 生成令牌
    return this.generateAuthTokens(user);
  }

  /**
   * 统一登录方法 - 自动识别认证方式
   */
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    let user;

    if (dto.verificationCode) {
      // 验证码登录
      const identifier = dto.email || dto.phone;
      if (!identifier) {
        throw new BadRequestException('验证码登录需要提供邮箱或手机号');
      }

      const isValid = await this.verificationCodeService.verifyCode(
        identifier,
        dto.verificationCode,
        VerificationCodePurpose.LOGIN,
      );
      if (!isValid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }

      user = dto.email
        ? await this.userService.findUserByEmail(dto.email)
        : await this.userService.findUserByPhone(dto.phone!);

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 清除验证码
      await this.verificationCodeService.clearVerificationCode(
        identifier,
        VerificationCodePurpose.LOGIN,
      );
    } else {
      // 密码登录
      if (!dto.identifier || !dto.password) {
        throw new BadRequestException('密码登录需要提供用户标识符和密码');
      }

      user = await this.validateUserCredentials(dto.identifier, dto.password);
      if (!user) {
        throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
      }
    }

    // 验证偏好角色
    if (dto.preferredRole) {
      const hasRole = user.roles.some(
        (role) => role.roleType === dto.preferredRole,
      );
      if (!hasRole) {
        throw new UnauthorizedException('用户不具备该角色权限');
      }
    }

    // 更新最后登录时间
    await this.userService.updateLastLoginTime(user.id);

    // 生成令牌
    return this.generateAuthTokens(user);
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
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const dto = { refreshToken };
    return await this.tokenService.refreshToken(dto, user);
  }

  /**
   * 用户注销
   */
  async logout(user: CurrentUser): Promise<{ success: boolean }> {
    await this.tokenService.logout(user.userId);
    return { success: true };
  }

  // 私有辅助方法
  private detectAuthType(dto: RegisterDto): {
    identifier: string;
    authType: string;
  } {
    if (dto.username) return { identifier: dto.username, authType: 'username' };
    if (dto.email) return { identifier: dto.email, authType: 'email' };
    if (dto.phone) return { identifier: dto.phone, authType: 'phone' };
    throw new BadRequestException('必须提供用户名、邮箱或手机号');
  }

  private getAuthTypeLabel(authType: string): string {
    const labels = { username: '用户名', email: '邮箱', phone: '手机号' };
    return labels[authType] ?? '标识符';
  }

  private buildCredentialData(dto: RegisterDto) {
    return {
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      isEmailVerified: !!dto.email && !!dto.verificationCode,
      isPhoneVerified: !!dto.phone && !!dto.verificationCode,
    };
  }

  private buildRoleSpecificData(dto: RegisterDto) {
    switch (dto.roleType) {
      case 'MERCHANT':
        return { merchantData: dto.merchantData };
      case 'CUSTOMER':
        return { customerData: dto.customerData };
      case 'ADMIN':
        return { adminData: dto.adminData };
      default:
        return {};
    }
  }

  private async validateUserCredentials(identifier: string, password: string) {
    const user = await this.userService.findUserByIdentifier(identifier);
    if (!user?.credentials?.hashedPassword) return null;

    const isValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    return isValid ? user : null;
  }

  private async generateAuthTokens(user: any): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}
