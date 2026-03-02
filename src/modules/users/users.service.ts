import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Task) private readonly taskRepository: Repository<Task>) { }

    async create(data: Partial<User>): Promise<User> {
        const existingUser = await this.userRepository.findOne({ where: { email: data.email } });
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }
        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async getUserTasks(userId: string): Promise<Task[]> {
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['tasks'] });
        return user ? user.tasks : [];
    }

    async getUserWithTasks(userId: string, isAdmin: boolean): Promise<User & { tasks: Task[] }> {
        if (isAdmin) {
            const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['tasks'] });
            if (!user) throw new NotFoundException('User not found');
            return user;
        } else {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) throw new NotFoundException('User not found');

            const tasks = await this.taskRepository.find({ where: { userId: user.id } });
            return { ...user, tasks };
        }
    }

    async getAllUsersWithTasks(): Promise<(User & { tasks: Task[] })[]> {
        return this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.tasks', 'task')
            .getMany();
    }
}
