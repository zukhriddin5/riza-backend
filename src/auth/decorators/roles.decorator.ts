import { SetMetadata } from '@nestjs/common';
import { Role } from 'generated/prisma/client';

// Attaches allowed roles as metadata on a route. The guard reads this back.
// Usage: @Roles('ADMIN')
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
