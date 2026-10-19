import { Controller, Post, Body, Get, UseGuards, Req, Ip, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

export const Public = () => SetMetadata('isPublic', true);

@ApiTags('Xác thực (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT access token và thông tin user' })
  @ApiResponse({ status: 401, description: 'Sai email, mật khẩu hoặc tài khoản bị vô hiệu hóa' })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' })
  async logout(@CurrentUser('id') userId: string, @Ip() ip: string) {
    return this.authService.logout(userId, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại đang đăng nhập' })
  async me(@CurrentUser() user: any) {
    return user;
  }
}
