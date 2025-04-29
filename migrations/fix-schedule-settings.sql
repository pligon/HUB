-- Проверяем существование таблицы schedule_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedule_settings') THEN
    -- Таблица существует, проверяем наличие колонки employees_per_day
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_settings' AND column_name = 'employees_per_day') THEN
      -- Колонка не существует, добавляем ее
      ALTER TABLE schedule_settings ADD COLUMN employees_per_day INTEGER DEFAULT 3;
    END IF;
  ELSE
    -- Таблица не существует, создаем ее
    CREATE TABLE schedule_settings (
      id TEXT PRIMARY KEY,
      min_employees_per_day INTEGER NOT NULL,
      employees_per_day INTEGER NOT NULL DEFAULT 3,
      auto_generation_enabled BOOLEAN NOT NULL,
      auto_generation_day INTEGER NOT NULL,
      auto_generation_time TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  END IF;
END $$;
