import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponse, UserWithRoles } from '@agendamiento/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        person: {
          include: {
            documentType: true,
            status: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokenPayload = {
      sub: Number(user.id),
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: this.configService.get<any>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'your-super-secret-refresh-key-change-in-production',
    );

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<any>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Guardar refresh token en Redis (7 días = 604800s)
    await this.redisService.set(`refresh_token:${user.id}`, refreshToken, 604800);

    const formattedUser: UserWithRoles = {
      id: Number(user.id),
      personId: Number(user.personId),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      person: {
        id: Number(user.person.id),
        documentTypeId: Number(user.person.documentTypeId),
        documentNumber: user.person.documentNumber,
        firstName: user.person.firstName,
        middleName: user.person.middleName,
        lastName: user.person.lastName,
        secondLastName: user.person.secondLastName,
        birthDate: user.person.birthDate ? user.person.birthDate.toISOString() : null,
        phone: user.person.phone,
        email: user.person.email,
        statusId: Number(user.person.statusId),
        createdAt: user.person.createdAt.toISOString(),
        updatedAt: user.person.updatedAt.toISOString(),
        documentType: {
          id: Number(user.person.documentType.id),
          name: user.person.documentType.name,
        },
        status: {
          id: Number(user.person.status.id),
          name: user.person.status.name,
        },
      },
      roles: user.userRoles.map((ur) => ({
        id: Number(ur.role.id),
        name: ur.role.name,
      })),
    };

    return {
      accessToken,
      refreshToken,
      user: formattedUser,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'your-super-secret-refresh-key-change-in-production',
      );

      const payload = this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });
      const storedToken = await this.redisService.get(`refresh_token:${payload.sub}`);

      if (!storedToken || storedToken !== dto.refreshToken) {
        throw new UnauthorizedException('Refresh token inválido o revocado');
      }

      const newTokenPayload = {
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles,
      };

      const accessToken = this.jwtService.sign(newTokenPayload, {
        expiresIn: this.configService.get<any>('JWT_ACCESS_EXPIRATION', '15m'),
      });

      const newRefreshToken = this.jwtService.sign(newTokenPayload, {
        secret: refreshSecret,
        expiresIn: this.configService.get<any>('JWT_REFRESH_EXPIRATION', '7d'),
      });

      await this.redisService.set(`refresh_token:${payload.sub}`, newRefreshToken, 604800);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(userId: number): Promise<void> {
    await this.redisService.del(`refresh_token:${userId}`);
  }

  async getMe(userId: number): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            documentType: true,
            status: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: Number(user.id),
      personId: Number(user.personId),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      person: {
        id: Number(user.person.id),
        documentTypeId: Number(user.person.documentTypeId),
        documentNumber: user.person.documentNumber,
        firstName: user.person.firstName,
        middleName: user.person.middleName,
        lastName: user.person.lastName,
        secondLastName: user.person.secondLastName,
        birthDate: user.person.birthDate ? user.person.birthDate.toISOString() : null,
        phone: user.person.phone,
        email: user.person.email,
        statusId: Number(user.person.statusId),
        createdAt: user.person.createdAt.toISOString(),
        updatedAt: user.person.updatedAt.toISOString(),
        documentType: {
          id: Number(user.person.documentType.id),
          name: user.person.documentType.name,
        },
        status: {
          id: Number(user.person.status.id),
          name: user.person.status.name,
        },
      },
      roles: user.userRoles.map((ur) => ({
        id: Number(ur.role.id),
        name: ur.role.name,
      })),
    };
  }
}
