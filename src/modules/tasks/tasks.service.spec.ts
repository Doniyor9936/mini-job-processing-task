// tasks.service.spec.ts
import { TasksService } from './tasks.service';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { TaskPriority } from '../../common/enums/task-priority.enum';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';

describe('TasksService', () => {
    let service: TasksService;

    // Mock repository va queue
    const mockTaskRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            getCount: jest.fn(),
        })),
    };

    const mockQueue = {
        add: jest.fn(),
        getJobs: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TasksService(mockTaskRepository as any, mockQueue as any);
    });

    // ─── createTask ─────────────────────────────
    it('should create a new task and push to queue', async () => {
        const dto = {
            type: 'email',
            priority: TaskPriority.HIGH,
            payload: { to: 'user@example.com' },
            idempotencyKey: '123',
            // scheduledAt: null,
        };

        const user: User = {
            id: 'user-1',
            email: 'user@example.com',
            passwordHash: 'hash',
            role: Role.USER,
            isActive: true,
            tasks: [],
        };

        mockTaskRepository.findOne.mockResolvedValue(null);
        const fakeTask = { ...dto, userId: user.id, status: TaskStatus.PENDING, id: 'task-1' };
        mockTaskRepository.create.mockReturnValue(fakeTask);
        mockTaskRepository.save.mockResolvedValue(fakeTask);

        const task = await service.createTask(dto, user);

        expect(mockTaskRepository.findOne).toHaveBeenCalledWith({ where: { idempotencyKey: dto.idempotencyKey } });
        expect(mockTaskRepository.create).toHaveBeenCalled();
        expect(mockTaskRepository.save).toHaveBeenCalled();
        expect(mockQueue.add).toHaveBeenCalledWith(
            'task',
            { taskId: 'task-1' },
            expect.objectContaining({ attempts: 3 })
        );
        expect(task).toHaveProperty('id', 'task-1');
    });

    it('should return existing task if idempotency key exists', async () => {
        const existingTask = { id: 'task-1', status: TaskStatus.PENDING };
        mockTaskRepository.findOne.mockResolvedValue(existingTask);

        const user: User = {
            id: 'user-1',
            email: 'user@example.com',
            passwordHash: 'hash',
            role: Role.USER,
            isActive: true,
            tasks: [],
        };

        const task = await service.createTask({ idempotencyKey: '123', type: 'email' } as any, user as any);

        expect(task).toBe(existingTask);
        expect(mockTaskRepository.create).not.toHaveBeenCalled();
        expect(mockQueue.add).not.toHaveBeenCalled();
    });

    // ─── cancelTask ─────────────────────────────
    it('should cancel PENDING task', async () => {
        const task: Task = { id: 'task-1', userId: 'user-1', status: TaskStatus.PENDING } as any;

        const user: User = { id: 'user-1', email: 'a@b.com', passwordHash: 'x', role: Role.USER, isActive: true, tasks: [] };

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue({ ...task, status: TaskStatus.CANCELLED });
        mockQueue.getJobs.mockResolvedValue([{ data: { taskId: 'task-1' }, remove: jest.fn() }]);

        const result = await service.cancelTask('task-1', user);

        expect(result.status).toBe(TaskStatus.CANCELLED);
        expect(mockTaskRepository.save).toHaveBeenCalled();
        expect(mockQueue.getJobs).toHaveBeenCalledWith(['delayed', 'waiting']);
    });

    it('should throw if task not PENDING', async () => {
        const task: Task = { id: 'task-1', userId: 'user-1', status: TaskStatus.COMPLETED } as any;
        const user: User = { id: 'user-1', email: 'a@b.com', passwordHash: 'x', role: Role.USER, isActive: true, tasks: [] };

        mockTaskRepository.findOne.mockResolvedValue(task);

        await expect(service.cancelTask('task-1', user)).rejects.toThrow(BadRequestException);
    });

    // ─── retryTask ─────────────────────────────
    it('should retry FAILED task for ADMIN', async () => {
        const task: Task = { id: 'task-1', status: TaskStatus.FAILED, priority: TaskPriority.NORMAL } as any;
        const user: User = { id: 'admin-1', email: 'a@b.com', passwordHash: 'x', role: Role.ADMIN, isActive: true, tasks: [] };

        mockTaskRepository.findOne.mockResolvedValue(task);
        mockTaskRepository.save.mockResolvedValue({ ...task, status: TaskStatus.PENDING });

        const result = await service.retryTask('task-1', user);

        expect(result.status).toBe(TaskStatus.PENDING);
        expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should throw if non-ADMIN tries retry', async () => {
        const task: Task = { id: 'task-1', status: TaskStatus.FAILED, priority: TaskPriority.NORMAL } as any;
        const user: User = { id: 'user-1', email: 'a@b.com', passwordHash: 'x', role: Role.USER, isActive: true, tasks: [] };

        mockTaskRepository.findOne.mockResolvedValue(task);

        await expect(service.retryTask('task-1', user)).rejects.toThrow(ForbiddenException);
    });
});