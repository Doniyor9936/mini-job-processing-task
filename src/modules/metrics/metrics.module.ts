import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task])], // ✅ Metrics entity qo'shish kerak bo'lishi mumkin
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule { }
