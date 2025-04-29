import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Функция для форматирования даты в формате "DD.MM.YYYY"
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

// Функция для получения названия дня недели
export function getDayOfWeekName(dayOfWeek: number): string {
  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
  return days[dayOfWeek]
}

// Функция для получения короткого названия дня недели
export function getShortDayOfWeekName(dayOfWeek: number): string {
  const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
  return days[dayOfWeek]
}

// Функция для получения названия месяца
export function getMonthName(month: number): string {
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ]
  return months[month]
}

// Функция для получения названия месяца в родительном падеже
export function getMonthNameGenitive(month: number): string {
  const months = [
    "Января",
    "Февраля",
    "Марта",
    "Апреля",
    "Мая",
    "Июня",
    "Июля",
    "Августа",
    "Сентября",
    "Октября",
    "Ноября",
    "Декабря",
  ]
  return months[month]
}

// Функция для проверки, является ли дата выходным днем
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 - воскресенье, 6 - суббота
}

// Функция для получения первого дня недели (понедельник) для заданной даты
export function getFirstDayOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Корректировка для недели, начинающейся с понедельника
  return new Date(date.setDate(diff))
}

// Функция для получения последнего дня недели (воскресенье) для заданной даты
export function getLastDayOfWeek(date: Date): Date {
  const firstDay = getFirstDayOfWeek(date)
  return new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + 6)
}

// Функция для получения первого дня месяца
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

// Функция для получения последнего дня месяца
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0)
}

// Функция для форматирования времени в формате "HH:MM"
export function formatTime(timeString: string): string {
  if (!timeString) return ""
  const [hours, minutes] = timeString.split(":")
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
}

// Функция для преобразования даты в строку в формате "YYYY-MM-DD"
export function dateToString(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Функция для сравнения двух дат (только день, месяц и год)
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Функция для добавления дней к дате
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Функция для вычисления разницы в днях между двумя датами
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000 // часы*минуты*секунды*миллисекунды
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.round(diffTime / oneDay)
}

// Функция для проверки, является ли строка действительной датой в формате "YYYY-MM-DD"
export function isValidDateString(dateString: string): boolean {
  if (!dateString) return false
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// Функция для генерации случайного цвета
export function getRandomColor(): string {
  const letters = "0123456789ABCDEF"
  let color = "#"
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

// Функция для генерации случайного ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Функция для проверки, является ли объект пустым
export function isEmptyObject(obj: object): boolean {
  return Object.keys(obj).length === 0
}

// Функция для глубокого клонирования объекта
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Функция для задержки выполнения (промис с таймаутом)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Функция для форматирования числа с разделителями тысяч
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

// Функция для преобразования первой буквы строки в заглавную
export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}
