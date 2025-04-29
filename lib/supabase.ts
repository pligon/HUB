import { createClient } from "@supabase/supabase-js"

// Инициализация Supabase клиента
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Add a new supabaseAdmin client with service role capabilities
// This should be placed right after the regular supabase client initialization

// Инициализация Supabase клиента с сервисной ролью для обхода RLS
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  },
)

// Функция для проверки доступности Supabase
export async function checkSupabaseAvailability(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("employees").select("count").limit(1)
    if (error) {
      console.error("Supabase availability check failed:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("Supabase availability check failed:", error)
    return false
  }
}

// Функция для проверки доступности Supabase (синхронная версия)
export function getSupabaseAvailability(): boolean {
  return true // Всегда возвращаем true, так как мы теперь всегда используем Supabase
}

// Функция для настройки подписок на изменения в реальном времени
export function setupRealtimeSubscriptions(
  tables: string[],
  onInsert: (payload: any) => void,
  onUpdate: (payload: any) => void,
  onDelete: (payload: any) => void,
): () => void {
  const channel = supabase
    .channel("schema-db-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: tables,
      },
      (payload) => onInsert(payload),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: tables,
      },
      (payload) => onUpdate(payload),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: tables,
      },
      (payload) => onDelete(payload),
    )
    .subscribe()

  // Возвращаем функцию для отписки
  return () => {
    supabase.removeChannel(channel)
  }
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
  telegram_username?: string
  max_work_days: number
  min_off_days: number
  work_day_reminder_time?: string
  schedule_ready_reminder_time?: string
  schedule_ready_reminder_day?: number
  work_schedule_mode: "5/2" | "flexible" | "fixed"
  fixed_work_days?: number[]
  fixed_off_days?: number[]
  password?: string
  is_admin: boolean
  registration_code?: string
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
  employee_id: string
  date: string
  status: 0 | 1 | 11
  hours?: number
  created_at?: string
}

export type SupabaseScheduleSettings = {
  id: string
  min_employees_per_day: number
  // Поддерживаем все возможные имена колонок
  employees_per_day?: number
  max_generation_attempts?: number
  exact_employees_per_day?: number
  auto_generation_enabled: boolean
  auto_generation_day: number
  auto_generation_time: string
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

// Функция для обработки ошибок Supabase
export function handleSupabaseError(error: any, operation: string): void {
  console.error(`Error during ${operation}:`, error)
}

// Generic function to sync data with Supabase
export async function syncWithSupabase<LocalType, SupabaseType>(
  localItems: LocalType[],
  tableName: string,
  mapToSupabase: (item: LocalType) => SupabaseType,
  mapToLocal: (item: SupabaseType) => LocalType,
): Promise<LocalType[]> {
  try {
    // Проверяем доступность Supabase
    if (!getSupabaseAvailability()) {
      console.warn(`Supabase is not available, skipping sync for ${tableName}`)
      return localItems // Возвращаем локальные данные без изменений
    }

    // 1. Получаем данные из Supabase
    const { data, error } = await supabase.from(tableName).select("*")

    if (error) {
      handleSupabaseError(error, `fetching ${tableName} from Supabase`)
      return localItems
    }

    const supabaseItems: SupabaseType[] = data as SupabaseType[]

    // 2. Определяем, какие элементы нужно добавить, обновить или удалить
    const localItemIds = new Set(localItems.map((item: any) => item.id))
    const supabaseItemIds = new Set(supabaseItems.map((item: any) => item.id))

    const itemsToAdd = localItems.filter((item: any) => !supabaseItemIds.has(item.id))
    const itemsToUpdate = localItems.filter((item: any) => supabaseItemIds.has(item.id))
    const itemsToDelete = supabaseItems.filter((item: any) => !localItemIds.has(item.id))

    // 3. Выполняем операции с Supabase
    for (const item of itemsToAdd) {
      const { error } = await supabase.from(tableName).insert([mapToSupabase(item)])
      if (error) {
        handleSupabaseError(error, `adding to ${tableName}`)
      }
    }

    for (const item of itemsToUpdate) {
      const { error } = await supabase
        .from(tableName)
        .update(mapToSupabase(item))
        .eq("id", (item as any).id)
      if (error) {
        handleSupabaseError(error, `updating in ${tableName}`)
      }
    }

    for (const item of itemsToDelete) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", (item as any).id)
      if (error) {
        handleSupabaseError(error, `deleting from ${tableName}`)
      }
    }

    // 4. Получаем обновленные данные из Supabase
    const { data: updatedData, error: updatedError } = await supabase.from(tableName).select("*")

    if (updatedError) {
      handleSupabaseError(updatedError, `fetching updated ${tableName} from Supabase`)
      return localItems
    }

    const updatedSupabaseItems: SupabaseType[] = updatedData as SupabaseType[]

    // 5. Преобразуем данные Supabase в локальный формат
    const syncedItems: LocalType[] = updatedSupabaseItems.map(mapToLocal)

    return syncedItems
  } catch (error) {
    handleSupabaseError(error, `syncing with ${tableName}`)
    return localItems
  }
}

// Generic function to save items to Supabase
export async function saveToSupabase<LocalType, SupabaseType>(
  items: LocalType[],
  tableName: string,
  mapToSupabase: (item: LocalType) => SupabaseType,
): Promise<boolean> {
  try {
    // Проверяем доступность Supabase
    if (!getSupabaseAvailability()) {
      console.warn(`Supabase is not available, skipping saveToSupabase for ${tableName}`)
      return false
    }

    // 1. Преобразуем элементы в формат Supabase
    const supabaseItems: SupabaseType[] = items.map(mapToSupabase)

    // 2. Удаляем все существующие записи
    const { error: deleteError } = await supabase.from(tableName).delete().not("id", "is", null)

    if (deleteError) {
      handleSupabaseError(deleteError, `deleting existing records from ${tableName}`)
      return false
    }

    // 3. Вставляем новые записи
    if (supabaseItems.length > 0) {
      const { error: insertError } = await supabase.from(tableName).insert(supabaseItems)

      if (insertError) {
        handleSupabaseError(insertError, `inserting new records into ${tableName}`)
        return false
      }
    }

    return true
  } catch (error) {
    handleSupabaseError(error, `saving to ${tableName}`)
    return false
  }
}
