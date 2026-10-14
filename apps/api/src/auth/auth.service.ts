import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { team: true },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Ghi AuditLog đăng nhập thành công
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.LOGIN,
        resource: 'AUTH',
        resourceId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
        ipAddress: ipAddress || '127.0.0.1',
      },
    });

    return {
      accessToken,
      user: {
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
      },
    };
  }

  async logout(userId: string, ipAddress?: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOGOUT,
        resource: 'AUTH',
        resourceId: userId,
        ipAddress: ipAddress || '127.0.0.1',
      },
    });
    return { success: true, message: 'Đăng xuất thành công.' };
  }
}
