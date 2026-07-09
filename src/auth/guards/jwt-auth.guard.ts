import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// A guard decides: does this request get to proceed? This one delegates to the
// 'jwt' strategy above. Slap it on any route to require a valid token.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}