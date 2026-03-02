import { BullRootModuleOptions } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullConfig = (configService: ConfigService): BullRootModuleOptions => ({
    connection: {
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        password: configService.get('redis.password'),
        maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: false,
    },
});