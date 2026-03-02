import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(dto.email);
        if (existingUser) throw new BadRequestException('Email already exists');

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = await this.usersService.create({
            email: dto.email,
            passwordHash,
            role: Role.USER,
        });

        const accessToken = this.generateJwtToken(user);

        return {
            accessToken,
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

        const accessToken = this.generateJwtToken(user);

        return {
            accessToken,
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    private generateJwtToken(user: User) {
        return this.jwtService.sign(
            { userId: user.id, role: user.role },
            { expiresIn: '30m' },
        );
    }
}