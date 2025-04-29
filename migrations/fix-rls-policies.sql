-- Включаем RLS для таблицы schedule_settings
ALTER TABLE IF EXISTS schedule_settings ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики для schedule_settings, если они есть
DROP POLICY IF EXISTS "Публичный доступ к настройкам" ON schedule_settings;
DROP POLICY IF EXISTS "Изменение настроек для аутентифицированных" ON schedule_settings;
DROP POLICY IF EXISTS "Полный доступ к настройкам" ON schedule_settings;

-- Создаем политику, разрешающую полный доступ к таблице schedule_settings для всех
CREATE POLICY "Полный доступ к настройкам" ON schedule_settings
  USING (true)
  WITH CHECK (true);

-- Разрешаем анонимный доступ к таблице schedule_settings
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_settings TO authenticated;
