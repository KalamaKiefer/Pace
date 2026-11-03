CREATE TABLE `food_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`meal_slot` text NOT NULL,
	`food_ref` text NOT NULL,
	`name_snapshot` text NOT NULL,
	`serving_label` text NOT NULL,
	`serving_grams` real NOT NULL,
	`quantity` real NOT NULL,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`fiber_g` real,
	`logged_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `food_logs_date_slot_idx` ON `food_logs` (`local_date`,`meal_slot`);--> statement-breakpoint
CREATE INDEX `food_logs_food_ref_idx` ON `food_logs` (`food_ref`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text,
	`barcode` text,
	`name` text NOT NULL,
	`brand` text,
	`base_grams` real NOT NULL,
	`kcal` real NOT NULL,
	`protein_g` real NOT NULL,
	`carbs_g` real NOT NULL,
	`fat_g` real NOT NULL,
	`fiber_g` real,
	`sugar_g` real,
	`sodium_mg` real,
	`servings` text NOT NULL,
	`quality_flag` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foods_source_idx` ON `foods` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `foods_barcode_idx` ON `foods` (`barcode`);--> statement-breakpoint
CREATE TABLE `daily_targets` (
	`local_date` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`kcal` integer NOT NULL,
	`protein_g` integer NOT NULL,
	`carbs_g` integer NOT NULL,
	`fat_g` integer NOT NULL,
	`fiber_g` integer NOT NULL,
	`step_goal` integer NOT NULL,
	`bmr` real NOT NULL,
	`tdee_base` real NOT NULL,
	`step_kcal` real NOT NULL,
	`kcal_per_step` real NOT NULL,
	`deficit` real NOT NULL,
	`tdee_source` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `day_status` (
	`local_date` text PRIMARY KEY NOT NULL,
	`food_complete` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `goal_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer NOT NULL,
	`start_date` text NOT NULL,
	`start_weight_kg` real NOT NULL,
	`goal_weight_kg` real NOT NULL,
	`mode` text NOT NULL,
	`rate_kg_per_week` real NOT NULL,
	`protein_g_per_lb_goal` real NOT NULL,
	`step_goal_override` integer,
	`macro_override` text,
	`adaptive_tdee` integer NOT NULL,
	`weekly_workout_goal` integer NOT NULL,
	`ended_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `goal_plans_active_idx` ON `goal_plans` (`is_active`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`sex_formula` text NOT NULL,
	`birth_date` text NOT NULL,
	`height_cm` real NOT NULL,
	`unit_weight` text NOT NULL,
	`unit_height` text NOT NULL,
	`week_start` integer NOT NULL,
	`day_end_hour` integer NOT NULL,
	`eating_window` text NOT NULL,
	`active_window` text NOT NULL,
	`tracking_only` integer NOT NULL,
	`tracked_measurements` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `achievement_unlocks` (
	`achievement_id` text PRIMARY KEY NOT NULL,
	`unlocked_at` integer NOT NULL,
	`context` text,
	`seen` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`scheduled_for` integer NOT NULL,
	`fired_at` integer,
	`dismissed` integer,
	`os_id` text
);
--> statement-breakpoint
CREATE INDEX `notification_log_category_idx` ON `notification_log` (`category`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`category` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`time_minutes` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`type` text PRIMARY KEY NOT NULL,
	`current` integer NOT NULL,
	`longest` integer NOT NULL,
	`current_started_on` text,
	`last_qualified_on` text,
	`longest_started_on` text,
	`longest_ended_on` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`table_name` text PRIMARY KEY NOT NULL,
	`last_pulled_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cardio_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`started_at` integer NOT NULL,
	`duration_s` integer NOT NULL,
	`activity` text NOT NULL,
	`intensity` text NOT NULL,
	`distance_m` real,
	`met` real NOT NULL,
	`on_foot_steps` integer,
	`net_kcal` real NOT NULL,
	`credit_kcal` real NOT NULL,
	`kcal_edited` integer NOT NULL,
	`counted` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `cardio_sessions_date_idx` ON `cardio_sessions` (`local_date`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`equipment` text NOT NULL,
	`metric_type` text NOT NULL,
	`is_custom` integer NOT NULL,
	`default_rest_s` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `exercises_name_idx` ON `exercises` (`name`);--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`pr_type` text NOT NULL,
	`value` real NOT NULL,
	`reps` integer,
	`set_id` text NOT NULL,
	`achieved_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `personal_records_exercise_idx` ON `personal_records` (`exercise_id`,`pr_type`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`target_sets` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_routine_idx` ON `routine_exercises` (`routine_id`,`order`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`superset_group` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_idx` ON `workout_exercises` (`workout_id`,`order`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`set_type` text NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`rpe` real,
	`duration_s` integer,
	`distance_m` real,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`workout_exercise_id`,`order`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text,
	`name` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`duration_s` integer,
	`total_volume_kg` real,
	`counted` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `workouts_date_idx` ON `workouts` (`local_date`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`measured_at` integer NOT NULL,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`weigh_in_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `measurements_date_kind_idx` ON `measurements` (`local_date`,`kind`);--> statement-breakpoint
CREATE INDEX `measurements_weigh_in_idx` ON `measurements` (`weigh_in_id`);--> statement-breakpoint
CREATE TABLE `trend_cache` (
	`local_date` text PRIMARY KEY NOT NULL,
	`trend_kg` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weigh_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`measured_at` integer NOT NULL,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`note` text,
	`flags` text,
	`is_trended` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `weigh_ins_date_idx` ON `weigh_ins` (`local_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weigh_ins_source_external_idx` ON `weigh_ins` (`source`,`external_id`);