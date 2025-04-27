import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { TelegramUpdate } from "@/lib/types/telegram-types"
import { generateRegistrationCode, handleRegisterCommand, handleStartCommand } from "@/lib/telegram-utils"

// Токен Telegram бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"

// Обработчик POST-запросов от Telegram
export async function POST(request: Request) {
  try {
    // Проверяем токен для безопасности
    const url = new URL(request.url)
    const token = url.searchParams.get("token")

    if (token !== TELEGRAM_BOT_TOKEN) {
      console.error("Invalid token in webhook request")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Получаем данные обновления
    const update: TelegramUpdate = await request.json()
    console.log("Received Telegram update:", JSON.stringify(update))

    // Обрабатываем только сообщения
    if (!update.message) {
      return NextResponse.json({ success: true, message: "No message to process" })
    }

    const message = update.message
    const chat = message.chat
    const from = message.from

    // Если это не личное сообщение или отправитель - бот, игнорируем
    if (chat.type !== "private" || (from && from.is_bot)) {
      return NextResponse.json({ success: true, message: "Ignoring non-private or bot message" })
    }

    // Сохраняем или обновляем информацию о пользователе
    if (from) {
      await saveOrUpdateUser(from.id, chat.id, from.username, from.first_name, from.last_name)
    }

    // Обрабатываем команды
    if (message.text && message.entities) {
      const commandEntities = message.entities.filter((entity) => entity.type === "bot_command")

      for (const entity of commandEntities) {
        const command = message.text.substring(entity.offset, entity.offset + entity.length)

        if (command === "/start") {
          await handleStartCommand(chat.id)
        } else if (command.startsWith("/register")) {
          const args = message.text.substring(entity.offset + entity.length).trim()
          await handleRegisterCommand(chat.id, args)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Update processed" })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

// Функция для сохранения или обновления информации о пользователе
async function saveOrUpdateUser(
  userId: number,
  chatId: number,
  username?: string,
  firstName?: string,
  lastName?: string,
) {
  try {
    // Проверяем, существует ли пользователь
    const { data: existingUser, error: fetchError } = await supabase
      .from("telegram_users")
      .select("*")
      .eq("chat_id", chatId)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 - запись не найдена
      console.error("Error fetching user:", fetchError)
      return
    }

    if (existingUser) {
      // Обновляем существующего пользователя
      const { error: updateError } = await supabase
        .from("telegram_users")
        .update({
          username: username || existingUser.username,
          first_name: firstName || existingUser.first_name,
          last_name: lastName || existingUser.last_name,
          updated_at: new Date().toISOString(),
        })
        .eq("chat_id", chatId)

      if (updateError) {
        console.error("Error updating user:", updateError)
      }
    } else {
      // Создаем нового пользователя
      const registrationCode = generateRegistrationCode()

      const { error: insertError } = await supabase.from("telegram_users").insert({
        username: username || null,
        chat_id: chatId,
        first_name: firstName || null,
        last_name: lastName || null,
        is_registered: false,
        registration_code: registrationCode,
      })

      if (insertError) {
        console.error("Error inserting user:", insertError)
      }
    }
  } catch (error) {
    console.error("Error in saveOrUpdateUser:", error)
  }
}

// Настройка GET-маршрута для проверки работоспособности веб-хука
export async function GET() {
  return NextResponse.json({ success: true, message: "Telegram webhook is active" })
}
