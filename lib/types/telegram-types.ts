// Типы данных для работы с Telegram API

// Тип для пользователя Telegram
export interface TelegramUser {
  id: number
  username?: string
  first_name: string
  last_name?: string
  is_bot: boolean
}

// Тип для чата Telegram
export interface TelegramChat {
  id: number
  type: "private" | "group" | "supergroup" | "channel"
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

// Тип для сообщения Telegram
export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  entities?: TelegramMessageEntity[]
}

// Тип для сущности в сообщении (команды, упоминания и т.д.)
export interface TelegramMessageEntity {
  type: "bot_command" | "mention" | "hashtag" | "url" | "email" | "bold" | "italic" | "code" | "pre" | "text_link"
  offset: number
  length: number
}

// Тип для обновления от Telegram
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

// Тип для callback query (нажатия на кнопки)
export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

// Тип для хранения данных пользователя Telegram в базе данных
export interface TelegramUserRecord {
  id: number
  username: string | null
  chat_id: number
  employee_id: string | null
  first_name: string | null
  last_name: string | null
  is_registered: boolean
  registration_code: string | null
  created_at: string
  updated_at: string
}

// Тип для ответа на запрос регистрации
export interface RegistrationResponse {
  success: boolean
  message: string
  code?: string
}
