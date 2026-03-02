import { Role } from '../../../common/enums/role.enum';
import { Task } from '../../../modules/tasks/entities/task.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';


@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column({ type: 'enum', enum: Role })
    role: Role;

    @Column({ default: true })
    isActive: boolean;

    @OneToMany(() => Task, (task) => task.user)
    tasks: Task[];
}