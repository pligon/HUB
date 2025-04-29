-- Добавляем колонку exact_employees_per_day, если она не существует
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'schedule_settings'
        AND column_name = 'exact_employees_per_day'
    ) THEN
        ALTER TABLE schedule_settings ADD COLUMN exact_employees_per_day INTEGER;
        
        -- Копируем значения из max_generation_attempts
        UPDATE schedule_settings
        SET exact_employees_per_day = max_generation_attempts;
        
        -- Делаем колонку NOT NULL
        ALTER TABLE schedule_settings ALTER COLUMN exact_employees_per_day SET NOT NULL;
    END IF;
END $$;
