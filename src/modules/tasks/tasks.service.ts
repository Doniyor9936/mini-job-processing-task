import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task } from './entities/task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { TaskPriority } from '../../common/enums/task-priority.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { QUEUE_NAME } from '../../common/constants/queue.constants';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectQueue(QUEUE_NAME)
        private readonly taskQueue: Queue,
    ) { }

    // ─── Task yaratish ──────────────────────────────────────────────────────────
    async createTask(dto: CreateTaskDto, user: User): Promise<Task> {
        // 1. Idempotency tekshiruvi
        const existing = await this.taskRepository.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
        if (existing) return existing;

        // 2. Task yaratish
        const task = this.taskRepository.create({
            userId: user.id,
            type: dto.type,
            priority: dto.priority || TaskPriority.NORMAL,
            payload: dto.payload || {},
            idempotencyKey: dto.idempotencyKey,
            status: TaskStatus.PENDING,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        });
        await this.taskRepository.save(task);

        // 3. BullMQ queue ga push qilish
        const delay = task.scheduledAt ? Math.max(0, task.scheduledAt.getTime() - Date.now()) : 0;
        await this.taskQueue.add(
            'task',
            { taskId: task.id },
            {
                priority: this.mapPriority(task.priority),
                delay,
                attempts: 3,               // MAX_ATTEMPTS
                removeOnComplete: true,
                backoff: { type: 'exponential', delay: 1000 },
            },
        );

        return task;
    }

    // ─── Task listlash ─────────────────────────────────────────────────────────
    async listTasks(filter: FilterTaskDto, user: User): Promise<{ data: Task[]; total: number }> {
        const query = this.taskRepository.createQueryBuilder('task');

        // ADMIN bo‘lmasa faqat o‘z tasklarini ko‘rsatadi
        if (user.role !== 'ADMIN') {
            query.andWhere('task.userId = :userId', { userId: user.id });
        }

        if (filter.status) query.andWhere('task.status = :status', { status: filter.status });
        if (filter.type) query.andWhere('task.type = :type', { type: filter.type });
        if (filter.from) query.andWhere('task.createdAt >= :from', { from: filter.from });
        if (filter.to) query.andWhere('task.createdAt <= :to', { to: filter.to });

        const total = await query.getCount();

        // provide defaults for pagination parameters
        const page = filter.page ?? 1;
        const limit = filter.limit ?? 10;

        const data = await query
            .orderBy('task.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        return { data, total };
    }

    // ─── Task bekor qilish ──────────────────────────────────────────────────────
    async cancelTask(taskId: string, user: User): Promise<Task> {
        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        if (task.status !== TaskStatus.PENDING) {
            throw new BadRequestException('Only PENDING tasks can be cancelled');
        }

        // USER faqat o‘z tasklarini bekor qilishi mumkin
        if (user.role !== 'ADMIN' && task.userId !== user.id) {
            throw new ForbiddenException('Cannot cancel this task');
        }

        // Task statusini CANCELLED ga o‘zgartirish
        task.status = TaskStatus.CANCELLED;
        await this.taskRepository.save(task);

        // Queue dan olib tashlash (agar kerak bo‘lsa)
        const jobs = await this.taskQueue.getJobs(['delayed', 'waiting']);
        const job = jobs.find(j => j.data.taskId === taskId);
        if (job) await job.remove();

        return task;
    }

    // ─── Retry (ADMIN uchun FAILED tasklarni qayta ishlash) ────────────────
    async retryTask(taskId: string, user: User): Promise<Task> {
        if (user.role !== 'ADMIN') throw new ForbiddenException('Only ADMIN can retry tasks');

        const task = await this.taskRepository.findOne({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        if (task.status !== TaskStatus.FAILED) throw new BadRequestException('Only FAILED tasks can be retried');

        task.status = TaskStatus.PENDING;
        task.lastError = null;
        await this.taskRepository.save(task);

        // Queue ga push qilish
        await this.taskQueue.add(
            'task',
            { taskId: task.id },
            {
                priority: this.mapPriority(task.priority),
                attempts: 3,
                removeOnComplete: true,
                backoff: { type: 'exponential', delay: 1000 },
            },
        );

        return task;
    }

    // ─── Priority mapping ──────────────────────────────────────────────────────
    private mapPriority(priority: TaskPriority): number {
        switch (priority) {
            case TaskPriority.HIGH: return 1;
            case TaskPriority.NORMAL: return 5;
            case TaskPriority.LOW: return 10;
            default: return 5;
        }
    }
}