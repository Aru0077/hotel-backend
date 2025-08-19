// src/user/user.module.ts
import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserValidationService } from './services/user-validation.service';
import { UserCreationService } from './services/user-creation.service';

@Global()
@Module({
  providers: [UserService, UserValidationService, UserCreationService],
  exports: [UserService, UserValidationService, UserCreationService],
})
export class UserModule {}
