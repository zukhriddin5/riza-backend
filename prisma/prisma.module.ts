import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() = register once, inject anywhere. exports = makes it injectable in other modules.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}