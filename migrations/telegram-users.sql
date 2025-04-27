-- Создание таблицы для хранения данных пользователей Telegram
CREATE TABLE IF NOT EXISTS telegram_users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  chat_id BIGINT,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  is_registered BOOLEAN DEFAULT FALSE,
  registration_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_telegram_users_username ON telegram_users(username);
CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_employee_id ON telegram_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_registration_code ON telegram_users(registration_code);

-- Создание функции для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для автоматического обновления updated_at
CREATE TRIGGER update_telegram_users_updated_at
BEFORE UPDATE ON telegram_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Добавление разрешений для RLS (Row Level Security)
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа
CREATE POLICY "Публичный доступ к telegram_users" ON telegram_users FOR SELECT USING (true);
CREATE POLICY "Изменение telegram_users для аутентифицированных" ON telegram_users 
  FOR ALL USING (auth.role() = 'authenticated');
