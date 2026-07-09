import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Prisma, Role } from 'generated/prisma/client';

// How many "rounds" bcrypt works — higher = slower = harder to crack. 10 is the
// sensible default balancing security and login speed.
const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // 1) Reject duplicate emails with a clean 409, rather than letting the DB
    //    throw a cryptic unique-constraint error.
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    // 2) Hash the password. We NEVER store the plain text — only this hash.
    //    bcrypt also embeds a random "salt" in the hash automatically, so two
    //    users with the same password still get different hashes.
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 3) Save the user with the hash swapped in for the raw password.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
    });

    // 4) CRITICAL: strip the password hash out of anything we return to the client.
    //    This helper (below) guarantees the hash never leaves the server.
    return this.excludePassword(user);
  }

  // Admin-only: create another ADMIN account. Same flow as create(), but the
  // role is forced to ADMIN here on the server — the client can't set roles.
  async createAdmin(dto: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    return this.excludePassword(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.excludePassword(u));
  }

  // Hash and set a new password for an existing user (used by password reset).
  async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  // Admin-only: list every admin account (passwords stripped).
  async findAdmins() {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'asc' },
    });
    return admins.map((u) => this.excludePassword(u));
  }

  // Admin-only: edit an admin. Any subset of email/name/password. A new password
  // is re-hashed. Email must stay unique. Target must actually be an admin.
  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== Role.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email && dto.email !== target.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (clash) throw new ConflictException('Email already in use');
      data.email = dto.email;
    }
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.excludePassword(updated);
  }

  // Admin-only: delete an admin. Guards: can't delete yourself, can't remove the
  // last admin, and an admin with related orders can't be hard-deleted (FK).
  async removeAdmin(id: string, requesterId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== Role.ADMIN) {
      throw new NotFoundException('Admin not found');
    }
    if (id === requesterId) {
      throw new BadRequestException("You can't delete your own account");
    }

    const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) {
      throw new BadRequestException('Cannot delete the last admin');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      // P2003 = foreign-key violation (this user still has orders/addresses).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('This admin has related orders and cannot be deleted');
      }
      throw e;
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.excludePassword(user);
  }

  // Used by the login flow (next phase) — returns the FULL user, hash included,
  // because auth needs to compare passwords. Kept separate on purpose.
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // A small reusable helper. `user` is Prisma's generated User type; we peel off
  // `password` and return the rest. This is TypeScript's rest-destructuring:
  //   `password` captures that field, `rest` captures everything else.
  private excludePassword<T extends { password: string }>(user: T) {
    const { password, ...rest } = user;
    return rest;
  }
}