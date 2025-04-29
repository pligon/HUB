import type React from "react"
export type WorkScheduleMode = "5/2" | "flexible" | "fixed"
export type ShiftStatus = 0 | 1 | 11 // 0 - выходной, 1 - рабочий день, 11 - рабочий день (подтвержден)

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
  workScheduleMode: WorkScheduleMode
  fixedWorkDays?: number[]
  fixedOffDays?: number[]
  password?: string
  isAdmin: boolean
  createdAt: string
  registration_code?: string
  chat_id?: number
}

export interface DayPreference {
  id: string
  employeeId: string
  date: string
  dayOfWeek: number
  isPreferred: boolean
  createdAt: string
}

export interface ScheduleEntry {
  id: string
  employeeId: string
  date: string
  status: ShiftStatus
  hours?: number
  createdAt: string
}

export interface ScheduleSettings {
  id: string
  minEmployeesPerDay: number
  exactEmployeesPerDay: number
  autoGenerationEnabled: boolean
  autoGenerationDay: number
  autoGenerationTime: string
  generationAttempts: number
  createdAt: string
}

export interface ScheduleDay {
  date: string
  dayOfWeek: number
  dayOfMonth: number
  month: number
  year: number
  employees: ScheduleDayEmployee[]
  isToday: boolean
  isWeekend: boolean
}

export interface ScheduleDayEmployee {
  id: string
  name: string
  color: string
  status: ShiftStatus
  hours?: number
}

export interface ScheduleWeek {
  startDate: string
  endDate: string
  days: ScheduleDay[]
}

export interface ScheduleMonth {
  month: number
  year: number
  name: string
  weeks: ScheduleWeek[]
}

export interface ScheduleState {
  employees: Employee[]
  dayPreferences: DayPreference[]
  scheduleEntries: ScheduleEntry[]
  settings: ScheduleSettings
  isLoading: boolean
  error: string | null
}

export interface ScheduleAction {
  type: string
  payload?: any
}

export interface ScheduleContextType {
  state: ScheduleState
  dispatch: React.Dispatch<ScheduleAction>
  refreshData: () => Promise<void>
}

export interface EmployeeFormData {
  name: string
  color: string
  telegramUsername: string
  maxWorkDays: number
  minOffDays: number
  workDayReminderTime: string
  scheduleReadyReminderTime: string
  scheduleReadyReminderDay: number
  workScheduleMode: WorkScheduleMode
  fixedWorkDays: number[]
  fixedOffDays: number[]
  password: string
  isAdmin: boolean
  chat_id?: number
}

export interface ScheduleSettingsFormData {
  minEmployeesPerDay: number
  exactEmployeesPerDay: number
  autoGenerationEnabled: boolean
  autoGenerationDay: number
  autoGenerationTime: string
  generationAttempts: number
}

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"
