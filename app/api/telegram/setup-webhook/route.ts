import { NextResponse } from "next/server"

// Токен Telegram бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"

// Базовый URL приложения (должен быть доступен из интернета)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com"

export async function GET(request: Request) {
  try {
    // Получаем URL для веб-хука
    const webhookUrl = `${BASE_URL}/api/telegram/webhook?token=${TELEGRAM_BOT_TOKEN}`

    // Настраиваем веб-хук
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error("Error setting webhook:", data.description)
      return NextResponse.json({ success: false, message: data.description }, { status: 500 })
    }

    // Получаем информацию о текущем веб-хуке
    const infoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const infoData = await infoResponse.json()

    return NextResponse.json({
      success: true,
      message: "Webhook set successfully",
      webhook: infoData.result,
    })
  } catch (error) {
    console.error("Error setting up webhook:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
