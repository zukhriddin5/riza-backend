import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Extends PrismaClient, so injecting PrismaService gives you `.product`, `.user`, etc.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set'); // fail fast
    const adapter = new PrismaPg({ connectionString }); // Prisma 7 driver adapter
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect(); // open the DB connection when the app starts
  }
  async onModuleDestroy() {
    await this.$disconnect(); // close it cleanly on shutdown
  }
}