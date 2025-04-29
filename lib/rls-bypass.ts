import { handleSupabaseError } from "./supabase"

// Функция для выполнения операции с обходом RLS при необходимости
export async function executeWithRlsBypass<T>(
  operation: string,
  regularFn: () => Promise<T>,
  adminFn: () => Promise<T>,
): Promise<T> {
  try {
    // Сначала пробуем с обычным клиентом
    return await regularFn()
  } catch (error: any) {
    // Если ошибка связана с RLS, пробуем с админ-клиентом
    if (error.message && error.message.includes("row-level security")) {
      console.log(`Используем админ-клиент для обхода RLS при операции: ${operation}`)
      try {
        return await adminFn()
      } catch (adminError) {
        handleSupabaseError(adminError, `${operation} (админ)`)
        throw adminError
      }
    }

    // Если ошибка не связана с RLS, просто пробрасываем её дальше
    handleSupabaseError(error, operation)
    throw error
  }
}
