import { format, addDays, startOfWeek, getDay, parseISO, addWeeks, subWeeks, isWeekend } from "date-fns"
import { ru } from "date-fns/locale"
import type { Employee, DayPreference, ScheduleEntry, ScheduleSettings, ShiftStatus } from "./types/schedule-types"
import { generateId } from "./db-schedule"

// Получение дат недели
export const getWeekDates = (date: Date): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Начинаем с понедельника
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

// Переход к предыдущей неделе
export const getPreviousWeek = (date: Date): Date => {
  return subWeeks(date, 1)
}

// Переход к следующей неделе
export const getNextWeek = (date: Date): Date => {
  return addWeeks(date, 1)
}

// Форматирование даты
export const formatDate = (date: Date | string, formatStr: string): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return format(dateObj, formatStr, { locale: ru })
  } catch (error) {
    console.error("Error formatting date:", error)
    return ""
  }
}

// Получение дня недели (0-6, где 0 - понедельник)
export const getDayOfWeek = (date: Date | string): number => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    const day = getDay(dateObj)
    // Преобразуем из формата, где 0 - воскресенье, в формат, где 0 - понедельник
    return day === 0 ? 6 : day - 1
  } catch (error) {
    console.error("Error getting day of week:", error)
    return 0
  }
}

// Проверка, является ли день выходным
export const isWeekendDay = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date
    return isWeekend(dateObj)
  } catch (error) {
    console.error("Error checking if day is weekend:", error)
    return false
  }
}

// Преобразование даты в строку ISO (YYYY-MM-DD)
export const dateToISOString = (date: Date): string => {
  return date.toISOString().split("T")[0]
}

// Генерация графика
export const generateSchedule = (
  employees: Employee[],
  dayPreferences: DayPreference[],
  weekDates: Date[],
  settings: ScheduleSettings,
): ScheduleEntry[] => {
  // Максимальное количество попыток генерации
  const maxAttempts = settings.maxGenerationAttempts
  let bestSchedule: ScheduleEntry[] = []
  let bestScore = -1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const schedule = generateScheduleAttempt(employees, dayPreferences, weekDates, settings)
    const score = evaluateSchedule(schedule, employees, dayPreferences, weekDates, settings)

    if (score > bestScore) {
      bestScore = score
      bestSchedule = schedule
    }

    // Если нашли идеальный график, прекращаем поиск
    if (score === 100) break
  }

  return bestSchedule
}

// Одна попытка генерации графика
const generateScheduleAttempt = (
  employees: Employee[],
  dayPreferences: DayPreference[],
  weekDates: Date[],
  settings: ScheduleSettings,
): ScheduleEntry[] => {
  const schedule: ScheduleEntry[] = []
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  // Обрабатываем сотрудников с графиком 5/2
  employees
    .filter((employee) => employee.workScheduleMode === "5/2")
    .forEach((employee) => {
      weekDateStrings.forEach((dateStr, dayIndex) => {
        // dayIndex: 0 = пн, 1 = вт, ..., 6 = вс
        const status: ShiftStatus = dayIndex < 5 ? 1 : 0 // 1 = рабочий, 0 = выходной
        const hours = status === 1 ? 12 : undefined

        schedule.push({
          id: generateId(),
          employeeId: employee.id,
          date: dateStr,
          status,
          hours,
          createdAt: new Date().toISOString(),
        })
      })
    })

  // Обрабатываем сотрудников с фиксированным графиком
  employees
    .filter((employee) => employee.workScheduleMode === "fixed" && employee.fixedWorkDays)
    .forEach((employee) => {
      weekDateStrings.forEach((dateStr, dayIndex) => {
        // Проверяем, является ли день рабочим для этого сотрудника
        const isWorkDay = employee.fixedWorkDays?.includes(dayIndex)
        const status: ShiftStatus = isWorkDay ? 1 : 0
        const hours = status === 1 ? (dayIndex >= 5 ? 11 : 12) : undefined

        schedule.push({
          id: generateId(),
          employeeId: employee.id,
          date: dateStr,
          status,
          hours,
          createdAt: new Date().toISOString(),
        })
      })
    })

  // Обрабатываем сотрудников с гибким графиком
  const flexibleEmployees = employees.filter((emp) => emp.workScheduleMode === "flexible")

  // Для каждого дня недели определяем, кто будет работать
  weekDateStrings.forEach((dateStr, dayIndex) => {
    // Получаем предпочтения сотрудников на этот день
    const dayPrefs = dayPreferences.filter(
      (pref) =>
        pref.date === dateStr && pref.isPreferred && flexibleEmployees.some((emp) => emp.id === pref.employeeId),
    )

    // Сотрудники, которые хотят выходной в этот день
    const employeesWantingOff = dayPrefs.map((pref) => pref.employeeId)

    // Сортируем сотрудников: сначала те, кто хочет выходной
    const sortedEmployees = [...flexibleEmployees].sort((a, b) => {
      const aWantsOff = employeesWantingOff.includes(a.id)
      const bWantsOff = employeesWantingOff.includes(b.id)

      if (aWantsOff && !bWantsOff) return -1
      if (!aWantsOff && bWantsOff) return 1
      return 0
    })

    // Определяем, сколько сотрудников должны работать в этот день
    // Теперь используем точное количество сотрудников
    const requiredEmployeesCount = settings.exactEmployeesPerDay

    // Проверяем, достаточно ли сотрудников для работы
    if (flexibleEmployees.length < requiredEmployeesCount) {
      // Если сотрудников меньше, чем требуется, все работают
      sortedEmployees.forEach((employee) => {
        const status: ShiftStatus = 1 // Все работают
        const hours = dayIndex >= 5 ? 11 : 12

        schedule.push({
          id: generateId(),
          employeeId: employee.id,
          date: dateStr,
          status,
          hours,
          createdAt: new Date().toISOString(),
        })
      })
    } else {
      // Если сотрудников достаточно, выбираем кто будет работать

      // Сначала проверяем ограничения для каждого сотрудника
      const employeeConstraints = sortedEmployees.map((employee) => {
        // Получаем текущее количество рабочих и выходных дней для сотрудника
        const employeeEntries = schedule.filter((entry) => entry.employeeId === employee.id)
        const workDaysCount = employeeEntries.filter((entry) => entry.status > 0).length
        const offDaysCount = employeeEntries.filter((entry) => entry.status === 0).length

        // Определяем, может ли сотрудник взять выходной
        const canTakeOff = workDaysCount + (7 - dayIndex - 1) >= employee.maxWorkDays - (7 - employee.minOffDays)

        // Определяем, может ли сотрудник работать
        const canWork = offDaysCount + (7 - dayIndex - 1) >= employee.minOffDays

        // Проверяем, является ли день фиксированным выходным для сотрудника
        const isFixedOffDay = employee.fixedOffDays?.includes(dayIndex)

        return {
          employee,
          canTakeOff,
          canWork,
          isFixedOffDay,
          wantsOff: employeesWantingOff.includes(employee.id),
        }
      })

      // Определяем, кто должен работать
      let workingEmployees: Employee[] = []
      const offEmployees: Employee[] = []

      // Сначала добавляем тех, кто не может взять выходной
      employeeConstraints.forEach(({ employee, canTakeOff, isFixedOffDay }) => {
        if (!canTakeOff && !isFixedOffDay) {
          workingEmployees.push(employee)
        }
      })

      // Затем добавляем тех, у кого фиксированный выходной
      employeeConstraints.forEach(({ employee, isFixedOffDay }) => {
        if (isFixedOffDay) {
          offEmployees.push(employee)
        }
      })

      // Если у нас уже больше работающих, чем нужно, это проблема
      if (workingEmployees.length > requiredEmployeesCount) {
        // В этом случае просто берем первых requiredEmployeesCount сотрудников
        workingEmployees = workingEmployees.slice(0, requiredEmployeesCount)
      } else if (workingEmployees.length < requiredEmployeesCount) {
        // Нам нужно добавить еще сотрудников до нужного количества
        const remainingCount = requiredEmployeesCount - workingEmployees.length

        // Отфильтровываем тех, кто уже в списках и кто не может работать
        const availableEmployees = employeeConstraints
          .filter(
            ({ employee, canWork, isFixedOffDay }) =>
              canWork &&
              !isFixedOffDay &&
              !workingEmployees.some((e) => e.id === employee.id) &&
              !offEmployees.some((e) => e.id === employee.id),
          )
          // Сортируем по предпочтениям (те, кто не хочет выходной, идут первыми)
          .sort((a, b) => {
            if (a.wantsOff && !b.wantsOff) return 1
            if (!a.wantsOff && b.wantsOff) return -1
            return 0
          })
          .map(({ employee }) => employee)

        // Добавляем нужное количество сотрудников
        workingEmployees = [...workingEmployees, ...availableEmployees.slice(0, remainingCount)]
      }

      // Теперь у нас есть список работающих сотрудников
      // Все остальные получают выходной
      sortedEmployees.forEach((employee) => {
        const isWorking = workingEmployees.some((e) => e.id === employee.id)
        const status: ShiftStatus = isWorking ? 1 : 0
        const hours = isWorking ? (dayIndex >= 5 ? 11 : 12) : undefined

        schedule.push({
          id: generateId(),
          employeeId: employee.id,
          date: dateStr,
          status,
          hours,
          createdAt: new Date().toISOString(),
        })
      })
    }
  })

  return schedule
}

// Оценка качества графика
const evaluateSchedule = (
  schedule: ScheduleEntry[],
  employees: Employee[],
  dayPreferences: DayPreference[],
  weekDates: Date[],
  settings: ScheduleSettings,
): number => {
  let score = 100 // Начинаем со 100 баллов и вычитаем за нарушения
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))
  const flexibleEmployees = employees.filter((emp) => emp.workScheduleMode === "flexible")

  // Проверяем каждый день на соответствие требованиям
  weekDateStrings.forEach((dateStr, dayIndex) => {
    // Проверяем количество работающих сотрудников с гибким графиком
    const workingFlexibleCount = schedule.filter(
      (entry) =>
        entry.date === dateStr && entry.status > 0 && flexibleEmployees.some((emp) => emp.id === entry.employeeId),
    ).length

    // Если количество не соответствует требуемому, сильно снижаем оценку
    if (workingFlexibleCount !== settings.exactEmployeesPerDay) {
      score -= 50 // Серьезное нарушение
    }

    // Проверяем соответствие предпочтениям сотрудников
    const dayPrefs = dayPreferences.filter((pref) => pref.date === dateStr && pref.isPreferred)

    dayPrefs.forEach((pref) => {
      const entry = schedule.find((e) => e.employeeId === pref.employeeId && e.date === dateStr)
      if (entry && entry.status > 0) {
        // Сотрудник хотел выходной, но работает
        score -= 5 // Небольшое нарушение
      }
    })
  })

  // Проверяем соблюдение ограничений для каждого сотрудника
  flexibleEmployees.forEach((employee) => {
    const employeeEntries = schedule.filter((entry) => entry.employeeId === employee.id)
    const workDaysCount = employeeEntries.filter((entry) => entry.status > 0).length
    const offDaysCount = employeeEntries.filter((entry) => entry.status === 0).length

    // Проверяем максимальное количество рабочих дней
    if (workDaysCount > employee.maxWorkDays) {
      score -= 20 // Серьезное нарушение
    }

    // Проверяем минимальное количество выходных дней
    if (offDaysCount < employee.minOffDays) {
      score -= 20 // Серьезное нарушение
    }
  })

  // Ограничиваем оценку от 0 до 100
  return Math.max(0, Math.min(100, score))
}

// Проверка, доступен ли выбор выходных дней
export const isDayOffSelectionAvailable = (settings: ScheduleSettings): boolean => {
  if (!settings.autoGenerationEnabled) return true

  const now = new Date()
  const currentDay = getDayOfWeek(now)

  // Если текущий день недели меньше дня автогенерации, то выбор доступен
  return currentDay < settings.autoGenerationDay
}

// Получение максимального количества выходных дней для сотрудника
export const getMaxOffDaysForEmployee = (employee: Employee): number => {
  return 7 - employee.maxWorkDays
}

// Проверка, превышает ли количество выбранных выходных максимально допустимое
export const isOffDaysLimitExceeded = (
  employee: Employee,
  dayPreferences: DayPreference[],
  weekDates: Date[],
): boolean => {
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  // Считаем количество выбранных выходных для этой недели
  const selectedOffDays = dayPreferences.filter(
    (pref) => weekDateStrings.includes(pref.date) && pref.employeeId === employee.id && pref.isPreferred,
  ).length

  return selectedOffDays > getMaxOffDaysForEmployee(employee)
}

// Получение количества выбранных выходных для сотрудника на неделю
export const getSelectedOffDaysCount = (
  employeeId: string,
  dayPreferences: DayPreference[],
  weekDates: Date[],
): number => {
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  return dayPreferences.filter(
    (pref) => weekDateStrings.includes(pref.date) && pref.employeeId === employeeId && pref.isPreferred,
  ).length
}

// Проверка конфликтов выходных дней
export const checkDayOffConflicts = (
  employees: Employee[],
  dayPreferences: DayPreference[],
  weekDates: Date[],
  settings: ScheduleSettings,
): { [key: string]: string[] } => {
  const conflicts: { [key: string]: string[] } = {}
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  // Считаем количество сотрудников с гибким графиком
  const flexibleEmployeesCount = employees.filter((emp) => emp.workScheduleMode === "flexible").length

  // Проверяем каждый день недели на конфликты
  weekDateStrings.forEach((dateStr) => {
    // Получаем всех сотрудников, которые хотят выходной в этот день
    const employeesWantingOff = dayPreferences
      .filter((pref) => pref.date === dateStr && pref.isPreferred)
      .map((pref) => pref.employeeId)

    // Получаем имена этих сотрудников
    const employeeNames = employeesWantingOff.map((id) => {
      const emp = employees.find((e) => e.id === id)
      return emp ? emp.name : "Неизвестный"
    })

    // Если слишком много сотрудников хотят выходной в этот день
    if (employeesWantingOff.length > flexibleEmployeesCount - settings.exactEmployeesPerDay) {
      conflicts[dateStr] = employeeNames
    }
  })

  return conflicts
}

// Отправка сообщения в Telegram
export const sendTelegramMessage = async (username: string, message: string): Promise<boolean> => {
  try {
    const TELEGRAM_BOT_TOKEN = "7728971043:AAFAzIWUNCQN1OI5dFxFpDmJc-45SUBlwoA"

    // Удаляем символ @ из имени пользователя, если он есть
    const cleanUsername = username.startsWith("@") ? username.substring(1) : username

    // Сначала попробуем получить chat_id пользователя
    // Это нужно сделать один раз и сохранить в базе данных
    const getChatResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`, {
      method: "GET",
    })

    const updatesData = await getChatResponse.json()
    console.log("Telegram updates:", updatesData)

    // Ищем сообщение от нужного пользователя
    let chatId = null
    if (updatesData.ok && updatesData.result) {
      for (const update of updatesData.result) {
        if (
          update.message &&
          update.message.from &&
          update.message.from.username &&
          update.message.from.username.toLowerCase() === cleanUsername.toLowerCase()
        ) {
          chatId = update.message.chat.id
          console.log(`Found chat_id for ${cleanUsername}: ${chatId}`)
          break
        }
      }
    }

    // Если не нашли chat_id, пробуем отправить по username
    if (!chatId) {
      console.log(`Could not find chat_id for ${cleanUsername}, trying to send by username`)
      const sendMessageResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: `@${cleanUsername}`,
          text: message,
          parse_mode: "HTML",
        }),
      })

      const messageData = await sendMessageResponse.json()
      console.log("Telegram response by username:", messageData)

      if (messageData.ok) {
        return true
      } else {
        console.error("Telegram API error by username:", messageData.description)
        return false
      }
    } else {
      // Отправляем сообщение по chat_id
      const sendMessageResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      })

      const messageData = await sendMessageResponse.json()
      console.log("Telegram response by chat_id:", messageData)

      if (messageData.ok) {
        return true
      } else {
        console.error("Telegram API error by chat_id:", messageData.description)
        return false
      }
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return false
  }
}

// Формирование сообщения о графике для сотрудника
export const generateScheduleMessage = (
  employee: Employee,
  scheduleEntries: ScheduleEntry[],
  weekDates: Date[],
): string => {
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  let message = `<b>График работы для ${employee.name}</b>\n\n`
  message += `<b>Неделя:</b> ${formatDate(weekDates[0], "dd.MM")} - ${formatDate(weekDates[6], "dd.MM")}\n\n`

  weekDates.forEach((date, index) => {
    const dateStr = weekDateStrings[index]
    const entry = scheduleEntries.find((e) => e.employeeId === employee.id && e.date === dateStr)

    const dayStatus = entry?.status === 0 ? "Выходной" : `Рабочий день (${entry?.hours || (index >= 5 ? 11 : 12)} ч)`

    message += `<b>${formatDate(date, "EEE, dd.MM")}:</b> ${dayStatus}\n`
  })

  return message
}

// Формирование сообщения о выбранных выходных
export const generateDayOffMessage = (
  employee: Employee,
  dayPreferences: DayPreference[],
  weekDates: Date[],
): string => {
  const weekDateStrings = weekDates.map((date) => dateToISOString(date))

  let message = `<b>Выбранные выходные для ${employee.name}</b>\n\n`
  message += `<b>Неделя:</b> ${formatDate(weekDates[0], "dd.MM")} - ${formatDate(weekDates[6], "dd.MM")}\n\n`

  const selectedDays = dayPreferences
    .filter((pref) => pref.employeeId === employee.id && weekDateStrings.includes(pref.date) && pref.isPreferred)
    .map((pref) => {
      const date = parseISO(pref.date)
      return formatDate(date, "EEE, dd.MM")
    })

  if (selectedDays.length > 0) {
    message += `<b>Выбранные выходные:</b>\n${selectedDays.map((day) => `- ${day}`).join("\n")}\n\n`
  } else {
    message += "Вы не выбрали предпочитаемые выходные на эту неделю.\n\n"
  }

  message += `Максимальное количество выходных: ${getMaxOffDaysForEmployee(employee)}`

  return message
}

// Формирование сообщения о готовности графика
export const generateScheduleReadyMessage = (weekDates: Date[]): string => {
  return (
    `<b>График работы готов!</b>\n\n` +
    `График на неделю ${formatDate(weekDates[0], "dd.MM")} - ${formatDate(weekDates[6], "dd.MM")} сформирован и доступен в системе.`
  )
}

// Формирование сообщения-напоминания о рабочем дне
export const generateWorkDayReminderMessage = (employee: Employee, date: Date, hours: number): string => {
  return (
    `<b>Напоминание о рабочем дне</b>\n\n` +
    `${employee.name}, напоминаем, что завтра (${formatDate(date, "EEE, dd.MM")}) у вас рабочий день.\n` +
    `Продолжительность смены: ${hours} часов.`
  )
}
