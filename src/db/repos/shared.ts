export const newRow = (now = Date.now()) => ({ createdAt: now, updatedAt: now });

export const softDeleted = (now = Date.now()) => ({ deletedAt: now, updatedAt: now });

export const tzOffsetAt = (ms: number) => new Date(ms).getTimezoneOffset();
