-- Создание таблицы для сотрудников
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  telegram_username TEXT,
  max_work_days INTEGER NOT NULL,
  min_off_days INTEGER NOT NULL,
  work_day_reminder_time TEXT,
  schedule_ready_reminder_time TEXT,
  schedule_ready_reminder_day INTEGER,
  work_schedule_mode TEXT NOT NULL,
  fixed_work_days INTEGER[],
  fixed_off_days INTEGER[],
  password TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  registration_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы для предпочтений по выходным дням
CREATE TABLE IF NOT EXISTS day_preferences (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_preferred BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы для записей графика
CREATE TABLE IF NOT EXISTS schedule_entries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status INTEGER NOT NULL,
  hours INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы для настроек графика
CREATE TABLE IF NOT EXISTS schedule_settings (
  id TEXT PRIMARY KEY,
  min_employees_per_day INTEGER NOT NULL,
  employees_per_day INTEGER NOT NULL,
  auto_generation_enabled BOOLEAN NOT NULL,
  auto_generation_day INTEGER NOT NULL,
  auto_generation_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы для пользователей Telegram
CREATE TABLE IF NOT EXISTS telegram_users (
  id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  chat_id BIGINT NOT NULL,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации запросов (с проверкой существования)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_day_preferences_employee_id') THEN
    CREATE INDEX idx_day_preferences_employee_id ON day_preferences(employee_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_day_preferences_date') THEN
    CREATE INDEX idx_day_preferences_date ON day_preferences(date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_employee_id') THEN
    CREATE INDEX idx_schedule_entries_employee_id ON schedule_entries(employee_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schedule_entries_date') THEN
    CREATE INDEX idx_schedule_entries_date ON schedule_entries(date);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_telegram_users_employee_id') THEN
    CREATE INDEX idx_telegram_users_employee_id ON telegram_users(employee_id);
  END IF;
END $$;

-- Включение RLS для таблиц
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа с проверкой существования
DO $$
BEGIN
  -- Проверка существования политик для employees
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Публичный доступ к сотрудникам') THEN
    CREATE POLICY "Публичный доступ к сотрудникам" ON employees FOR SELECT USING (true);
  END IF;
  
  -- Проверка существования политик для day_preferences
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'day_preferences' AND policyname = 'Публичный доступ к предпочтениям') THEN
    CREATE POLICY "Публичный доступ к предпочтениям" ON day_preferences FOR SELECT USING (true);
  END IF;
  
  -- Проверка существования политик для schedule_entries
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_entries' AND policyname = 'Публичный доступ к графику') THEN
    CREATE POLICY "Публичный доступ к графику" ON schedule_entries FOR SELECT USING (true);
  END IF;
  
  -- Проверка существования политик для schedule_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_settings' AND policyname = 'Публичный доступ к настройкам') THEN
    CREATE POLICY "Публичный доступ к настройкам" ON schedule_settings FOR SELECT USING (true);
  END IF;
  
  -- Проверка существования политик для telegram_users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telegram_users' AND policyname = 'Публичный доступ к пользователям Telegram') THEN
    CREATE POLICY "Публичный доступ к пользователям Telegram" ON telegram_users FOR SELECT USING (true);
  END IF;
  
  -- Политики для изменения данных
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Изменение сотрудников для аутентифицированных') THEN
    CREATE POLICY "Изменение сотрудников для аутентифицированных" ON employees 
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'day_preferences' AND policyname = 'Изменение предпочтений для аутентифицированных') THEN
    CREATE POLICY "Изменение предпочтений для аутентифицированных" ON day_preferences 
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_entries' AND policyname = 'Изменение графика для аутентифицированных') THEN
    CREATE POLICY "Изменение графика для аутентифицированных" ON schedule_entries 
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_settings' AND policyname = 'Изменение настроек для аутентифицированных') THEN
    CREATE POLICY "Изменение настроек для аутентифицированных" ON schedule_settings 
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'telegram_users' AND policyname = 'Изменение пользователей Telegram для аутентифицированных') THEN
    CREATE POLICY "Изменение пользователей Telegram для аутентифицированных" ON telegram_users 
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
