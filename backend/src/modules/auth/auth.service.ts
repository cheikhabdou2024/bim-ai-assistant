import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { generateSecureToken, sha256Hash } from '../../common/utils/token.utils';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const rounds = this.configService.get<number>('bcryptRounds') ?? 12;
    const hashedPassword = await bcrypt.hash(dto.password, rounds) as string;
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    // Constant-time comparison to prevent timing attacks
    const dummyHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
    const passwordMatch = await bcrypt.compare(
      dto.password,
      user?.password ?? dummyHash,
    );
    if (!user || !passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
  }

  async refresh(rawToken: string) {
    const tokenHash = sha256Hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revoked) {
      // Reuse detection — revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
      await this.redis.del(`rt:${stored.userId}`);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Redis coherence check
    const redisHash = await this.redis.get(`rt:${stored.userId}`);
    if (redisHash !== tokenHash) throw new UnauthorizedException('Session expired');

    // Revoke old token
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException();

    const accessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, rawToken: string) {
    const tokenHash = sha256Hash(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { revoked: true },
    });
    await this.redis.del(`rt:${userId}`);
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email, jti: generateSecureToken().slice(0, 16) });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = generateSecureToken();
    const tokenHash = sha256Hash(token);
    const expiresInDays = this.configService.get<number>('jwt.refreshExpiresInDays') ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    const ttlSeconds = expiresInDays * 24 * 60 * 60;
    await this.redis.set(`rt:${userId}`, tokenHash, 'EX', ttlSeconds);

    return token;
  }
}
