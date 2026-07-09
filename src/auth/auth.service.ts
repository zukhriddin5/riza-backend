import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    // Inject the users service (to find the user) and the JWT service (to sign tokens).
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 1) Find the user by email. We use findByEmail (the method that returns the
    //    FULL user including the password hash) because we need to compare passwords.
    const user = await this.usersService.findByEmail(dto.email);

    // 2) If no user, OR the password doesn't match, reject with the SAME error.
    //    Security detail: we deliberately DON'T say which one was wrong. Telling an
    //    attacker "that email exists but wrong password" leaks who has accounts.
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3) Build the token PAYLOAD — the data baked into the token. Keep it small and
    //    non-sensitive: an id, the email, the role. NEVER put the password in here.
    //    `sub` (subject) is the JWT convention for "who this token belongs to".
    const payload = { sub: user.id, email: user.email, role: user.role };

    // 4) Sign the payload into a token string and return it.
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  // "Forgot password": look up the account by its identifier (phone/email) and
  // set a new password. ⚠️ No verification code — anyone who knows the phone can
  // reset it. Add an SMS/email code step here before production traffic.
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('No account found with that phone number');
    }
    await this.usersService.updatePassword(user.id, dto.password);
    return { success: true };
  }
}