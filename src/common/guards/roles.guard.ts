import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) return true; // role belgilangan bo‘lmasa, ruxsat beriladi

        const { user } = context.switchToHttp().getRequest();
        if (!user) return false; // JWT auth tekshiradi, user bo‘lmasa kirish mumkin emas

        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenException('Insufficient role');
        }

        return true;
    }
}