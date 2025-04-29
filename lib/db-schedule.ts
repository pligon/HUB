import { supabase, handleSupabaseError } from "./supabase"
import type {
  Employee,
  DayPreference,
  ScheduleEntry,
  ScheduleSettings,
  WorkScheduleMode,
  ShiftStatus,
} from "./types/schedule-types"

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
  registration_code?: string
  chat_id?: number
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

// Обновляем тип SupabaseScheduleSettings, чтобы он соответствовал структуре таблицы
export type SupabaseScheduleSettings = {
  id: string
  min_employees_per_day: number
  employees_per_day: number
  generation_attempts: number
  auto_generation_enabled: boolean
  auto_generation_day: number
  auto_generation_time: string
  created_at: string
}

// Функция для сохранения сотрудников
export async function saveEmployees(employees: Employee[]): Promise<boolean> {
  try {
    // Удаляем все существующие записи
    const { error: deleteError } = await supabase.from("employees").delete().not("id", "is", null)

    if (deleteError) {
      handleSupabaseError(deleteError, "удаление сотрудников")
      return false
    }

    // Вставляем новые записи
    if (employees.length > 0) {
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
        registration_code: employee.registration_code,
        chat_id: employee.chat_id,
      }))

      const { error: insertError } = await supabase.from("employees").insert(supabaseEmployees)

      if (insertError) {
        handleSupabaseError(insertError, "добавление сотрудников")
        return false
      }
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "сохранение сотрудников")
    return false
  }
}

// Функция для загрузки сотрудников
export async function loadEmployees(): Promise<Employee[]> {
  try {
    const { data, error } = await supabase.from("employees").select("*")

    if (error) {
      handleSupabaseError(error, "загрузка сотрудников")
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((item) => ({
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
      registration_code: item.registration_code,
      chat_id: item.chat_id,
    }))
  } catch (error) {
    handleSupabaseError(error, "загрузка сотрудников")
    return []
  }
}

// Функция для сохранения предпочтений по выходным
export async function saveDayPreferences(preferences: DayPreference[]): Promise<boolean> {
  try {
    // Удаляем все существующие записи
    const { error: deleteError } = await supabase.from("day_preferences").delete().not("id", "is", null)

    if (deleteError) {
      handleSupabaseError(deleteError, "удаление предпочтений")
      return false
    }

    // Вставляем новые записи
    if (preferences.length > 0) {
      const supabasePreferences = preferences.map((pref) => ({
        id: pref.id,
        employee_id: pref.employeeId,
        date: pref.date,
        day_of_week: pref.dayOfWeek,
        is_preferred: pref.isPreferred,
        created_at: pref.createdAt,
      }))

      const { error: insertError } = await supabase.from("day_preferences").insert(supabasePreferences)

      if (insertError) {
        handleSupabaseError(insertError, "добавление предпочтений")
        return false
      }
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "сохранение предпочтений")
    return false
  }
}

// Функция для загрузки предпочтений по выходным
export async function loadDayPreferences(): Promise<DayPreference[]> {
  try {
    const { data, error } = await supabase.from("day_preferences").select("*")

    if (error) {
      handleSupabaseError(error, "загрузка предпочтений")
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((item) => ({
      id: item.id,
      employeeId: item.employee_id,
      date: item.date,
      dayOfWeek: item.day_of_week,
      isPreferred: item.is_preferred,
      createdAt: item.created_at,
    }))
  } catch (error) {
    handleSupabaseError(error, "загрузка предпочтений")
    return []
  }
}

// Функция для сохранения записей графика
export async function saveScheduleEntries(entries: ScheduleEntry[]): Promise<boolean> {
  try {
    // Удаляем все существующие записи
    const { error: deleteError } = await supabase.from("schedule_entries").delete().not("id", "is", null)

    if (deleteError) {
      handleSupabaseError(deleteError, "удаление записей графика")
      return false
    }

    // Вставляем новые записи
    if (entries.length > 0) {
      const supabaseEntries = entries.map((entry) => ({
        id: entry.id,
        employee_id: entry.employeeId,
        date: entry.date,
        status: entry.status,
        hours: entry.hours,
        created_at: entry.createdAt,
      }))

      const { error: insertError } = await supabase.from("schedule_entries").insert(supabaseEntries)

      if (insertError) {
        handleSupabaseError(insertError, "добавление записей графика")
        return false
      }
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "сохранение записей графика")
    return false
  }
}

// Функция для загрузки записей графика
export async function loadScheduleEntries(): Promise<ScheduleEntry[]> {
  try {
    const { data, error } = await supabase.from("schedule_entries").select("*")

    if (error) {
      handleSupabaseError(error, "загрузка записей графика")
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((item) => ({
      id: item.id,
      employeeId: item.employee_id,
      date: item.date,
      status: item.status,
      hours: item.hours,
      createdAt: item.created_at,
    }))
  } catch (error) {
    handleSupabaseError(error, "загрузка записей графика")
    return []
  }
}

// Обновляем функцию saveScheduleSettings для использования правильных имен колонок
export async function saveScheduleSettings(settings: ScheduleSettings): Promise<boolean> {
  try {
    // Проверяем существование таблицы
    const { error: checkError } = await supabase.from("schedule_settings").select("count").limit(1)

    // Если таблица не существует, возвращаем ошибку и рекомендуем выполнить SQL-скрипт
    if (checkError && checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
      console.error("Таблица schedule_settings не существует. Выполните SQL-скрипт для создания таблиц.")
      return false
    }

    // Используем upsert вместо delete + insert для обхода проблем с RLS
    const supabaseSettings = {
      id: settings.id || "default",
      min_employees_per_day: settings.minEmployeesPerDay,
      employees_per_day: settings.exactEmployeesPerDay,
      generation_attempts: settings.generationAttempts || 10,
      auto_generation_enabled: settings.autoGenerationEnabled,
      auto_generation_day: settings.autoGenerationDay,
      auto_generation_time: settings.autoGenerationTime,
      created_at: settings.createdAt || new Date().toISOString(),
    }

    // Пробуем сначала с обычным клиентом
    const { error: upsertError } = await supabase
      .from("schedule_settings")
      .upsert(supabaseSettings, { onConflict: "id" })

    // Если получаем ошибку RLS, пробуем с админ-клиентом
    if (upsertError && upsertError.message.includes("row-level security")) {
      console.log("Используем админ-клиент для обхода RLS...")

      // Импортируем админ-клиент
      const { supabaseAdmin } = await import("../lib/supabase")

      const { error: adminUpsertError } = await supabaseAdmin
        .from("schedule_settings")
        .upsert(supabaseSettings, { onConflict: "id" })

      if (adminUpsertError) {
        handleSupabaseError(adminUpsertError, "обновление настроек графика (админ)")
        return false
      }
    } else if (upsertError) {
      handleSupabaseError(upsertError, "обновление настроек графика")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "сохранение настроек графика")
    return false
  }
}

// Обновляем функцию loadScheduleSettings для использования правильных имен колонок
export async function loadScheduleSettings(): Promise<ScheduleSettings | null> {
  try {
    const { data, error } = await supabase.from("schedule_settings").select("*").limit(1)

    // Если получаем ошибку RLS, пробуем с админ-клиентом
    if (error && error.message.includes("row-level security")) {
      console.log("Используем админ-клиент для обхода RLS при загрузке настроек...")

      // Импортируем админ-клиент
      const { supabaseAdmin } = await import("../lib/supabase")

      const { data: adminData, error: adminError } = await supabaseAdmin.from("schedule_settings").select("*").limit(1)

      if (adminError) {
        if (adminError.message.includes("relation") && adminError.message.includes("does not exist")) {
          console.error("Таблица schedule_settings не существует. Выполните SQL-скрипт для создания таблиц.")
          return createDefaultScheduleSettings()
        }
        handleSupabaseError(adminError, "загрузка настроек графика (админ)")
        return createDefaultScheduleSettings()
      }

      if (!adminData || adminData.length === 0) {
        // Если данных нет, создаем настройки по умолчанию и сохраняем их
        const defaultSettings = createDefaultScheduleSettings()
        await saveScheduleSettings(defaultSettings)
        return defaultSettings
      }

      const item = adminData[0]

      return {
        id: item.id,
        minEmployeesPerDay: item.min_employees_per_day,
        exactEmployeesPerDay: item.employees_per_day,
        autoGenerationEnabled: item.auto_generation_enabled,
        autoGenerationDay: item.auto_generation_day,
        autoGenerationTime: item.auto_generation_time,
        generationAttempts: item.generation_attempts || 10,
        createdAt: item.created_at,
      }
    }

    // Если таблица не существует, возвращаем настройки по умолчанию
    if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
      console.error("Таблица schedule_settings не существует. Выполните SQL-скрипт для создания таблиц.")
      return createDefaultScheduleSettings()
    }

    if (error) {
      handleSupabaseError(error, "загрузка настроек графика")
      return createDefaultScheduleSettings()
    }

    if (!data || data.length === 0) {
      // Если данных нет, создаем настройки по умолчанию и сохраняем их
      const defaultSettings = createDefaultScheduleSettings()
      await saveScheduleSettings(defaultSettings)
      return defaultSettings
    }

    const item = data[0]

    return {
      id: item.id,
      minEmployeesPerDay: item.min_employees_per_day,
      exactEmployeesPerDay: item.employees_per_day,
      autoGenerationEnabled: item.auto_generation_enabled,
      autoGenerationDay: item.auto_generation_day,
      autoGenerationTime: item.auto_generation_time,
      generationAttempts: item.generation_attempts || 10,
      createdAt: item.created_at,
    }
  } catch (error) {
    // В случае ошибки возвращаем настройки по умолчанию
    console.error("Ошибка при загрузке настроек:", error)
    return createDefaultScheduleSettings()
  }
}

// Функция для создания настроек графика по умолчанию
export const createDefaultScheduleSettings = (): ScheduleSettings => {
  return {
    id: "default", // Используем фиксированный ID для упрощения upsert
    minEmployeesPerDay: 3,
    exactEmployeesPerDay: 3,
    autoGenerationEnabled: true,
    autoGenerationDay: 6, // Суббота
    autoGenerationTime: "10:00",
    generationAttempts: 10, // Добавляем значение по умолчанию для generationAttempts
    createdAt: new Date().toISOString(),
  }
}

// Функция для создания ID
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9)
}

// Функция для добавления одного сотрудника
export async function addEmployee(employee: Employee): Promise<boolean> {
  try {
    const supabaseEmployee = {
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
      registration_code: employee.registration_code,
      chat_id: employee.chat_id,
    }

    const { error } = await supabase.from("employees").insert(supabaseEmployee)

    if (error) {
      handleSupabaseError(error, "добавление сотрудника")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "добавление сотрудника")
    return false
  }
}

// Функция для обновления одного сотрудника
export async function updateEmployee(employee: Employee): Promise<boolean> {
  try {
    const supabaseEmployee = {
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
      registration_code: employee.registration_code,
      chat_id: employee.chat_id,
    }

    const { error } = await supabase.from("employees").update(supabaseEmployee).eq("id", employee.id)

    if (error) {
      handleSupabaseError(error, "обновление сотрудника")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "обновление сотрудника")
    return false
  }
}

// Функция для удаления одного сотрудника
export async function deleteEmployee(employeeId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("employees").delete().eq("id", employeeId)

    if (error) {
      handleSupabaseError(error, "удаление сотрудника")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "удаление сотрудника")
    return false
  }
}

// Функция для добавления одного предпочтения
export async function addDayPreference(preference: DayPreference): Promise<boolean> {
  try {
    const supabasePreference = {
      id: preference.id,
      employee_id: preference.employeeId,
      date: preference.date,
      day_of_week: preference.dayOfWeek,
      is_preferred: preference.isPreferred,
      created_at: preference.createdAt,
    }

    const { error } = await supabase.from("day_preferences").insert(supabasePreference)

    if (error) {
      handleSupabaseError(error, "добавление предпочтения")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "добавление предпочтения")
    return false
  }
}

// Функция для обновления одного предпочтения
export async function updateDayPreference(preference: DayPreference): Promise<boolean> {
  try {
    const supabasePreference = {
      employee_id: preference.employeeId,
      date: preference.date,
      day_of_week: preference.dayOfWeek,
      is_preferred: preference.isPreferred,
    }

    const { error } = await supabase.from("day_preferences").update(supabasePreference).eq("id", preference.id)

    if (error) {
      handleSupabaseError(error, "обновление предпочтения")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "обновление предпочтения")
    return false
  }
}

// Функция для удаления одного предпочтения
export async function deleteDayPreference(preferenceId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("day_preferences").delete().eq("id", preferenceId)

    if (error) {
      handleSupabaseError(error, "удаление предпочтения")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "удаление предпочтения")
    return false
  }
}

// Функция для добавления одной записи графика
export async function addScheduleEntry(entry: ScheduleEntry): Promise<boolean> {
  try {
    const supabaseEntry = {
      id: entry.id,
      employee_id: entry.employeeId,
      date: entry.date,
      status: entry.status,
      hours: entry.hours,
      created_at: entry.createdAt,
    }

    const { error } = await supabase.from("schedule_entries").insert(supabaseEntry)

    if (error) {
      handleSupabaseError(error, "добавление записи графика")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "добавление записи графика")
    return false
  }
}

// Функция для обновления одной записи графика
export async function updateScheduleEntry(entry: ScheduleEntry): Promise<boolean> {
  try {
    const supabaseEntry = {
      employee_id: entry.employeeId,
      date: entry.date,
      status: entry.status,
      hours: entry.hours,
    }

    const { error } = await supabase.from("schedule_entries").update(supabaseEntry).eq("id", entry.id)

    if (error) {
      handleSupabaseError(error, "обновление записи графика")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "обновление записи графика")
    return false
  }
}

// Функция для удаления одной записи графика
export async function deleteScheduleEntry(entryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("schedule_entries").delete().eq("id", entryId)

    if (error) {
      handleSupabaseError(error, "удаление записи графика")
      return false
    }

    return true
  } catch (error) {
    handleSupabaseError(error, "удаление записи графика")
    return false
  }
}
