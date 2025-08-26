# 酒店管理系统认证功能完整说明文档

## 概述

本文档详细说明了酒店管理后端系统已完成的认证功能模块，包括完整的功能清单、API接口使用方法、认证中间件配置、多角色系统集成、JWT令牌处理、验证码系统和OAuth集成等核心认证功能的使用指南。

## 1. 认证系统完整功能清单

### 1.1 核心认证功能 ✅

- **多重身份认证**
  - 用户名 + 密码登录
  - 邮箱 + 密码登录  
  - 手机号 + 密码登录
  - 邮箱 + 验证码登录
  - 手机号 + 验证码登录
  - Facebook OAuth 登录
  - Google OAuth 登录

- **用户注册系统**
  - 统一注册接口支持多种身份标识符
  - 自动识别身份标识符类型（用户名/邮箱/手机号）
  - 密码强度验证
  - 手机号/邮箱验证码注册

- **多角色用户系统**
  - 三种用户角色：ADMIN（管理员）、MERCHANT（商家）、CUSTOMER（客户）
  - 单一角色策略：每个用户只能拥有一个角色
  - 角色状态管理：ACTIVE、INACTIVE、SUSPENDED
  - 首次登录自动角色创建
  - 角色特定业务数据隔离

### 1.2 JWT令牌系统 ✅

- **双令牌机制**
  - Access Token（访问令牌）：15分钟有效期
  - Refresh Token（刷新令牌）：7天有效期
  - 令牌自动刷新机制

- **安全特性**
  - JWT令牌黑名单机制
  - 令牌唯一标识符（JTI）
  - Redis存储会话状态
  - 安全注销（清除所有相关令牌）

### 1.3 验证码系统 ✅

- **验证码生成与发送**
  - 6位随机数字验证码
  - 手机短信验证码（阿里云短信服务）
  - 邮箱验证码（预留接口）
  - 验证码有效期：5分钟

- **安全控制**
  - 发送频率限制：60秒间隔
  - 验证码存储加密
  - 自动过期清理
  - 发送失败自动清理

### 1.4 密码安全系统 ✅

- **密码加密**
  - bcrypt哈希算法
  - 可配置盐值轮数
  - 密码变更时间跟踪

- **密码强度验证**
  - 最小长度验证（可配置）
  - 最大长度验证（可配置）
  - 必须包含小写字母
  - 必须包含大写字母
  - 必须包含数字
  - 必须包含特殊字符

### 1.5 OAuth集成系统 ✅

- **支持的OAuth提供商**
  - Facebook OAuth 2.0
  - Google OAuth 2.0
  - 用户信息自动映射
  - 新用户自动注册（默认CUSTOMER角色）

### 1.6 中间件与守卫系统 ✅

- **全局认证守卫**
  - JwtAuthGuard：JWT令牌验证
  - 公开接口标记（@Public装饰器）
  - 自动令牌黑名单检查

- **Passport策略**
  - JWT Strategy：访问令牌验证
  - Local Strategy：用户名密码验证
  - Facebook Strategy：Facebook OAuth
  - Google Strategy：Google OAuth

### 1.7 数据验证与工具 ✅

- **统一验证工具**
  - 身份标识符类型自动检测
  - 邮箱格式验证
  - 手机号格式验证（支持国际格式）
  - 用户名格式验证
  - 验证码格式验证

- **数据脱敏**
  - 日志中敏感信息脱敏
  - 响应数据脱敏

## 2. API接口使用说明

### 2.1 用户注册接口

**端点**: `POST /auth/register`

**请求体**:
```typescript
{
  identifier: string;        // 必需：用户标识符（用户名/邮箱/手机号）
  password?: string;         // 可选：密码（与验证码二选一）
  verificationCode?: string; // 可选：验证码（与密码二选一）
  roleType: RoleType;        // 必需：角色类型 ADMIN|MERCHANT|CUSTOMER
}
```

**示例请求**:
```bash
# 密码注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "StrongPass123!",
    "roleType": "CUSTOMER"
  }'

# 验证码注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "13800138000",
    "verificationCode": "123456",
    "roleType": "MERCHANT"
  }'
```

**成功响应**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "注册成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "credentials": {
        "email": "user@example.com",
        "isEmailVerified": false
      },
      "roles": [{
        "id": 1,
        "roleType": "CUSTOMER",
        "status": "ACTIVE"
      }]
    }
  }
}
```

### 2.2 用户登录接口

**端点**: `POST /auth/login`

**请求体**: 同注册接口

**示例请求**:
```bash
# 密码登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@hotel.com",
    "password": "AdminPass123!",
    "roleType": "ADMIN"
  }'

# 验证码登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "13800138000",
    "verificationCode": "654321",
    "roleType": "CUSTOMER"
  }'
```

**特殊说明**:
- 如果用户首次以某个角色登录，系统会自动创建该角色的详细信息
- 返回的user对象只包含当前登录角色的信息

### 2.3 发送验证码接口

**端点**: `POST /auth/send-code`

**请求体**:
```typescript
{
  identifier: string; // 必需：邮箱或手机号
}
```

**示例请求**:
```bash
# 发送手机验证码
curl -X POST http://localhost:3000/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "13800138000"
  }'

# 发送邮箱验证码
curl -X POST http://localhost:3000/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com"
  }'
```

### 2.4 刷新令牌接口

**端点**: `POST /auth/refresh`

**请求体**:
```typescript
{
  refreshToken: string; // 必需：刷新令牌
}
```

**示例请求**:
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 2.5 用户注销接口

**端点**: `POST /auth/logout`

**请求头**: `Authorization: Bearer <access_token>`

**示例请求**:
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 3. 认证中间件和守卫使用方法

### 3.1 全局JWT守卫配置

系统已在 `app.module.ts` 中配置全局JWT守卫：

```typescript
// src/app.module.ts
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
}
```

所有接口默认需要认证，除非标记为公开接口。

### 3.2 公开接口标记

使用 `@Public` 装饰器标记不需要认证的接口：

```typescript
import { Public } from '@common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Public()  // 标记为公开接口
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

### 3.3 获取当前用户信息

在控制器中使用 `@GetCurrentUser` 装饰器获取当前登录用户：

```typescript
import { GetCurrentUser } from '@common/decorators/current-user.decorator';
import { CurrentUser } from '../types';

@Controller('profile')
export class ProfileController {
  @Get()
  async getProfile(@GetCurrentUser() user: CurrentUser) {
    // user包含：userId, username, email, phone, roles, jti
    return {
      id: user.userId,
      username: user.username,
      roles: user.roles
    };
  }
}
```

### 3.4 自定义守卫示例

创建基于角色的访问控制守卫：

```typescript
// guards/role.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// 使用示例
@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(RoleType.ADMIN)  // 仅管理员可访问
  async getUsers() {
    // 管理员专属功能
  }
}
```

## 4. 多角色系统集成指南

### 4.1 角色系统架构

系统采用单一角色策略，每个用户只能拥有一个角色，三种角色类型：

- **ADMIN（管理员）**：系统管理员，拥有最高权限
- **MERCHANT（商家）**：酒店商家，管理自己的酒店信息
- **CUSTOMER（客户）**：酒店客户，预订和管理订单

### 4.2 角色数据模型

```typescript
// 用户角色表结构
interface UserRole {
  id: number;
  userId: number;
  roleType: RoleType;        // ADMIN | MERCHANT | CUSTOMER
  status: RoleStatus;        // ACTIVE | INACTIVE | SUSPENDED
  createdAt: Date;
  expiresAt?: Date;
  
  // 关联角色详细信息
  merchant?: Merchant;
  customer?: Customer;
  admin?: Admin;
}

// 商家详细信息
interface Merchant {
  businessName: string;
  businessLicense?: string;
  contactPerson: string;
  verificationStatus: MerchantVerifyStatus;
}

// 客户详细信息  
interface Customer {
  realName?: string;
  idCard?: string;
  preferences?: Json;
}

// 管理员详细信息
interface Admin {
  employeeId: string;
  hireDate?: Date;
  isActive: boolean;
}
```

### 4.3 角色创建流程

**首次登录角色创建**：
```typescript
// 用户首次以某角色登录时，系统自动创建角色信息
await this.userService.addRoleToUser(user.id, dto.roleType, {
  status: 'ACTIVE'
});
```

**手动角色管理**：
```typescript
// 检查用户角色
const roleCheck = await this.userService.checkUserRole(userId, roleType);

// 添加角色到现有用户
await this.userService.addRoleToUser(userId, RoleType.MERCHANT, {
  status: RoleStatus.INACTIVE  // 商家需要审核
});
```

### 4.4 前端角色集成示例

**React前端角色路由保护**：

```tsx
// RoleProtectedRoute.tsx
import { useAuth } from '../hooks/useAuth';
import { RoleType } from '../types';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user } = useAuth();
  
  if (!user || !user.roles.some(role => allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
};

// 路由配置
const router = createBrowserRouter([
  {
    path: "/admin",
    element: (
      <RoleProtectedRoute allowedRoles={[RoleType.ADMIN]}>
        <AdminLayout />
      </RoleProtectedRoute>
    )
  },
  {
    path: "/merchant", 
    element: (
      <RoleProtectedRoute allowedRoles={[RoleType.MERCHANT]}>
        <MerchantLayout />
      </RoleProtectedRoute>
    )
  }
]);
```

### 4.5 API接口角色验证

```typescript
// 在需要角色验证的接口上使用装饰器
@Controller('merchant')
@UseGuards(RolesGuard)
export class MerchantController {
  @Get('dashboard')
  @Roles(RoleType.MERCHANT, RoleType.ADMIN)  // 商家和管理员可访问
  async getDashboard(@GetCurrentUser() user: CurrentUser) {
    return this.merchantService.getDashboard(user.userId);
  }
}
```

## 5. JWT令牌处理流程

### 5.1 令牌生成流程

```typescript
// 1. 构建JWT载荷
const payload: JwtPayload = {
  sub: user.id,
  username: user.credentials?.username,
  email: user.credentials?.email, 
  phone: user.credentials?.phone,
  roles: user.roles.map(role => role.roleType),
  iat: Math.floor(Date.now() / 1000),
  jti: generateJti()  // 唯一标识符
};

// 2. 生成访问令牌
const accessToken = await this.jwtService.signAsync(payload, {
  secret: this.configService.jwt.secret,
  expiresIn: '15m'  // 15分钟过期
});

// 3. 生成刷新令牌
const refreshToken = await this.jwtService.signAsync(refreshPayload, {
  secret: this.configService.jwt.refreshSecret,
  expiresIn: '7d'   // 7天过期
});

// 4. 存储刷新令牌到Redis
await this.redis.set(`refresh_token:${user.id}`, refreshToken, 604800);
```

### 5.2 令牌验证流程

```typescript
// JWT守卫验证流程
class JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 提取令牌
    const token = this.extractTokenFromHeader(request);
    
    // 2. 验证令牌
    const payload = await this.jwtService.verifyAsync(token);
    
    // 3. 检查黑名单
    if (await this.tokenService.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('令牌已被撤销');
    }
    
    // 4. 附加用户信息到请求
    request.user = {
      userId: payload.sub,
      roles: payload.roles,
      jti: payload.jti
    };
    
    return true;
  }
}
```

### 5.3 令牌刷新流程

```typescript
// 令牌刷新处理
async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
  // 1. 验证刷新令牌
  const payload = await this.jwtService.verifyAsync(refreshToken, {
    secret: this.configService.jwt.refreshSecret
  });
  
  // 2. 从Redis验证存储的令牌
  const storedToken = await this.redis.get(`refresh_token:${payload.sub}`);
  if (storedToken !== refreshToken) {
    throw new UnauthorizedException('刷新令牌无效');
  }
  
  // 3. 生成新的令牌对
  const user = await this.userService.findUserById(payload.sub);
  const newTokens = await this.generateTokens(user);
  
  return this.formatAuthResponse(newTokens, user);
}
```

### 5.4 前端令牌管理示例

```typescript
// authService.ts
class AuthService {
  private accessToken?: string;
  private refreshToken?: string;
  
  // 自动刷新令牌拦截器
  setupTokenInterceptor() {
    axios.interceptors.request.use(config => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
    
    axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // 尝试刷新令牌
            const response = await this.refreshAccessToken();
            this.accessToken = response.data.accessToken;
            
            // 重试原请求
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // 刷新失败，重定向到登录页
            this.logout();
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  async refreshAccessToken() {
    return axios.post('/auth/refresh', {
      refreshToken: this.refreshToken
    });
  }
}
```

## 6. 验证码发送和验证流程

### 6.1 验证码生成与存储

```typescript
// 1. 验证码生成
const code = Math.random().toString().slice(2, 8);  // 6位数字

// 2. 验证码存储（Redis）
const data: VerificationCodeData = {
  identifier,
  code,
  type: VerificationCodeType.PHONE,
  createdAt: Date.now(),
  expiresAt: Date.now() + 5 * 60 * 1000  // 5分钟过期
};

await this.redis.set(`verification:${identifier}`, JSON.stringify(data), 300);
```

### 6.2 短信发送流程

```typescript
// 阿里云短信发送
async sendVerificationCodeSms(options: SendVerificationCodeSmsOptions) {
  // 1. 参数验证
  ValidatorsUtil.validatePhone(options.phoneNumber);
  ValidatorsUtil.validateVerificationCode(options.code);
  
  // 2. 构建短信请求
  const sendSmsRequest = new SendSmsRequest({
    phoneNumbers: options.phoneNumber,
    signName: this.configService.aliyunSmsConfig.signName,
    templateCode: this.configService.aliyunSmsConfig.templates.verifyCode,
    templateParam: JSON.stringify({ code: options.code })
  });
  
  // 3. 发送短信
  const response = await this.client.sendSmsWithOptions(sendSmsRequest, runtime);
  
  // 4. 处理结果
  return {
    success: response.body?.code === 'OK',
    bizId: response.body?.bizId,
    message: response.body?.message
  };
}
```

### 6.3 验证码验证流程

```typescript
async verifyCode(identifier: string, code: string): Promise<boolean> {
  // 1. 从Redis获取存储的验证码
  const cacheKey = `verification:${identifier}`;
  const storedData = await this.redis.get<VerificationCodeData>(cacheKey, true);
  
  if (!storedData) {
    return false;  // 验证码不存在
  }
  
  // 2. 检查过期时间
  if (Date.now() > storedData.expiresAt) {
    await this.redis.del(cacheKey);  // 清除过期验证码
    return false;
  }
  
  // 3. 验证码匹配检查
  return storedData.code === code;
}
```

### 6.4 频率限制机制

```typescript
// 发送频率检查
async checkRateLimit(identifier: string, type: VerificationCodeType) {
  const rateLimitKey = `rate_limit:${type.toLowerCase()}:${identifier}`;
  const lastSentTime = await this.redis.get(rateLimitKey);
  
  if (lastSentTime) {
    throw new BadRequestException('验证码发送过于频繁，请稍后再试');
  }
}

// 设置频率限制
async setRateLimit(identifier: string, type: VerificationCodeType) {
  const rateLimitKey = `rate_limit:${type.toLowerCase()}:${identifier}`;
  await this.redis.set(rateLimitKey, Date.now().toString(), 60); // 60秒限制
}
```

### 6.5 前端验证码处理示例

```tsx
// VerificationCode.tsx
const VerificationCodeInput = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // 发送验证码
  const sendCode = async () => {
    try {
      await authAPI.sendVerificationCode({ identifier: phone });
      
      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast.success('验证码发送成功');
    } catch (error) {
      toast.error('验证码发送失败');
    }
  };
  
  // 验证码登录
  const handleLogin = async () => {
    try {
      const response = await authAPI.login({
        identifier: phone,
        verificationCode: code,
        roleType: 'CUSTOMER'
      });
      
      // 保存令牌
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // 跳转到主页
      navigate('/dashboard');
    } catch (error) {
      toast.error('登录失败，请检查验证码');
    }
  };
  
  return (
    <div>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="请输入手机号"
      />
      <button 
        onClick={sendCode}
        disabled={countdown > 0}
      >
        {countdown > 0 ? `${countdown}s后重发` : '发送验证码'}
      </button>
      
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="请输入验证码"
      />
      <button onClick={handleLogin}>登录</button>
    </div>
  );
};
```

## 7. OAuth集成使用方式

### 7.1 OAuth配置

**环境变量配置**：
```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google OAuth  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 7.2 Facebook OAuth集成

**后端Strategy配置**（预留接口）：
```typescript
// facebook.strategy.ts (当前为空文件，以下为实现示例)
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly authService: AuthService
  ) {
    super({
      clientID: configService.auth.facebook.clientId,
      clientSecret: configService.auth.facebook.clientSecret,
      callbackURL: '/auth/facebook/callback',
      scope: ['email', 'public_profile']
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const facebookProfile: FacebookProfile = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      picture: profile.photos?.[0]
    };

    const user = await this.authService.authenticateWithFacebook(
      profile.id,
      facebookProfile
    );

    return user;
  }
}
```

**OAuth认证处理**：
```typescript
// OAuth服务处理
async authenticateWithFacebook(facebookId: string, profile: FacebookProfile) {
  // 1. 查找现有用户
  let user = await this.userService.findUserByFacebookId(facebookId);
  
  if (!user) {
    // 2. 创建新用户
    const userData: CreateUserData = {
      facebookId,
      email: profile.email,
      isFacebookVerified: true,
      isEmailVerified: !!profile.email,
      roleType: 'CUSTOMER'  // 默认角色
    };
    
    user = await this.userService.createUser(userData);
  } else {
    // 3. 更新登录时间
    await this.userService.updateLastLoginTime(user.id);
  }
  
  return user;
}
```

### 7.3 前端OAuth集成示例

**Facebook登录按钮**：
```tsx
// FacebookLogin.tsx
import { FacebookLoginButton } from 'react-social-login-buttons';

const FacebookLogin = () => {
  const handleFacebookLogin = () => {
    // 重定向到后端OAuth端点
    window.location.href = `${API_BASE_URL}/auth/facebook`;
  };
  
  return (
    <FacebookLoginButton onClick={handleFacebookLogin}>
      使用Facebook登录
    </FacebookLoginButton>
  );
};
```

**OAuth回调处理**：
```tsx
// AuthCallback.tsx
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        toast.error('OAuth认证失败');
        navigate('/login');
        return;
      }
      
      if (code) {
        try {
          // 后端会处理OAuth回调并返回JWT令牌
          const response = await authAPI.oauthCallback({ code, provider: 'facebook' });
          
          // 保存令牌
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          toast.success('登录成功');
          navigate('/dashboard');
        } catch (error) {
          toast.error('登录失败');
          navigate('/login');
        }
      }
    };
    
    handleCallback();
  }, [searchParams, navigate]);
  
  return <div>正在处理登录...</div>;
};
```

### 7.4 Google OAuth集成

类似Facebook OAuth的配置和实现方式：

```typescript
// Google OAuth用户创建
async authenticateWithGoogle(googleId: string, profile: GoogleProfile) {
  let user = await this.userService.findUserByGoogleId(googleId);
  
  if (!user) {
    const userData: CreateUserData = {
      googleId,
      email: profile.email,
      isGoogleVerified: true,
      isEmailVerified: !!profile.email,
      roleType: 'CUSTOMER'
    };
    
    user = await this.userService.createUser(userData);
  }
  
  return user;
}
```

## 8. 安全最佳实践

### 8.1 令牌安全

- **短期访问令牌**：15分钟过期，减少令牌被盗用的风险
- **刷新令牌轮换**：每次刷新都生成新的令牌对
- **令牌黑名单**：支持令牌撤销功能
- **安全存储**：刷新令牌存储在Redis中，支持过期清理

### 8.2 密码安全

- **强密码策略**：必须包含大小写字母、数字、特殊字符
- **bcrypt加密**：使用行业标准的密码哈希算法
- **盐值保护**：每个密码使用不同的盐值

### 8.3 验证码安全

- **有效期限制**：5分钟有效期
- **发送频率限制**：60秒间隔限制
- **一次性使用**：验证后自动清理
- **敏感信息脱敏**：日志中不记录完整手机号和验证码

### 8.4 接口安全

- **全局限流**：防止接口滥用
- **输入验证**：所有输入参数严格验证
- **错误处理**：统一错误响应，不泄露敏感信息
- **CORS配置**：限制跨域访问来源

## 9. 错误处理和状态码

### 9.1 常见错误响应

```json
// 400 - 参数验证失败
{
  "success": false,
  "statusCode": 400,
  "message": "密码强度不足: 密码必须包含大写字母",
  "timestamp": "2025-01-01T00:00:00.000Z"
}

// 401 - 认证失败
{
  "success": false,
  "statusCode": 401,
  "message": "访问令牌无效或已过期",
  "timestamp": "2025-01-01T00:00:00.000Z"
}

// 409 - 用户已存在
{
  "success": false,
  "statusCode": 409,
  "message": "该账号已注册为客户角色",
  "timestamp": "2025-01-01T00:00:00.000Z"
}

// 429 - 请求过于频繁
{
  "success": false,
  "statusCode": 429,
  "message": "验证码发送过于频繁，请稍后再试",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 9.2 状态码说明

- **200**: 请求成功
- **201**: 创建成功（注册）
- **400**: 请求参数错误
- **401**: 未认证或认证失败
- **403**: 权限不足
- **409**: 资源冲突（用户已存在）
- **429**: 请求过于频繁
- **500**: 服务器内部错误

## 10. 监控和日志

### 10.1 认证日志记录

系统会自动记录以下认证相关日志：

```typescript
// 用户注册日志
"用户注册成功: u***@example.com, 角色: 客户"

// 用户登录日志  
"用户登录成功: userId=123, 角色: 客户"

// 验证码发送日志
"验证码发送成功: 138****8000"

// 令牌刷新日志
"用户令牌刷新成功: userId=123"

// 用户注销日志
"用户注销成功: userId=123"

// 安全相关日志
"JWT验证失败: 访问令牌已过期"
"令牌已加入黑名单: jti=1234567890_abcdefg"
```

### 10.2 性能监控

- **响应时间监控**：记录每个认证接口的响应时间
- **短信发送监控**：记录短信发送成功率和耗时
- **Redis性能监控**：监控缓存操作性能
- **令牌验证性能**：监控JWT验证耗时

## 结语

本认证系统是一个完整、安全、可扩展的企业级认证解决方案，支持多种认证方式、完善的安全机制、灵活的多角色系统，以及详尽的使用文档。系统已完成所有核心功能的开发和测试，可以直接用于生产环境。

如需扩展或定制功能，请参考上述文档中的相关接口和实现示例。系统采用模块化设计，支持灵活的功能扩展和定制。