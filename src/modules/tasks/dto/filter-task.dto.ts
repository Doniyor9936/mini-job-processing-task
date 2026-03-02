import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../../common/enums/task-status.enum';

export class FilterTaskDto {
    @ApiPropertyOptional({ enum: TaskStatus, example: TaskStatus.PENDING })
    @IsEnum(TaskStatus)
    @IsOptional()
    status?: TaskStatus;

    @ApiPropertyOptional({ example: 'email' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Boshlanish sanasi' })
    @IsDateString()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Tugash sanasi' })
    @IsDateString()
    @IsOptional()
    to?: string;

    @ApiPropertyOptional({ default: 1, example: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ default: 20, example: 20 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number = 20;
}