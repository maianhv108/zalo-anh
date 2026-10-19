import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SESSION_SECRET', 'sales_zalo_local_secret_key_12345'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { team: true },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
    }

    return {
      id: user.id,
      code: user.code,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      teamId: user.teamId,
      teamName: user.team?.name || null,
      avatarUrl: user.avatarUrl,
      zaloAccountName: user.zaloAccountName,
      zaloPhone: user.zaloPhone,
    };
  }
}
