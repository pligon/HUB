-- Добавление поля для кода регистрации в таблицу сотрудников
ALTER TABLE employees ADD COLUMN IF NOT EXISTS registration_code TEXT;

-- Создание индекса для оптимизации поиска по коду регистрации
CREATE INDEX IF NOT EXISTS idx_employees_registration_code ON employees(registration_code);
