export const QUEUE_NAME = 'tasks';
export const DEAD_LETTER_QUEUE = 'tasks-dlq';

export const TASK_TYPE_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
    email: { max: 5, windowMs: 60_000 },
    report: { max: 2, windowMs: 60_000 },
    default: { max: 10, windowMs: 60_000 },
};

export const MAX_ATTEMPTS = 3;

export const PRIORITY_MAP: Record<string, number> = {
    high: 1,
    normal: 2,
    low: 3,
};