import { and, asc, between, eq, inArray, isNull } from 'drizzle-orm';

import type { LocalDate } from '@/engine/types';
import type { EventBus } from '@/events/bus';
import { newId } from '@/lib/ids';

import { cardioSessions, workoutExercises, workouts, workoutSets, type SetType } from '../schema';
import type { Db } from '../types';
import { newRow, softDeleted, tzOffsetAt } from './shared';

const MIN_COUNTED_S = 600;

export type SetInput = {
  setType: SetType;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  durationS?: number;
  distanceM?: number;
  completedAt?: number;
};

type SaveInput = {
  name: string;
  startedAt: number;
  endedAt: number;
  localDate: LocalDate;
  routineId?: string;
  notes?: string;
  exercises: { exerciseId: string; supersetGroup?: number; sets: SetInput[] }[];
};

const volumeKg = (sets: SetInput[]) =>
  sets
    .filter((set) => set.setType !== 'warmup')
    .reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);

// A workout counts with at least one completed set, or 10 minutes when every set is timed.
function isCounted(sets: SetInput[]) {
  if (sets.length === 0) return false;
  if (sets.some((set) => set.durationS === undefined)) return true;
  return sets.reduce((sum, set) => sum + (set.durationS ?? 0), 0) >= MIN_COUNTED_S;
}

export function createWorkoutsRepo(db: Db, bus: EventBus) {
  return {
    // Called when a workout is finished. Until then it lives in the active-workout store.
    saveFinished({ exercises, ...workout }: SaveInput) {
      const id = newId();
      const completed = exercises.flatMap((e) => e.sets).filter((set) => set.completedAt);

      db.transaction((tx) => {
        tx.insert(workouts)
          .values({
            ...workout,
            ...newRow(),
            id,
            tzOffsetMin: tzOffsetAt(workout.startedAt),
            durationS: Math.round((workout.endedAt - workout.startedAt) / 1000),
            totalVolumeKg: volumeKg(completed),
            counted: isCounted(completed),
          })
          .run();

        exercises.forEach(({ sets, ...exercise }, order) => {
          const workoutExerciseId = newId();
          tx.insert(workoutExercises)
            .values({ ...exercise, ...newRow(), id: workoutExerciseId, workoutId: id, order })
            .run();
          if (sets.length > 0) {
            tx.insert(workoutSets)
              .values(
                sets.map((set, setOrder) => ({
                  ...set,
                  ...newRow(),
                  id: newId(),
                  workoutExerciseId,
                  order: setOrder,
                })),
              )
              .run();
          }
        });
      });

      bus.emit({ type: 'workout.finished', id, localDate: workout.localDate });
      return { id };
    },

    softDelete(id: string) {
      const row = db
        .update(workouts)
        .set(softDeleted())
        .where(eq(workouts.id, id))
        .returning({ localDate: workouts.localDate })
        .get();
      if (row) bus.emit({ type: 'workout.deleted', id, localDate: row.localDate });
    },

    get(id: string) {
      return db
        .select()
        .from(workouts)
        .where(and(eq(workouts.id, id), isNull(workouts.deletedAt)))
        .get();
    },

    setsFor(workoutId: string) {
      const exerciseIds = db
        .select({ id: workoutExercises.id })
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, workoutId))
        .all()
        .map((row) => row.id);
      return db
        .select()
        .from(workoutSets)
        .where(
          and(inArray(workoutSets.workoutExerciseId, exerciseIds), isNull(workoutSets.deletedAt)),
        )
        .orderBy(asc(workoutSets.workoutExerciseId), asc(workoutSets.order))
        .all();
    },

    // Days with a counted workout or cardio session, which is what the weekly goal measures.
    countedDays(from: LocalDate, to: LocalDate) {
      const lifting = db
        .select({ localDate: workouts.localDate })
        .from(workouts)
        .where(
          and(
            between(workouts.localDate, from, to),
            eq(workouts.counted, true),
            isNull(workouts.deletedAt),
          ),
        )
        .all();
      const cardio = db
        .select({ localDate: cardioSessions.localDate })
        .from(cardioSessions)
        .where(
          and(
            between(cardioSessions.localDate, from, to),
            eq(cardioSessions.counted, true),
            isNull(cardioSessions.deletedAt),
          ),
        )
        .all();
      return new Set([...lifting, ...cardio].map((row) => row.localDate)).size;
    },
  };
}
