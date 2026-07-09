import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { StatsModule } from './stats/stats.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [PrismaModule, ProductsModule, UsersModule, AuthModule, CategoriesModule, OrdersModule, StatsModule, UploadsModule],  // ← PrismaModule here
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}