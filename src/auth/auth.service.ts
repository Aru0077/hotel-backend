// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  UsernamePasswordRegisterDto,
  EmailRegisterDto,
  PhoneRegisterDto,
  PasswordLoginDto,
  EmailLoginDto,
  PhoneLoginDto,
  SendVerificationCodeDto,
  LogoutDto,
} from './dto/auth.dto';
import {
  AuthTokenResponse,
  UserWithCredentials,
  UserWithRoles,
  CreateUserData,
  VerificationCodeType,
  VerificationCodePurpose,
  CurrentUser,
} from '../types';
import { PasswordService } from './services/password.service';
import { VerificationCodeService } from './services/verification-code.service';
import { TokenService } from './services/token.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  // ============ 注册方法 ============

  async registerWithUsernamePassword(
    dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    if (await this.userService.checkUserExists(dto.username, 'username')) {
      throw new ConflictException('用户名已存在');
    }

    const userData: CreateUserData = {
      username: dto.username,
      hashedPassword: await this.passwordService.hashPassword(dto.password),
      roleType: dto.roleType,
      isEmailVerified: false,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);
    return this.generateAuthResponse(user);
  }

  async registerWithEmailCode(
    dto: EmailRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      VerificationCodePurpose.REGISTER,
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    if (await this.userService.checkUserExists(dto.email, 'email')) {
      throw new ConflictException('邮箱已存在');
    }

    const userData: CreateUserData = {
      email: dto.email,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType,
      isEmailVerified: true,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      VerificationCodePurpose.REGISTER,
    );

    return this.generateAuthResponse(user);
  }

  async registerWithPhoneCode(
    dto: PhoneRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      VerificationCodePurpose.REGISTER,
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    if (await this.userService.checkUserExists(dto.phone, 'phone')) {
      throw new ConflictException('手机号已存在');
    }

    const userData: CreateUserData = {
      phone: dto.phone,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType,
      isEmailVerified: false,
      isPhoneVerified: true,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      VerificationCodePurpose.REGISTER,
    );

    return this.generateAuthResponse(user);
  }

  // ============ 登录方法 ============

  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    const user = await this.userService.findUserByIdentifier(identifier);

    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    if (!isPasswordValid) {
      return null;
    }

    await this.userService.updateLastLoginTime(user.id);
    return user;
  }

  async loginWithPassword(dto: PasswordLoginDto): Promise<AuthTokenResponse> {
    const user = await this.validateUserCredentials(
      dto.identifier,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
    }

    const userWithRoles = await this.userService.findUserById(user.id);
    if (!userWithRoles) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.generateAuthResponse(userWithRoles);
  }

  async loginWithEmailCode(dto: EmailLoginDto): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      VerificationCodePurpose.LOGIN,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      VerificationCodePurpose.LOGIN,
    );

    return this.generateAuthResponse(user);
  }

  async loginWithPhoneCode(dto: PhoneLoginDto): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      VerificationCodePurpose.LOGIN,
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      VerificationCodePurpose.LOGIN,
    );

    return this.generateAuthResponse(user);
  }

  // ============ 辅助方法 ============

  async sendVerificationCode(
    dto: SendVerificationCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    // 确定验证码类型
    const type = dto.email
      ? VerificationCodeType.EMAIL
      : VerificationCodeType.PHONE;

    // 构造验证码服务所需的参数
    const verificationDto = {
      ...dto,
      type,
    };

    await this.verificationCodeService.sendVerificationCode(verificationDto);
    return {
      success: true,
      message: '验证码发送成功',
    };
  }

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
   * 用户注销 - 完整实现
   * @param currentUser - 当前用户信息
   * @param dto - 可选的注销参数（包含刷新令牌）
   */
  async logout(
    currentUser: CurrentUser,
    dto?: LogoutDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = currentUser.userId;

      // 1. 将当前访问令牌加入黑名单（如果有jti）
      if (currentUser.jti) {
        // 计算token过期时间（假设是15分钟，与配置一致）
        const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
        await this.tokenService.addToBlacklist(currentUser.jti, expiresAt);
        this.logger.log(
          `访问令牌已加入黑名单: userId=${userId}, jti=${currentUser.jti}`,
        );
      }

      // 2. 清除刷新令牌
      if (dto?.refreshToken) {
        // 如果提供了刷新令牌，验证后清除
        try {
          const payload = await this.tokenService.verifyRefreshToken(
            dto.refreshToken,
          );
          if (payload.sub === userId) {
            await this.tokenService.logout(userId);
            this.logger.log(`指定刷新令牌已清除: userId=${userId}`);
          }
        } catch (error) {
          // 即使刷新令牌验证失败，也继续清除用户的所有令牌
          this.logger.warn(
            `刷新令牌验证失败，清除用户所有令牌: userId=${userId}`,
            error,
          );
          await this.tokenService.logout(userId);
        }
      } else {
        // 如果没有提供刷新令牌，清除该用户的所有刷新令牌
        await this.tokenService.logout(userId);
        this.logger.log(`用户所有令牌已清除: userId=${userId}`);
      }

      // 3. 更新用户最后登录时间为null（可选，表示已注销）
      // 这里可以选择是否更新，根据业务需求决定
      // await this.userService.updateLastLoginTime(userId, null);

      this.logger.log(
        `用户注销成功: userId=${userId}, username=${currentUser.username}`,
      );

      return {
        success: true,
        message: '注销成功',
      };
    } catch (error) {
      this.logger.error(`用户注销失败: userId=${currentUser?.userId}`, error);

      return {
        success: false,
        message: '注销失败，请稍后重试',
      };
    }
  }

  // ============ 私有方法 ============

  private async generateAuthResponse(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}
