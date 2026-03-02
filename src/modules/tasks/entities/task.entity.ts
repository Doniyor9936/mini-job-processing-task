import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne,
    JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TaskPriority } from '../../../common/enums/task-priority.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, (user) => user.tasks)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    type: string;

    @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
    priority: TaskPriority;

    @Column({ type: 'jsonb', nullable: true })
    payload: any;

    @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
    status: TaskStatus;

    // ─── PROCESSOR UCHUN KERAKLI FIELDLAR ──────────────────────

    @Index({ unique: true })
    @Column({ name: 'idempotency_key', unique: true })
    idempotencyKey: string;                // takroriy task yaratishni oldini olish

    @Column({ default: 0 })
    attempts: number;                      // necha marta urinildi

    @Column({ name: 'last_error', type: 'text', nullable: true })
    lastError: string | null;             // oxirgi xato xabari

    @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
    scheduledAt: Date | null;             // kechiktirilgan vazifa vaqti

    @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
    startedAt: Date | null;               // PROCESSING boshlangan vaqt

    @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
    completedAt: Date | null;             // COMPLETED bo'lgan vaqt

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}