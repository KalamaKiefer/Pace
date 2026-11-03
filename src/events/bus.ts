import type { LocalDate } from '@/engine/types';

type Logged = { id: string; localDate: LocalDate };

export type DomainEvent =
  | ({ type: 'weighin.saved' } & Logged)
  | ({ type: 'weighin.deleted' } & Logged)
  | { type: 'measurement.saved'; ids: string[]; localDate: LocalDate }
  | ({ type: 'food.logged' } & Logged)
  | ({ type: 'food.deleted' } & Logged)
  | { type: 'day.completed'; localDate: LocalDate }
  | ({ type: 'workout.finished' } & Logged)
  | ({ type: 'workout.deleted' } & Logged)
  | ({ type: 'cardio.saved' } & Logged)
  | ({ type: 'cardio.deleted' } & Logged)
  | { type: 'steps.synced'; localDate: LocalDate }
  | { type: 'day.rollover'; localDate: LocalDate }
  | { type: 'sync.pulled' };

type EventOf<T extends DomainEvent['type']> = Extract<DomainEvent, { type: T }>;
type ErrorHandler = (error: unknown, event: DomainEvent) => void;

export type EventBus = ReturnType<typeof createEventBus>;

// A failing side effect must never undo or block the write that triggered it.
export function createEventBus(onError: ErrorHandler = (error) => console.error(error)) {
  const handlers = new Map<DomainEvent['type'], Set<(event: DomainEvent) => void>>();
  const anyHandlers = new Set<(event: DomainEvent) => void>();

  return {
    on<T extends DomainEvent['type']>(type: T, handler: (event: EventOf<T>) => void) {
      const set = handlers.get(type) ?? new Set();
      handlers.set(type, set);
      const wrapped = handler as (event: DomainEvent) => void;
      set.add(wrapped);
      return () => set.delete(wrapped);
    },
    onAny(handler: (event: DomainEvent) => void) {
      anyHandlers.add(handler);
      return () => anyHandlers.delete(handler);
    },
    emit(event: DomainEvent) {
      for (const handler of [...(handlers.get(event.type) ?? []), ...anyHandlers]) {
        try {
          handler(event);
        } catch (error) {
          onError(error, event);
        }
      }
    },
  };
}
