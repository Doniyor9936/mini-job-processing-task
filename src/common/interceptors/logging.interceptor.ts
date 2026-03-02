import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest<Request>();
        const method = req.method;
        const url = req.url;

        const now = Date.now();
        this.logger.log(`Incoming request: ${method} ${url}`);

        return next.handle().pipe(
            tap(() => {
                const elapsed = Date.now() - now;
                this.logger.log(`Request completed: ${method} ${url} - ${elapsed}ms`);
            }),
        );
    }
}