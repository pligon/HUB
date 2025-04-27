// Типы данных для модуля "График бар"

// Режим работы сотрудника
export type WorkScheduleMode = "5/2" | "flexible" | "fixed"

// Статус смены
export type ShiftStatus = 0 | 1 | 11 // 0 = выходной, 1 = рабочий день (12ч), 11 = сокращенный (11ч)

// Сотрудник
export interface Employee {
  id: string
  name: string
  color: string
  telegramUsername?: string
  maxWorkDays: number
  minOffDays: number
  workDayReminderTime?: string // Время напоминания о рабочем дне (HH:MM)
  scheduleReadyReminderTime?: string // Время напоминания о готовности графика (HH:MM)
  scheduleReadyReminderDay?: number // День недели для напоминания о готовности графика (0-6)
  workScheduleMode: WorkScheduleMode
  fixedWorkDays?: number[] // Дни недели (0-6), когда сотрудник работает (для фиксированного графика)
  fixedOffDays?: number[] // Дни недели (0-6), когда у сотрудника выходной (для гибкого графика)
  password?: string // Личный пароль сотрудника
  isAdmin: boolean
  createdAt: string
  registration_code?: string // Код регистрации для Telegram
}

// Предпочтения по выходным дням
export interface DayPreference {
  id: string
  employeeId: string
  date: string // ISO формат даты (YYYY-MM-DD)
  dayOfWeek: number // День недели (0-6)
  isPreferred: boolean // true = предпочитаемый выходной
  createdAt: string
}

// Запись в графике
export interface ScheduleEntry {
  id: string
  employeeId: string
  date: string // ISO формат даты (YYYY-MM-DD)
  status: ShiftStatus
  hours?: number // Количество часов в смене (по умолчанию 12 для будней, 11 для выходных)
  createdAt: string
}

// Настройки генерации графика
export interface ScheduleSettings {
  id: string
  minEmployeesPerDay: number // Минимальное количество сотрудников в день
  maxGenerationAttempts: number // Количество попыток на поиск лучшего варианта
  autoGenerationEnabled: boolean // Включено ли автоматическое формирование графика
  autoGenerationDay: number // День недели для автоматического формирования (0-6)
  autoGenerationTime: string // Время автоматического формирования (HH:MM)
  createdAt: string
}

// Токен Telegram бота
export const TELEGRAM_BOT_TOKEN = "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"
