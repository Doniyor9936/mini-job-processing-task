import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { QUEUE_NAME, DEAD_LETTER_QUEUE } from '../../common/constants/queue.constants';
import { TaskProcessor } from './task.processor';
import { RedisProvider } from '../../common/infrastructure/redis/redis.provider';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([Task]),                    // ✅ Task entity
    BullModule.registerQueue({ name: QUEUE_NAME }),      // ✅ tasks queue
    BullModule.registerQueue({ name: DEAD_LETTER_QUEUE }), // ✅ dlq
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskProcessor, RedisProvider],
  exports: [TasksService],
})
export class TasksModule { }