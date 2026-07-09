import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'generated/prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector reads the metadata that @Roles() attached to the route.
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // What roles does this route require? (from @Roles(...))
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // method-level @Roles
      context.getClass(), // class-level @Roles
    ]);

    // No @Roles on the route → no role restriction → allow.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // request.user was set by JwtAuthGuard (which must run BEFORE this guard).
    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Admins only');
    }
    return true;
  }
}
