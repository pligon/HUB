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

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_day_preferences_employee_id ON day_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_day_preferences_date ON day_preferences(date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_employee_id ON schedule_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(date);
CREATE INDEX IF NOT EXISTS idx_telegram_users_employee_id ON telegram_users(employee_id);

-- Добавление разрешений для RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа
CREATE POLICY "Публичный доступ к сотрудникам" ON employees FOR SELECT USING (true);
CREATE POLICY "Публичный доступ к предпочтениям" ON day_preferences FOR SELECT USING (true);
CREATE POLICY "Публичный доступ к графику" ON schedule_entries FOR SELECT USING (true);
CREATE POLICY "Публичный доступ к настройкам" ON schedule_settings FOR SELECT USING (true);
CREATE POLICY "Публичный доступ к пользователям Telegram" ON telegram_users FOR SELECT USING (true);

-- Создание политик для изменения данных (только для аутентифицированных пользователей)
CREATE POLICY "Изменение сотрудников для аутентифицированных" ON employees 
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Изменение предпочтений для аутентифицированных" ON day_preferences 
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Изменение графика для аутентифицированных" ON schedule_entries 
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Изменение настроек для аутентифицированных" ON schedule_settings 
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Изменение пользователей Telegram для аутентифицированных" ON telegram_users 
  FOR ALL USING (auth.role() = 'authenticated');
