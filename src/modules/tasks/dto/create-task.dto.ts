import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString, IsEnum, IsOptional, IsObject, IsDateString,
} from 'class-validator';
import { TaskPriority } from '../../../common/enums/task-priority.enum';

export class CreateTaskDto {
    @ApiProperty({ example: 'email', description: 'Task turi' })
    @IsString()
    type: string;

    @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NORMAL })
    @IsEnum(TaskPriority)
    @IsOptional()
    priority?: TaskPriority = TaskPriority.NORMAL;

    @ApiPropertyOptional({
        example: { to: 'user@example.com', subject: 'Hello' },
        description: 'Task ma\'lumotlari',
    })
    @IsObject()
    @IsOptional()
    payload?: Record<string, any> = {};

    @ApiProperty({
        example: 'unique-key-abc-123',
        description: 'Takroriy task yaratilishini oldini olish uchun unique kalit',
    })
    @IsString()
    idempotencyKey: string;

    @ApiPropertyOptional({
        example: '2026-03-02T15:00:00Z',
        description: 'Kechiktirilgan vazifa vaqti (ISO 8601)',
    })
    @IsDateString()
    @IsOptional()
    scheduledAt?: string;
}