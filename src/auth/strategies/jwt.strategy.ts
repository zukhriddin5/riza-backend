import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      // WHERE to find the token: pull it from the "Authorization: Bearer <token>" header.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens automatically.
      ignoreExpiration: false,
      // The SAME secret used to sign — that's how the signature is verified.
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  // Passport calls this ONLY after the token's signature is already verified as valid.
  // `payload` is exactly what you signed in login: { sub, email, role }.
  async validate(payload: { sub: string; email: string; role: string }) {
    // Re-fetch the user from the DB, so a deleted/changed user can't keep using an old token.
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException();

    // Whatever you RETURN here gets attached to the request as `request.user`.
    // findOne already strips the password, so this is safe to carry around.
    return user;
  }
}