import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'member' | 'creator';
  creatorId: string;
  isOnboarded: boolean | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    // console.log(
    //   '🔑 JWT Strategy initialized with secret:',
    //   jwtSecret.substring(0, 10) + '...',
    // );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload) {
    // console.log('🔍 JWT Strategy validate called with payload:', payload);

    if (!payload.sub) {
      // console.log('❌ JWT validation failed: no sub in payload');
      throw new UnauthorizedException('Invalid token');
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      creatorId: payload.creatorId,
      isOnboarded: payload.isOnboarded,
    };
    return user;
  }
}
