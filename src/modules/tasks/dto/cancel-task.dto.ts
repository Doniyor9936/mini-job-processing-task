import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CancelTaskDto {
    @ApiPropertyOptional({
        example: 'Endi kerak emas',
        description: 'Bekor qilish sababi',
    })
    @IsString()
    @IsOptional()
    reason?: string;
}