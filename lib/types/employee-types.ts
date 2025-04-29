export interface Employee {
  id: string
  name: string
  color: string
  telegramUsername?: string
  maxWorkDays: number
  minOffDays: number
  workDayReminderTime?: string
  scheduleReadyReminderTime?: string
  scheduleReadyReminderDay?: number
  workScheduleMode: "5/2" | "flexible" | "fixed"
  fixedWorkDays?: number[]
  fixedOffDays?: number[]
  password?: string
  isAdmin: boolean
  createdAt: string
  registration_code?: string
  chat_id?: number
}
