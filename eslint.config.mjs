// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintNestJs from '@darraghor/eslint-plugin-nestjs-typed';

export default tseslint.config(
  // 全局忽略配置
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '**/*.d.ts',
      'prisma/migrations/**',
      'eslint.config.mjs',
    ],
  },

  // 基础推荐配置
  eslint.configs.recommended,

  // TypeScript 推荐配置
  ...tseslint.configs.recommendedTypeChecked,

  // Prettier 集成
  eslintPluginPrettierRecommended,

  // NestJS 插件配置
  eslintNestJs.configs.flatRecommended,
  // 全局语言选项
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // TypeScript 文件专用配置
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript 规则微调 - 适配 NestJS 装饰器模式
      '@typescript-eslint/no-explicit-any': [
        'warn',
        {
          ignoreRestArgs: true,
          fixToUnknown: false,
        },
      ],

      // 降低严重程度以适应 NestJS 装饰器和依赖注入
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      // 提升代码质量的规则
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',

      // 未使用变量规则
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // NestJS 相关规则放宽
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // 控制器和DTO文件的特殊配置
  {
    files: ['**/*.controller.ts', '**/*.dto.ts'],
    rules: {
      '@darraghor/nestjs-typed/controllers-should-supply-api-tags': 'error',
      '@darraghor/nestjs-typed/api-property-returning-array-should-set-array':
        'error',
    },
  },

  // JavaScript 文件配置（禁用类型检查）
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      // JavaScript 专用规则
    },
  },

  // 测试文件特殊配置
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@darraghor/nestjs-typed/injectable-should-be-provided': 'off',
    },
  },
);
