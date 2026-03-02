import { Controller, Post, Get, Body, Query, Param, Req, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { Task } from './entities/task.entity';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';


@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  @ApiOperation({ summary: 'Yangi task yaratish' })
  @ApiResponse({ status: 201, description: 'Task yaratildi', type: Task })
  async createTask(@Body() dto: CreateTaskDto, @Req() req: Request & { user: User }) {
    return this.tasksService.createTask(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Tasklarni filter bilan listlash' })
  @ApiResponse({ status: 200, description: 'Tasklar ro‘yxati', type: [Task] })
  async listTasks(@Query() filter: FilterTaskDto, @Req() req: Request & { user: User }) {
    return this.tasksService.listTasks(filter, req.user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'PENDING taskni bekor qilish' })
  @ApiResponse({ status: 200, description: 'Task bekor qilindi', type: Task })
  async cancelTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.tasksService.cancelTask(id, req.user);
  }

  @Post(':id/retry')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'FAILED taskni qayta ishlash (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Task retry qilindi', type: Task })
  async retryTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: User },
  ) {
    return this.tasksService.retryTask(id, req.user);
  }
}