import { getRandomValues } from 'expo-crypto';
import { uuidv7 } from 'uuidv7';

// Hermes has no global crypto, and uuidv7 reads it when generating.
const scope = globalThis as { crypto?: unknown };
scope.crypto ??= { getRandomValues };

export const newId = () => uuidv7();
