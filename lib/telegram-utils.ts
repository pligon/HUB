import { supabase } from "./supabase"
import type { RegistrationResponse } from "./types/telegram-types"

// Токен Telegram бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"

// Генерация кода регистрации
export function generateRegistrationCode(): string {
  // Генерируем 6-значный код
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Обработка команды /start
export async function handleStartCommand(chatId: number): Promise<void> {
  const welcomeMessage = `
Добро пожаловать в бота для уведомлений графика бара!

Чтобы связать свой аккаунт Telegram с аккаунтом в системе, используйте команду /register с кодом, который вы получите в приложении.

Например: /register 123456
`

  await sendTelegramMessage(chatId, welcomeMessage)
}

// Обработка команды /register
export async function handleRegisterCommand(chatId: number, code: string): Promise<void> {
  if (!code || code.trim() === "") {
    await sendTelegramMessage(chatId, "Пожалуйста, укажите код регистрации. Например: /register 123456")
    return
  }

  const registrationResult = await registerUserWithCode(chatId, code.trim())
  await sendTelegramMessage(chatId, registrationResult.message)
}

// Регистрация пользователя с кодом
export async function registerUserWithCode(chatId: number, code: string): Promise<RegistrationResponse> {
  try {
    // Ищем сотрудника с таким кодом регистрации
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, registration_code")
      .eq("registration_code", code)
      .single()

    if (employeeError || !employee) {
      return {
        success: false,
        message: "Неверный код регистрации. Пожалуйста, проверьте код и попробуйте снова.",
      }
    }

    // Обновляем запись пользователя Telegram
    const { error: updateError } = await supabase
      .from("telegram_users")
      .update({
        employee_id: employee.id,
        is_registered: true,
        registration_code: null, // Очищаем код после использования
      })
      .eq("chat_id", chatId)

    if (updateError) {
      console.error("Error updating telegram user:", updateError)
      return {
        success: false,
        message: "Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.",
      }
    }

    // Очищаем код регистрации у сотрудника
    await supabase.from("employees").update({ registration_code: null }).eq("id", employee.id)

    return {
      success: true,
      message: `Регистрация успешно завершена! Вы зарегистрированы как ${employee.name}.`,
    }
  } catch (error) {
    console.error("Error in registerUserWithCode:", error)
    return {
      success: false,
      message: "Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.",
    }
  }
}

// Отправка сообщения в Telegram
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error("Telegram API error:", data.description)
      return false
    }

    return true
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return false
  }
}

// Получение chat_id по имени пользователя
export async function getChatIdByUsername(username: string): Promise<number | null> {
  try {
    // Удаляем символ @ из имени пользователя, если он есть
    const cleanUsername = username.startsWith("@") ? username.substring(1) : username

    // Ищем пользователя в базе данных
    const { data, error } = await supabase
      .from("telegram_users")
      .select("chat_id")
      .eq("username", cleanUsername)
      .single()

    if (error || !data) {
      console.error("Error getting chat_id by username:", error)
      return null
    }

    return data.chat_id
  } catch (error) {
    console.error("Error in getChatIdByUsername:", error)
    return null
  }
}

// Генерация кода регистрации для сотрудника
export async function generateRegistrationCodeForEmployee(employeeId: string): Promise<string | null> {
  try {
    const code = generateRegistrationCode()

    // Обновляем код регистрации сотрудника
    const { error } = await supabase.from("employees").update({ registration_code: code }).eq("id", employeeId)

    if (error) {
      console.error("Error updating employee registration code:", error)
      return null
    }

    return code
  } catch (error) {
    console.error("Error in generateRegistrationCodeForEmployee:", error)
    return null
  }
}
