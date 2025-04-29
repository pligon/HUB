-- Создание таблицы для логов уведомлений
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  chat_id BIGINT,
  message_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индекса для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_notification_logs_employee_id ON notification_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Добавление разрешений для RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Создание политик доступа
CREATE POLICY "Публичный доступ к логам уведомлений" ON notification_logs FOR SELECT USING (true);
CREATE POLICY "Изменение логов уведомлений для аутентифицированных" ON notification_logs 
  FOR ALL USING (auth.role() = 'authenticated');

-- Комментарий к таблице
COMMENT ON TABLE notification_logs IS 'Логи отправки уведомлений через Telegram';
