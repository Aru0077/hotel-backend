// src/common/pipes/validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';

@Injectable()
export class TypeSafeValidationPipe implements PipeTransform<unknown, unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // 确保value是对象类型
    if (!this.isPlainObject(value)) {
      throw new BadRequestException('请求体必须是有效的JSON对象');
    }

    // 使用正确的plainToInstance签名
    const object = plainToInstance(
      metatype as ClassConstructor<object>,
      value,
      {
        enableImplicitConversion: true,
        // 注意：这里移除了不存在的选项
        excludeExtraneousValues: false,
      },
    );

    const errors = await validate(object, {
      whitelist: true, // validation选项，不是transform选项
      forbidNonWhitelisted: true, // validation选项，不是transform选项
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors.map((error) =>
        Object.values(error.constraints ?? {}).join(', '),
      );
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return object;
  }

  private toValidate(metatype: Type<unknown>): boolean {
    const types: Type<unknown>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }
}
