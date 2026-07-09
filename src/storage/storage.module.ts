import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Exported so any module (uploads now, others later) can inject StorageService.
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
