import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'Foydalanuvchi email manzili',
    })
    @IsEmail({}, { message: 'Email must be valid' })
    email: string;

    @ApiProperty({
        example: 'StrongPass123!',
        description: 'Kamida 6 ta belgi, harf va raqam bo\'lishi kerak',
        minLength: 6,
        maxLength: 32,
    })
    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @MaxLength(32, { message: 'Password must be at most 32 characters' })
    password: string;
}