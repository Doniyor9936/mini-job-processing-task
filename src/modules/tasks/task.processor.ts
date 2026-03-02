import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { Task } from './entities/task.entity';
import { TaskStatus } from '../../common/enums/task-status.enum';
import { QUEUE_NAME, DEAD_LETTER_QUEUE, MAX_ATTEMPTS } from '../../common/constants/queue.constants';

@Processor(QUEUE_NAME, { concurrency: 5 })
export class TaskProcessor extends WorkerHost {
    private readonly logger = new Logger(TaskProcessor.name);

    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        @InjectQueue(DEAD_LETTER_QUEUE)
        private readonly dlq: Queue,
    ) {
        super();
    }

    // ─── ASOSIY LOGIKA ───────────────────────────────────────────────────────────

    async process(job: Job<{ taskId: string }>): Promise<void> {
        const { taskId } = job.data;

        // 1. PENDING → PROCESSING (atomic update, concurrency safe)
        const updateResult = await this.taskRepository.update(
            { id: taskId, status: TaskStatus.PENDING },
            { status: TaskStatus.PROCESSING, startedAt: new Date() },
        );

        // Agar affected = 0 → task allaqachon boshqa worker tomonidan olingan
        if (updateResult.affected === 0) {
            this.logger.warn(`Task ${taskId} already being processed or not in PENDING state — skipping`);
            return;
        }

        this.logger.log(`Task ${taskId} started (attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS})`);

        // 2. Ish simulatsiyasi: 2–5 sekund
        const workDuration = 2000 + Math.random() * 3000;
        await this.sleep(workDuration);

        // 3. ~25% muvaffaqiyatsizlik simulatsiyasi
        const shouldFail = Math.random() < 0.25;
        if (shouldFail) {
            throw new Error(`Simulated processing failure for task ${taskId}`);
        }

        // 4. Muvaffaqiyatli yakunlash
        await this.taskRepository.update(taskId, {
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
            attempts: job.attemptsMade + 1,
            lastError: null,
        });

        this.logger.log(
            `Task ${taskId} COMPLETED in ${workDuration.toFixed(0)}ms (attempt ${job.attemptsMade + 1})`,
        );
    }

    // ─── MUVAFFAQIYATSIZLIK HODISASI ─────────────────────────────────────────────

    @OnWorkerEvent('failed')
    async onFailed(job: Job<{ taskId: string }>, error: Error): Promise<void> {
        const { taskId } = job.data;
        const attemptsMade = job.attemptsMade;
        const isLastAttempt = attemptsMade >= MAX_ATTEMPTS;

        this.logger.warn(
            `Task ${taskId} FAILED on attempt ${attemptsMade}/${MAX_ATTEMPTS}: ${error.message}`,
        );

        if (isLastAttempt) {
            // Barcha urinishlar tugadi → FAILED + DLQ
            this.logger.error(`Task ${taskId} permanently FAILED after ${attemptsMade} attempts`);

            await this.taskRepository.update(taskId, {
                status: TaskStatus.FAILED,
                attempts: attemptsMade,
                lastError: error.message,
            });

            // Dead Letter Queue ga yuborish
            await this.dlq.add(
                'dead-letter',
                {
                    taskId,
                    error: error.message,
                    attempts: attemptsMade,
                    failedAt: new Date().toISOString(),
                },
                { removeOnComplete: true },
            );
        } else {
            // Keyingi retry uchun PENDING ga qaytarish
            await this.taskRepository.update(
                { id: taskId, status: TaskStatus.PROCESSING },
                {
                    status: TaskStatus.PENDING,
                    attempts: attemptsMade,
                    lastError: error.message,
                },
            );

            this.logger.log(
                `Task ${taskId} will be retried (attempt ${attemptsMade + 1}/${MAX_ATTEMPTS})`,
            );
        }
    }

    // ─── BOSHQA HODISALAR ────────────────────────────────────────────────────────

    @OnWorkerEvent('active')
    onActive(job: Job<{ taskId: string }>): void {
        this.logger.debug(`Job ${job.id} (taskId: ${job.data.taskId}) is now active`);
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<{ taskId: string }>): void {
        this.logger.debug(`Job ${job.id} (taskId: ${job.data.taskId}) completed successfully`);
    }

    // ─── YORDAMCHI ───────────────────────────────────────────────────────────────

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

