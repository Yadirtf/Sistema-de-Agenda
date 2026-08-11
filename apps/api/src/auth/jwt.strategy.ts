import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '@agendamiento/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-super-secret-jwt-key-change-in-production',
      ),
    });
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }
    return payload;
  }
}
