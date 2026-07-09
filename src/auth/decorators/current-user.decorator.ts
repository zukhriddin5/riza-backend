import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// A custom parameter decorator. It reads request.user (put there by the strategy)
// so your controllers can write @CurrentUser() instead of digging into the raw request.
// This is reusable across EVERY protected route — write once, use everywhere.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);