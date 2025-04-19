import { createClient } from "@supabase/supabase-js"

// Флаг, указывающий, доступен ли Supabase
let isSupabaseAvailable = false

// Создаем клиент Supabase с переменными окружения
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Проверка доступности Supabase
export const checkSupabaseAvailability = async (): Promise<boolean> => {
  try {
    // Пробуем выполнить простой запрос
    const { data, error } = await supabase.from("health_check").select("*").limit(1).maybeSingle()

    // Если ошибка связана с отсутствием таблицы, но соединение работает, это нормально
    if (error && error.code === "PGRST116") {
      isSupabaseAvailable = true
      return true
    }

    // Если другая ошибка, считаем, что Supabase недоступен
    if (error) {
      console.warn("Supabase is not available:", error.message)
      isSupabaseAvailable = false
      return false
    }

    isSupabaseAvailable = true
    return true
  } catch (error) {
    console.warn("Error checking Supabase availability:", error)
    isSupabaseAvailable = false
    return false
  }
}

// Функция для проверки, доступен ли Supabase
export const getSupabaseAvailability = (): boolean => {
  return isSupabaseAvailable
}

// Типы для таблиц Supabase
export type SupabaseProduct = {
  id: string
  name: string
  weight: number
  created_at?: string
}

export type SupabaseTask = {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  due_date: string | null
  status: "pending" | "in-progress" | "completed"
  created_at: string
}

export type SupabaseEmployee = {
  id: string
  name: string
  color: string
  work_schedule: "5/2" | "flexible" | "fixed"
  min_work_days: number
  max_work_days: number
  min_off_days: number
  max_off_days: number
  fixed_work_days?: number[] // Дни недели (0-6), когда сотрудник работает (для фиксированного графика)
  fixed_off_days?: number[] // Дни недели (0-6), когда у сотрудника выходной (для фиксированного графика)
  is_admin: boolean
  created_at?: string
}

export type SupabaseDayPreference = {
  id: string
  employee_id: string
  date: string
  day_of_week: number
  is_preferred: boolean
  created_at?: string
}

export type SupabaseScheduleEntry = {
  id: string
  date: string
  employee_id: string
  status: 0 | 1 | 11 // 0 = выходной, 1 = рабочий, 11 = сокращенный
  created_at?: string
}

export type SupabaseSchoolFile = {
  id: string
  name: string
  type: "folder" | "file" | "link"
  url?: string
  file_type?: string
  size?: number
  parent_id: string | null
  created_at: string
}

export type SupabaseSettings = {
  id: string
  key: string
  value: any
  created_at?: string
}

// Функция для синхронизации данных с Supabase
export const syncWithSupabase = async <T, U>(
  localData: T[],
  tableName: string,
  transformToSupabase: (item: T) => U,
  transformFromSupabase: (item: U) => T,
): Promise<T[]> => {
  // Если Supabase недоступен, возвращаем локальные данные
  if (!isSupabaseAvailable) {
    return localData
  }

  try {
    // Загружаем данные с сервера
    const { data: remoteData, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error)
      return localData
    }

    // Если есть данные на сервере, используем их
    if (remoteData && remoteData.length > 0) {
      return remoteData.map(transformFromSupabase)
    }

    // Если на сервере нет данных, но есть локальные данные, загружаем их на сервер
    if (localData.length > 0) {
      const supabaseData = localData.map(transformToSupabase)
      const { error: insertError } = await supabase.from(tableName).insert(supabaseData)

      if (insertError) {
        console.error(`Error inserting data to ${tableName}:`, insertError)
      }
    }

    return localData
  } catch (error) {
    console.error(`Error syncing with Supabase for ${tableName}:`, error)
    return localData
  }
}

// Функция для сохранения данных в Supabase
export const saveToSupabase = async <T, U>(
  data: T[],
  tableName: string,
  transformToSupabase: (item: T) => U,
): Promise<boolean> => {
  // Если Supabase недоступен, пропускаем сохранение
  if (!isSupabaseAvailable) {
    return false
  }

  try {
    // Сначала удаляем все существующие записи
    const { error: deleteError } = await supabase.from(tableName).delete().not("id", "is", null) // Удаляем все записи

    if (deleteError) {
      console.error(`Error deleting data from ${tableName}:`, deleteError)
      return false
    }

    // Затем вставляем новые данные
    if (data.length > 0) {
      const supabaseData = data.map(transformToSupabase)
      const { error: insertError } = await supabase.from(tableName).insert(supabaseData)

      if (insertError) {
        console.error(`Error inserting data to ${tableName}:`, insertError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error(`Error saving to Supabase for ${tableName}:`, error)
    return false
  }
}

// Функция для получения настроек из Supabase
export const getSettings = async (key: string): Promise<any | null> => {
  // Если Supabase недоступен, возвращаем null
  if (!isSupabaseAvailable) {
    return null
  }

  try {
    const { data, error } = await supabase.from("settings").select("value").eq("key", key).single()

    if (error) {
      console.error(`Error fetching setting ${key}:`, error)
      return null
    }

    return data?.value
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    return null
  }
}

// Функция для сохранения настроек в Supabase
export const saveSettings = async (key: string, value: any): Promise<boolean> => {
  // Если Supabase недоступен, пропускаем сохранение
  if (!isSupabaseAvailable) {
    return false
  }

  try {
    // Проверяем, существует ли настройка
    const { data } = await supabase.from("settings").select("id").eq("key", key).single()

    if (data) {
      // Обновляем существующую настройку
      const { error } = await supabase.from("settings").update({ value }).eq("key", key)

      if (error) {
        console.error(`Error updating setting ${key}:`, error)
        return false
      }
    } else {
      // Создаем новую настройку
      const { error } = await supabase.from("settings").insert({ key, value })

      if (error) {
        console.error(`Error inserting setting ${key}:`, error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error)
    return false
  }
}
