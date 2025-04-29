-- Добавляем колонку schedule_ready_reminder_day, если она не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'schedule_ready_reminder_day'
    ) THEN
        ALTER TABLE employees ADD COLUMN schedule_ready_reminder_day INTEGER;
    END IF;
END $$;

-- Добавляем колонку chat_id, если она не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'chat_id'
    ) THEN
        ALTER TABLE employees ADD COLUMN chat_id BIGINT;
    END IF;
END $$;

-- Добавляем колонку registration_code, если она не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'registration_code'
    ) THEN
        ALTER TABLE employees ADD COLUMN registration_code VARCHAR(10);
    END IF;
END $$;

-- Комментарий к миграции
COMMENT ON COLUMN employees.schedule_ready_reminder_day IS 'День недели для отправки уведомления о готовности графика (0-6, где 0 - воскресенье)';
COMMENT ON COLUMN employees.chat_id IS 'ID чата Telegram для отправки уведомлений';
COMMENT ON COLUMN employees.registration_code IS 'Код регистрации для связывания аккаунта Telegram';
