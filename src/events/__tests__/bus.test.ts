import { createEventBus } from '../bus';

const event = { type: 'food.logged', id: 'a', localDate: '2026-11-01' } as const;

describe('event bus', () => {
  it('delivers an event to handlers of that type only', () => {
    const bus = createEventBus();
    const food = jest.fn();
    const weight = jest.fn();
    bus.on('food.logged', food);
    bus.on('weighin.saved', weight);
    bus.emit(event);
    expect(food).toHaveBeenCalledWith(event);
    expect(weight).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribing', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    const off = bus.on('food.logged', handler);
    off();
    bus.emit(event);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps going when a handler throws, and reports the error', () => {
    const onError = jest.fn();
    const bus = createEventBus(onError);
    const after = jest.fn();
    const failure = new Error('boom');
    bus.on('food.logged', () => {
      throw failure;
    });
    bus.on('food.logged', after);
    bus.emit(event);
    expect(after).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(failure, event);
  });

  it('delivers every event to onAny handlers', () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.onAny(handler);
    bus.emit(event);
    bus.emit({ type: 'day.completed', localDate: '2026-11-01' });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
