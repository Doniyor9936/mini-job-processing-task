import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Task } from '../tasks/entities/task.entity';


@Module({
  imports: [TypeOrmModule.forFeature([User, Task])],
  controllers: [],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule { }
