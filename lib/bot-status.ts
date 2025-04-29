import { supabase } from "./supabase"
import { TELEGRAM_BOT_TOKEN } from "./types/schedule-types"

export interface BotStatus {
  isActive: boolean
  username?: string
  firstName?: string
  id?: number
  canSendMessages: boolean
  webhookInfo?: any
  error?: string
}

/**
 * Проверяет статус Telegram бота
 * @returns Информация о статусе бота
 */
export async function checkBotStatus(): Promise<BotStatus> {
  try {
    // Проверяем, что токен бота задан
    if (!TELEGRAM_BOT_TOKEN) {
      return {
        isActive: false,
        canSendMessages: false,
        error: "Токен бота не задан",
      }
    }

    // Получаем информацию о боте
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const botInfoData = await botInfoResponse.json()

    if (!botInfoData.ok) {
      return {
        isActive: false,
        canSendMessages: false,
        error: botInfoData.description || "Не удалось получить информацию о боте",
      }
    }

    // Получаем информацию о вебхуке
    const webhookResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const webhookData = await webhookResponse.json()

    const webhookInfo = webhookData.ok ? webhookData.result : null
    const webhookUrl = webhookInfo?.url || ""
    const hasWebhook = !!webhookUrl && webhookUrl.length > 0

    return {
      isActive: true,
      username: botInfoData.result.username,
      firstName: botInfoData.result.first_name,
      id: botInfoData.result.id,
      canSendMessages: true,
      webhookInfo: webhookInfo,
      error: hasWebhook ? undefined : "Вебхук не настроен",
    }
  } catch (error) {
    console.error("Ошибка при проверке статуса бота:", error)
    return {
      isActive: false,
      canSendMessages: false,
      error: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

/**
 * Проверяет, может ли бот отправить сообщение в указанный чат
 * @param chatId ID чата для проверки
 * @returns true, если бот может отправлять сообщения в чат
 */
export async function canBotSendMessage(chatId: number): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      return false
    }

    // Пытаемся отправить временное сообщение для проверки доступа
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    })

    const data = await response.json()
    return data.ok === true
  } catch (error) {
    console.error("Ошибка при проверке доступа к чату:", error)
    return false
  }
}

/**
 * Сохраняет лог отправки уведомления
 * @param employeeId ID сотрудника
 * @param chatId ID чата
 * @param messageType Тип сообщения
 * @param success Успешно ли отправлено
 * @param errorMessage Сообщение об ошибке (если есть)
 */
export async function logNotification(
  employeeId: string,
  chatId: number | undefined,
  messageType: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  try {
    await supabase.from("notification_logs").insert({
      employee_id: employeeId,
      chat_id: chatId,
      message_type: messageType,
      success: success,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Ошибка при сохранении лога уведомления:", error)
  }
}
