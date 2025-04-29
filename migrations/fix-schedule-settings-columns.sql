-- Проверяем существование колонки generation_attempts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'schedule_settings' 
    AND column_name = 'generation_attempts'
  ) THEN
    -- Колонка существует, проверяем ограничение NOT NULL
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'schedule_settings'
      AND column_name = 'generation_attempts'
      AND is_nullable = 'NO'
    ) THEN
      -- Колонка имеет ограничение NOT NULL, изменяем на NULL
      ALTER TABLE schedule_settings ALTER COLUMN generation_attempts DROP NOT NULL;
    END IF;
  ELSE
    -- Колонка не существует, добавляем ее
    ALTER TABLE schedule_settings ADD COLUMN generation_attempts INTEGER;
  END IF;
END $$;

-- Обновляем существующие записи, устанавливая значение по умолчанию
UPDATE schedule_settings SET generation_attempts = 10 WHERE generation_attempts IS NULL;
