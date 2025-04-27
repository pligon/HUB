import { openDB } from "idb"
import type {
  Employee,
  DayPreference,
  ScheduleEntry,
  ScheduleSettings,
  WorkScheduleMode,
  ShiftStatus,
} from "./types/schedule-types"
import { supabase, getSupabaseAvailability } from "./supabase"

// Типы для Supabase
export type SupabaseEmployee = {
  id: string
  name: string
  color: string
  telegram_username?: string
  max_work_days: number
  min_off_days: number
  work_day_reminder_time?: string
  schedule_ready_reminder_time?: string
  schedule_ready_reminder_day?: number
  work_schedule_mode: WorkScheduleMode
  fixed_work_days?: number[]
  fixed_off_days?: number[]
  password?: string
  is_admin: boolean
  created_at: string
}

export type SupabaseDayPreference = {
  id: string
  employee_id: string
  date: string
  day_of_week: number
  is_preferred: boolean
  created_at: string
}

export type SupabaseScheduleEntry = {
  id: string
  employee_id: string
  date: string
  status: ShiftStatus
  hours?: number
  created_at: string
}

export type SupabaseScheduleSettings = {
  id: string
  min_employees_per_day: number
  max_generation_attempts: number
  auto_generation_enabled: boolean
  auto_generation_day: number
  auto_generation_time: string
  created_at: string
}

// Инициализация базы данных
export const initScheduleDB = async () => {
  return openDB("scheduleDB", 1, {
    upgrade(db) {
      // Создаем хранилища для разных типов данных
      if (!db.objectStoreNames.contains("employees")) {
        db.createObjectStore("employees", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("dayPreferences")) {
        db.createObjectStore("dayPreferences", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("scheduleEntries")) {
        db.createObjectStore("scheduleEntries", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("scheduleSettings")) {
        db.createObjectStore("scheduleSettings", { keyPath: "id" })
      }
    },
  })
}

// Функция для сохранения сотрудников
export const saveEmployees = async (employees: Employee[]): Promise<boolean> => {
  try {
    const db = await initScheduleDB()
    const tx = db.transaction("employees", "readwrite")
    const store = tx.objectStore("employees")

    // Очищаем существующие записи
    await store.clear()

    // Добавляем все элементы
    for (const employee of employees) {
      await store.add(employee)
    }

    await tx.done

    // Синхронизация с Supabase если доступно
    if (getSupabaseAvailability()) {
      const { error } = await supabase.from("employees").delete().not("id", "is", null)

      if (!error && employees.length > 0) {
        const supabaseEmployees = employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          color: employee.color,
          telegram_username: employee.telegramUsername,
          max_work_days: employee.maxWorkDays,
          min_off_days: employee.minOffDays,
          work_day_reminder_time: employee.workDayReminderTime,
          schedule_ready_reminder_time: employee.scheduleReadyReminderTime,
          schedule_ready_reminder_day: employee.scheduleReadyReminderDay,
          work_schedule_mode: employee.workScheduleMode,
          fixed_work_days: employee.fixedWorkDays,
          fixed_off_days: employee.fixedOffDays,
          password: employee.password,
          is_admin: employee.isAdmin,
          created_at: employee.createdAt,
        }))

        await supabase.from("employees").insert(supabaseEmployees)
      }
    }

    return true
  } catch (error) {
    console.error("Error saving employees:", error)
    return false
  }
}

// Функция для загрузки сотрудников
export const loadEmployees = async (): Promise<Employee[]> => {
  try {
    const db = await initScheduleDB()
    let employees = await db.getAll("employees")

    // Если локальных данных нет и Supabase доступен, пробуем загрузить с сервера
    if (employees.length === 0 && getSupabaseAvailability()) {
      const { data, error } = await supabase.from("employees").select("*")

      if (!error && data && data.length > 0) {
        employees = data.map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          telegramUsername: item.telegram_username,
          maxWorkDays: item.max_work_days,
          minOffDays: item.min_off_days,
          workDayReminderTime: item.work_day_reminder_time,
          scheduleReadyReminderTime: item.schedule_ready_reminder_time,
          scheduleReadyReminderDay: item.schedule_ready_reminder_day,
          workScheduleMode: item.work_schedule_mode,
          fixedWorkDays: item.fixed_work_days,
          fixedOffDays: item.fixed_off_days,
          password: item.password,
          isAdmin: item.is_admin,
          createdAt: item.created_at,
        }))

        // Сохраняем загруженные данные локально
        await saveEmployees(employees)
      }
    }

    return employees
  } catch (error) {
    console.error("Error loading employees:", error)
    return []
  }
}

// Функция для сохранения предпочтений по выходным
export const saveDayPreferences = async (preferences: DayPreference[]): Promise<boolean> => {
  try {
    const db = await initScheduleDB()
    const tx = db.transaction("dayPreferences", "readwrite")
    const store = tx.objectStore("dayPreferences")

    // Очищаем существующие записи
    await store.clear()

    // Добавляем все элементы
    for (const preference of preferences) {
      await store.add(preference)
    }

    await tx.done

    // Синхронизация с Supabase если доступно
    if (getSupabaseAvailability()) {
      const { error } = await supabase.from("day_preferences").delete().not("id", "is", null)

      if (!error && preferences.length > 0) {
        const supabasePreferences = preferences.map((pref) => ({
          id: pref.id,
          employee_id: pref.employeeId,
          date: pref.date,
          day_of_week: pref.dayOfWeek,
          is_preferred: pref.isPreferred,
          created_at: pref.createdAt,
        }))

        await supabase.from("day_preferences").insert(supabasePreferences)
      }
    }

    return true
  } catch (error) {
    console.error("Error saving day preferences:", error)
    return false
  }
}

// Функция для загрузки предпочтений по выходным
export const loadDayPreferences = async (): Promise<DayPreference[]> => {
  try {
    const db = await initScheduleDB()
    let preferences = await db.getAll("dayPreferences")

    // Если локальных данных нет и Supabase доступен, пробуем загрузить с сервера
    if (preferences.length === 0 && getSupabaseAvailability()) {
      const { data, error } = await supabase.from("day_preferences").select("*")

      if (!error && data && data.length > 0) {
        preferences = data.map((item) => ({
          id: item.id,
          employeeId: item.employee_id,
          date: item.date,
          dayOfWeek: item.day_of_week,
          isPreferred: item.is_preferred,
          createdAt: item.created_at,
        }))

        // Сохраняем загруженные данные локально
        await saveDayPreferences(preferences)
      }
    }

    return preferences
  } catch (error) {
    console.error("Error loading day preferences:", error)
    return []
  }
}

// Функция для сохранения записей графика
export const saveScheduleEntries = async (entries: ScheduleEntry[]): Promise<boolean> => {
  try {
    const db = await initScheduleDB()
    const tx = db.transaction("scheduleEntries", "readwrite")
    const store = tx.objectStore("scheduleEntries")

    // Очищаем существующие записи
    await store.clear()

    // Добавляем все элементы
    for (const entry of entries) {
      await store.add(entry)
    }

    await tx.done

    // Синхронизация с Supabase если доступно
    if (getSupabaseAvailability()) {
      const { error } = await supabase.from("schedule_entries").delete().not("id", "is", null)

      if (!error && entries.length > 0) {
        const supabaseEntries = entries.map((entry) => ({
          id: entry.id,
          employee_id: entry.employeeId,
          date: entry.date,
          status: entry.status,
          hours: entry.hours,
          created_at: entry.createdAt,
        }))

        await supabase.from("schedule_entries").insert(supabaseEntries)
      }
    }

    return true
  } catch (error) {
    console.error("Error saving schedule entries:", error)
    return false
  }
}

// Функция для загрузки записей графика
export const loadScheduleEntries = async (): Promise<ScheduleEntry[]> => {
  try {
    const db = await initScheduleDB()
    let entries = await db.getAll("scheduleEntries")

    // Если локальных данных нет и Supabase доступен, пробуем загрузить с сервера
    if (entries.length === 0 && getSupabaseAvailability()) {
      const { data, error } = await supabase.from("schedule_entries").select("*")

      if (!error && data && data.length > 0) {
        entries = data.map((item) => ({
          id: item.id,
          employeeId: item.employee_id,
          date: item.date,
          status: item.status,
          hours: item.hours,
          createdAt: item.created_at,
        }))

        // Сохраняем загруженные данные локально
        await saveScheduleEntries(entries)
      }
    }

    return entries
  } catch (error) {
    console.error("Error loading schedule entries:", error)
    return []
  }
}

// Функция для сохранения настроек графика
export const saveScheduleSettings = async (settings: ScheduleSettings): Promise<boolean> => {
  try {
    const db = await initScheduleDB()
    const tx = db.transaction("scheduleSettings", "readwrite")
    const store = tx.objectStore("scheduleSettings")

    // Очищаем существующие записи
    await store.clear()

    // Добавляем настройки
    await store.add(settings)

    await tx.done

    // Синхронизация с Supabase если доступно
    if (getSupabaseAvailability()) {
      const { error } = await supabase.from("schedule_settings").delete().not("id", "is", null)

      if (!error) {
        const supabaseSettings = {
          id: settings.id,
          min_employees_per_day: settings.minEmployeesPerDay,
          max_generation_attempts: settings.maxGenerationAttempts,
          auto_generation_enabled: settings.autoGenerationEnabled,
          auto_generation_day: settings.autoGenerationDay,
          auto_generation_time: settings.autoGenerationTime,
          created_at: settings.createdAt,
        }

        await supabase.from("schedule_settings").insert(supabaseSettings)
      }
    }

    return true
  } catch (error) {
    console.error("Error saving schedule settings:", error)
    return false
  }
}

// Функция для загрузки настроек графика
export const loadScheduleSettings = async (): Promise<ScheduleSettings | null> => {
  try {
    const db = await initScheduleDB()
    const settings = await db.getAll("scheduleSettings")

    // Если локальных данных нет и Supabase доступен, пробуем загрузить с сервера
    if (settings.length === 0 && getSupabaseAvailability()) {
      const { data, error } = await supabase.from("schedule_settings").select("*").limit(1)

      if (!error && data && data.length > 0) {
        const item = data[0]
        const loadedSettings: ScheduleSettings = {
          id: item.id,
          minEmployeesPerDay: item.min_employees_per_day,
          maxGenerationAttempts: item.max_generation_attempts,
          autoGenerationEnabled: item.auto_generation_enabled,
          autoGenerationDay: item.auto_generation_day,
          autoGenerationTime: item.auto_generation_time,
          createdAt: item.created_at,
        }

        // Сохраняем загруженные данные локально
        await saveScheduleSettings(loadedSettings)

        return loadedSettings
      }
    }

    return settings.length > 0 ? settings[0] : null
  } catch (error) {
    console.error("Error loading schedule settings:", error)
    return null
  }
}

// Функция для создания настроек графика по умолчанию
export const createDefaultScheduleSettings = (): ScheduleSettings => {
  return {
    id: Date.now().toString(),
    minEmployeesPerDay: 3,
    maxGenerationAttempts: 10,
    autoGenerationEnabled: true,
    autoGenerationDay: 6, // Суббота
    autoGenerationTime: "10:00",
    createdAt: new Date().toISOString(),
  }
}

// Функция для создания ID
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9)
}
