import {
  Controller,
  Request,
  Body,
  UseGuards,
  Post,
  Get,
} from '@nestjs/common';
import { LocalAuthGuard } from './guards/local-auth.guards';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { CredentialsDto } from './dto/credentials.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials: CredentialsDto): Promise<any> {
    return await this.authService.login(credentials);
  }

  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  async whoami(@Request() req: any): Promise<any> {
    const { password, ...user } = req.user;
    console.log(user);
    return user;
  }
}