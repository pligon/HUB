-- Drop existing policies
DROP POLICY IF EXISTS "Публичный доступ к настройкам" ON schedule_settings;
DROP POLICY IF EXISTS "Изменение настроек для аутентифицированных" ON schedule_settings;

-- Create a more permissive policy for schedule_settings
CREATE POLICY "Полный доступ к настройкам" ON schedule_settings
  FOR ALL USING (true);

-- Make sure RLS is still enabled (but with our new permissive policy)
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;
