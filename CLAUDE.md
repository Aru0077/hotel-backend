# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hotel management backend built with NestJS, featuring a multi-role user system with comprehensive authentication. The system serves three independent frontend applications corresponding to three user roles: ADMIN (Administrator), MERCHANT (Merchant), and CUSTOMER (Customer).

### 🚀 Development Status

**Current Stage: Authentication System Completed ✅**
- ✅ Multi-role user authentication system
- ✅ JWT token management with refresh mechanism
- ✅ SMS/Email verification code system
- ✅ OAuth integration (Facebook/Google)
- ✅ Password security and validation
- ✅ Role-based access control framework
- ✅ Comprehensive API documentation

**Next Stage: Business Feature Development 🔄**
Starting core business functionality development based on three-role system requirements. See [BUSINESS_ROADMAP.md](./BUSINESS_ROADMAP.md) for detailed development plan.

**Important Architecture Decisions:**
- **Single Role Per User**: The system does not support role switching functionality. Each user maintains a single role identity throughout their entire lifecycle.
- **Role-Required Authentication**: Role information is a mandatory parameter in all login and registration endpoints.
- **Role-Based Access Control**: The system determines user permissions and accessible feature modules based on their assigned role.
- **Separate Frontend Applications**: Three distinct frontend applications serve different user roles, each with role-specific interfaces and functionality.

## Common Commands

### Development
- `npm run start:dev` - Start development server with watch mode
- `npm run start` - Start production server  
- `npm run start:debug` - Start with debugging enabled

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage

### Code Quality
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run build` - Build the project

### Database
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma migrate dev` - Create and apply new migration
- `npx prisma studio` - Launch Prisma Studio GUI

## Architecture Overview

### Database Schema
The system uses a flexible multi-role architecture with PostgreSQL:

- **User** - Core user entity with basic information
- **AuthCredential** - Stores all authentication identifiers (username, email, phone, OAuth)
- **UserRole** - Junction table linking users to specific roles
- **Merchant/Customer/Admin** - Role-specific information tables

Key features:
- Single role per user (no role switching)
- Unified authentication system supporting username/email/phone + password/code
- OAuth integration (Facebook, Google)
- Phone verification via Alibaba Cloud SMS
- Role-specific data isolation and permissions

### Module Structure
- **auth/** - Complete authentication system with role-based strategies
  - **services/** - Password, token, verification code, and OAuth services
  - **guards/** - Authentication guards for different strategies
  - **strategies/** - Passport strategies (JWT, local, Facebook, Google)
- **user/** - User management and profile operations
- **config/** - Environment configuration with validation
- **prisma/** - Database client and connection management
- **redis/** - Caching layer for sessions and verification codes
- **sms/** - Alibaba Cloud SMS integration for phone verification
- **common/** - Shared utilities, guards, interceptors, filters, and decorators
  - **utils/** - Unified validation utilities (ValidatorsUtil)

### Global Configuration
- JWT-based authentication with refresh tokens
- Global rate limiting via Throttler
- Response transformation interceptor for consistent API responses
- Global exception filter for error handling
- Request logging interceptor

### Authentication Flow
The system supports multiple authentication methods:
1. Username/Email/Phone + Password
2. Email/Phone + Verification Code
3. OAuth (Facebook, Google)

**Role-Specific Authentication:**
- Role type (ADMIN/MERCHANT/CUSTOMER) is required for all authentication requests
- Users are created with a single, permanent role that cannot be changed
- Each authentication attempt validates the user's role against the requested role
- Role-specific business logic is applied during registration (e.g., MERCHANT status starts as INACTIVE for approval)

### Environment Variables
Key environment variables include:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT tokens
- `FACEBOOK_APP_ID`, `GOOGLE_CLIENT_ID` - OAuth credentials
- `ALIBABA_CLOUD_ACCESS_KEY_*` - SMS service credentials

### Testing Strategy
- Unit tests with Jest for individual components
- E2E tests for API endpoints
- Test database separate from development/production

## 详细模块架构与接口文档

### 1. 核心模块分析

#### 1.1 基础设施模块 (Infrastructure)

**配置管理 (Config Module)**
- **位置**: `src/config/`
- **核心文件**: 
  - `config.service.ts` - 统一配置服务 
  - `configuration.ts` - 配置工厂函数
  - `config.types.ts` - 配置类型定义
- **功能**: 环境变量管理、配置验证、多环境支持
- **依赖**: `@nestjs/config`, `joi`

**数据库模块 (Prisma Module)**
- **位置**: `src/prisma/`  
- **核心文件**: `prisma.service.ts`, `prisma.module.ts`
- **功能**: 数据库连接管理、查询封装、健康检查
- **依赖**: `@prisma/client`

**缓存模块 (Redis Module)**
- **位置**: `src/redis/`
- **核心文件**: `redis.service.ts`, `redis.module.ts`  
- **功能**: Redis连接管理、缓存操作、会话存储
- **依赖**: `redis`

#### 1.2 业务核心模块 (Business Core)

**用户管理模块 (User Module)**
- **位置**: `src/user/`
- **核心服务**: `user.service.ts:UserService`
- **主要功能**:
  - 用户CRUD操作 (`findUserById`, `createUser`)
  - 身份标识符管理 (`findUserByIdentifier`, `buildCredentialsByType`) 
  - 角色管理 (`userHasRole`, `addRoleToUser`, `checkUserRole`)
  - 凭证验证 (`validateCreateUserData`)
- **依赖**: PrismaService, ValidatorsUtil
- **数据模型**: User, AuthCredential, UserRole

**认证模块 (Auth Module)**
- **位置**: `src/auth/`
- **核心控制器**: `auth.controller.ts:AuthController`
- **核心服务**: `auth.service.ts:AuthService`
- **子服务模块**:
  - `services/password.service.ts` - 密码加密验证
  - `services/token.service.ts` - JWT令牌管理  
  - `services/verification-code.service.ts` - 验证码服务
  - `services/oauth.service.ts` - 第三方登录
- **认证策略**:
  - `strategies/local.strategy.ts` - 本地密码策略
  - `strategies/jwt.strategy.ts` - JWT验证策略
  - `strategies/facebook.strategy.ts` - Facebook OAuth
  - `strategies/google.strategy.ts` - Google OAuth
- **依赖**: UserService, PrismaService, RedisService, SmsService

#### 1.3 支持服务模块 (Support Services)

**短信服务模块 (SMS Module)**
- **位置**: `src/sms/`
- **核心服务**: `sms.service.ts:SmsService`
- **功能**: 阿里云短信发送、验证码生成、模板管理
- **依赖**: `@alicloud/dysmsapi20170525`

**健康检查模块 (Health Module)**
- **位置**: `src/health/`
- **核心控制器**: `health.controller.ts:HealthController`
- **功能**: 系统状态监控、数据库连接检查、Redis状态检查
- **依赖**: `@nestjs/terminus`

#### 1.4 通用工具模块 (Common Utilities)

**通用装饰器**:
- `@common/decorators/current-user.decorator.ts` - 获取当前用户
- `@common/decorators/public.decorator.ts` - 公开接口标记
- `@common/decorators/types.decorator.ts` - 类型装饰器

**全局守卫**:
- `@common/guards/jwt-auth.guard.ts` - JWT认证守卫

**拦截器**:
- `@common/interceptors/logging.interceptor.ts` - 请求日志记录
- `@common/interceptors/response-transform.interceptor.ts` - 响应格式统一

**工具类**:
- `@common/utils/validators.util.ts` - 统一验证工具

### 2. API接口文档

#### 2.1 认证接口 (Auth Endpoints)

**基础路径**: `/auth`

##### 用户注册
- **端点**: `POST /auth/register`
- **描述**: 统一注册接口，支持用户名/邮箱/手机号注册
- **请求体**: `AuthDto`
```typescript
{
  identifier: string;        // 用户凭证
  password?: string;         // 密码（与验证码二选一）
  verificationCode?: string; // 验证码（与密码二选一）
  roleType: RoleType;        // 角色类型：ADMIN|MERCHANT|CUSTOMER
}
```
- **响应**: `AuthTokenResponse`
```typescript
{
  accessToken: string;
  refreshToken: string; 
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserWithRoles;
}
```

##### 用户登录
- **端点**: `POST /auth/login`
- **描述**: 统一登录接口，支持角色验证和自动角色创建
- **请求体**: `LoginDto` (结构同AuthDto)
- **响应**: `AuthTokenResponse`
- **特殊逻辑**: 首次登录特定角色时自动创建角色信息

##### 发送验证码
- **端点**: `POST /auth/send-code`
- **描述**: 发送手机/邮箱验证码
- **请求体**: `SendCodeDto`
```typescript
{
  identifier: string; // 邮箱或手机号
}
```
- **响应**: `{ success: boolean }`

##### 刷新令牌
- **端点**: `POST /auth/refresh`
- **描述**: 使用refresh token获取新的access token
- **请求体**: `RefreshTokenDto`
```typescript
{
  refreshToken: string;
}
```
- **响应**: `AuthTokenResponse`

##### 用户注销
- **端点**: `POST /auth/logout` 🔒
- **描述**: 清除用户会话信息
- **请求头**: `Authorization: Bearer <access_token>`
- **响应**: `{ success: boolean }`

#### 2.2 健康检查接口 (Health Endpoints)

**基础路径**: `/health`

##### 整体健康检查
- **端点**: `GET /health`
- **描述**: 检查应用、数据库、Redis状态
- **响应**: `HealthCheckResult`
```typescript
{
  status: 'ok' | 'error';
  info: {
    app: { status: 'up', environment: string, port: number };
    database: { status: 'up' | 'down' };
    redis: { status: 'up' | 'down' };
  };
  error?: object;
  details: object;
}
```

##### 存活性检查
- **端点**: `GET /health/liveness`
- **描述**: Kubernetes存活性探针
- **响应**: 应用基础状态

##### 就绪性检查  
- **端点**: `GET /health/readiness`
- **描述**: Kubernetes就绪性探针
- **响应**: 依赖服务状态

### 3. 数据模型与关系

#### 3.1 核心实体模型

**User (用户表)**
```typescript
{
  id: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date?;
  // 关联
  credentials: AuthCredential;
  roles: UserRole[];
}
```

**AuthCredential (认证凭证表)**  
```typescript
{
  id: number;
  userId: number;
  // 身份标识符
  username?: string;
  email?: string;
  phone?: string;
  facebookId?: string;
  googleId?: string;
  // 密码与验证状态
  hashedPassword?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isFacebookVerified: boolean;
  isGoogleVerified: boolean;
  // 时间戳
  lastLoginAt?: Date;
  passwordChanged?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**UserRole (用户角色表)**
```typescript
{
  id: number;
  userId: number;
  roleType: RoleType;        // ADMIN|MERCHANT|CUSTOMER
  status: RoleStatus;        // ACTIVE|INACTIVE|SUSPENDED  
  createdAt: Date;
  expiresAt?: Date;
  // 关联角色详情
  merchant?: Merchant;
  customer?: Customer;
  admin?: Admin;
}
```

**角色详情表**:
- **Merchant**: 商家信息（businessName, contactPerson, verificationStatus等）
- **Customer**: 客户信息（realName, idCard, preferences等）  
- **Admin**: 管理员信息（employeeId, hireDate, isActive等）

#### 3.2 枚举定义

```typescript
enum RoleType {
  ADMIN     // 管理员
  MERCHANT  // 商家  
  CUSTOMER  // 客户
}

enum RoleStatus {
  ACTIVE    // 激活
  INACTIVE  // 未激活
  SUSPENDED // 暂停
}

enum AuthProvider {
  USERNAME_PASSWORD // 用户名+密码
  EMAIL_PASSWORD    // 邮箱+密码
  PHONE_PASSWORD    // 手机号+密码
  EMAIL_CODE        // 邮箱+验证码
  PHONE_CODE        // 手机号+验证码
  FACEBOOK          // Facebook登录
  GOOGLE            // Google登录
}
```

### 4. 模块依赖关系图

```
AppModule (根模块)
├── ConfigModule (配置管理)
├── PrismaModule (数据库)
├── RedisModule (缓存)
├── AuthModule (认证) 
│   ├── UserModule (用户管理)
│   ├── SmsModule (短信服务)
│   └── TokenService, PasswordService, etc.
├── HealthModule (健康检查)
│   ├── PrismaService
│   └── RedisService  
└── CommonModule (通用组件)
    ├── Guards (全局守卫)
    ├── Interceptors (全局拦截器)  
    ├── Filters (全局过滤器)
    └── Utils (工具类)
```

**依赖流向**:
1. **AuthModule** → UserModule → PrismaModule
2. **AuthModule** → SmsModule → ConfigModule  
3. **HealthModule** → PrismaModule, RedisModule
4. **所有模块** → ConfigModule (配置注入)
5. **所有模块** → CommonModule (通用组件)

### 5. 关键设计模式

#### 5.1 统一响应格式
所有API响应通过`ResponseTransformInterceptor`统一格式化:
```typescript
{
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}
```

#### 5.2 角色权限控制
- **单一角色原则**: 每个用户账户只能拥有一个角色
- **角色隔离**: 不同角色的业务数据完全隔离
- **动态角色创建**: 首次登录某角色端时自动创建角色信息

#### 5.3 认证策略模式
- **多重认证方式**: 密码、验证码、OAuth统一接口
- **自动识别**: 根据identifier自动判断认证类型
- **渐进式验证**: 支持验证码免密登录后设置密码

### 6. 安全机制

#### 6.1 认证安全
- **JWT令牌**: Access Token (15分钟) + Refresh Token (7天)
- **密码安全**: bcrypt加密存储
- **会话管理**: Redis存储用户会话状态

#### 6.2 接口安全  
- **全局限流**: ThrottlerModule防止接口滥用
- **CORS配置**: 跨域请求控制
- **请求验证**: class-validator全局验证
- **异常过滤**: 统一错误处理和敏感信息过滤

#### 6.3 数据安全
- **输入验证**: ValidatorsUtil统一验证规则  
- **SQL注入防护**: Prisma ORM参数化查询
- **信息脱敏**: 日志和响应中敏感信息脱敏处理

### 7. 监控与运维

#### 7.1 健康检查体系
- **应用状态**: 基础运行状态检查
- **数据库连接**: PostgreSQL连通性检查  
- **缓存服务**: Redis连通性检查
- **Kubernetes就绪性探针**: 容器化部署支持

#### 7.2 日志记录
- **请求日志**: LoggingInterceptor记录所有API调用
- **业务日志**: 关键业务操作的详细日志记录
- **错误日志**: 全局异常捕获和错误堆栈记录

### 8. 扩展性设计

#### 8.1 模块化架构
- **松耦合设计**: 各模块独立可替换
- **接口抽象**: 服务层接口化便于测试和扩展
- **配置驱动**: 通过环境变量控制功能开关

#### 8.2 数据库设计
- **灵活角色模型**: 支持未来新增角色类型
- **索引优化**: 基于查询模式的复合索引设计
- **数据迁移**: Prisma Migration支持平滑升级

这个项目展现了企业级NestJS应用的标准架构模式，具备高可维护性、可扩展性和安全性，适用于多租户SaaS系统的开发需求。

## 业务功能开发指导原则

### 开发原则
1. **角色驱动设计**: 所有业务功能必须基于角色权限设计，确保数据安全和访问控制
2. **API优先**: 采用API-First设计理念，先设计接口再实现业务逻辑
3. **数据一致性**: 使用Prisma事务确保复杂业务操作的数据一致性
4. **渐进式开发**: 按角色优先级顺序开发，先完成核心功能再扩展
5. **测试驱动**: 每个业务模块必须包含单元测试和集成测试

### 架构规范
1. **模块结构**: 每个业务模块包含 controller、service、dto、types
2. **数据访问**: 统一使用PrismaService，禁止直接SQL查询
3. **异常处理**: 使用NestJS内置异常类，统一错误响应格式
4. **日志记录**: 关键业务操作必须记录操作日志
5. **权限验证**: 使用装饰器和守卫实现细粒度权限控制

### 代码规范

#### 命名约定
- **文件命名**: kebab-case (hotel-room.service.ts)
- **类命名**: PascalCase (HotelRoomService)
- **方法/变量**: camelCase (findAvailableRooms)
- **常量**: UPPER_SNAKE_CASE (MAX_ROOM_CAPACITY)
- **接口**: PascalCase with 'I' prefix (IHotelRoom)

#### 目录结构
```
src/
├── modules/
│   ├── hotel/
│   │   ├── hotel.controller.ts
│   │   ├── hotel.service.ts
│   │   ├── hotel.module.ts
│   │   ├── dto/
│   │   │   ├── create-hotel.dto.ts
│   │   │   └── update-hotel.dto.ts
│   │   ├── entities/
│   │   │   └── hotel.entity.ts
│   │   └── types/
│   │       └── hotel.types.ts
│   └── room/
│       ├── room.controller.ts
│       ├── room.service.ts
│       └── ...
```

#### DTO设计规范
- 使用class-validator进行数据验证
- 继承PickType/OmitType减少重复代码
- 添加Swagger装饰器完善API文档

```typescript
export class CreateHotelDto {
  @ApiProperty({ description: '酒店名称', example: '豪华大酒店' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '酒店描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
```

#### Service层规范
- 方法命名语义化: find, create, update, delete, check
- 复杂查询封装为独立方法
- 使用Prisma事务处理复杂业务逻辑
- 添加适当的日志记录

```typescript
@Injectable()
export class HotelService {
  private readonly logger = new Logger(HotelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createHotel(merchantId: number, dto: CreateHotelDto): Promise<Hotel> {
    const hotel = await this.prisma.$transaction(async (tx) => {
      // 业务逻辑实现
      const newHotel = await tx.hotel.create({
        data: { ...dto, merchantId }
      });
      
      this.logger.log(`酒店创建成功: hotelId=${newHotel.id}, merchantId=${merchantId}`);
      return newHotel;
    });

    return hotel;
  }
}
```

#### Controller层规范
- 使用角色守卫控制接口访问
- 统一使用装饰器获取当前用户信息
- 完善的Swagger文档注释
- 标准的HTTP状态码使用

```typescript
@ApiTags('酒店管理')
@Controller('hotels')
@UseGuards(RolesGuard)
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  @Roles(RoleType.MERCHANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建酒店' })
  @ApiResponse({ status: 201, description: '酒店创建成功' })
  async createHotel(
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: CreateHotelDto
  ): Promise<Hotel> {
    return this.hotelService.createHotel(user.userId, dto);
  }
}
```

#### 错误处理规范
- 使用具体的异常类型
- 提供有意义的错误信息
- 不暴露敏感的系统信息

```typescript
// 好的错误处理
if (!hotel) {
  throw new NotFoundException('指定的酒店不存在或已被删除');
}

if (hotel.merchantId !== user.userId) {
  throw new ForbiddenException('您没有权限操作此酒店');
}
```

#### 测试规范
- 每个Service方法编写单元测试
- Controller编写集成测试
- 使用测试数据库进行E2E测试
- 达到80%以上的代码覆盖率

```typescript
describe('HotelService', () => {
  let service: HotelService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HotelService, PrismaService],
    }).compile();

    service = module.get<HotelService>(HotelService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createHotel', () => {
    it('should create hotel successfully', async () => {
      // 测试实现
    });
  });
});
```