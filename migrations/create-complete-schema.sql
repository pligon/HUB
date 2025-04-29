-- Удаление существующих таблиц (если они существуют)
DROP TABLE IF EXISTS telegram_users CASCADE;
DROP TABLE IF EXISTS schedule_entries CASCADE;
DROP TABLE IF EXISTS day_preferences CASCADE;
DROP TABLE IF EXISTS schedule_settings CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

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
  chat_id BIGINT,
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
  generation_attempts INTEGER NOT NULL DEFAULT 10,
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
CREATE INDEX IF NOT EXISTS idx_employees_chat_id ON employees(chat_id);

-- Добавление разрешений для RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Изменяем политики доступа для более свободного доступа
-- Удаляем старые политики
DROP POLICY IF EXISTS "Публичный доступ к сотрудникам" ON employees;
DROP POLICY IF EXISTS "Публичный доступ к предпочтениям" ON day_preferences;
DROP POLICY IF EXISTS "Публичный доступ к графику" ON schedule_entries;
DROP POLICY IF EXISTS "Публичный доступ к настройкам" ON schedule_settings;
DROP POLICY IF EXISTS "Публичный доступ к пользователям Telegram" ON telegram_users;
DROP POLICY IF EXISTS "Изменение сотрудников для аутентифицированных" ON employees;
DROP POLICY IF EXISTS "Изменение предпочтений для аутентифицированных" ON day_preferences;
DROP POLICY IF EXISTS "Изменение графика для аутентифицированных" ON schedule_entries;
DROP POLICY IF EXISTS "Изменение настроек для аутентифицированных" ON schedule_settings;
DROP POLICY IF EXISTS "Изменение пользователей Telegram для аутентифицированных" ON telegram_users;

-- Создаем новые, более свободные политики
CREATE POLICY "Полный доступ к сотрудникам" ON employees FOR ALL USING (true);
CREATE POLICY "Полный доступ к предпочтениям" ON day_preferences FOR ALL USING (true);
CREATE POLICY "Полный доступ к графику" ON schedule_entries FOR ALL USING (true);
CREATE POLICY "Полный доступ к настройкам" ON schedule_settings FOR ALL USING (true);
CREATE POLICY "Полный доступ к пользователям Telegram" ON telegram_users FOR ALL USING (true);

-- Комментарии к таблицам и колонкам для документации
COMMENT ON TABLE employees IS 'Таблица сотрудников';
COMMENT ON COLUMN employees.schedule_ready_reminder_day IS 'День недели для отправки уведомления о готовности графика (0-6)';
COMMENT ON COLUMN employees.chat_id IS 'ID чата Telegram для отправки уведомлений';
COMMENT ON COLUMN employees.registration_code IS 'Код регистрации для связывания аккаунта Telegram';

COMMENT ON TABLE schedule_settings IS 'Настройки графика работы';
COMMENT ON COLUMN schedule_settings.generation_attempts IS 'Максимальное количество попыток генерации графика';
