"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { format, addDays, startOfWeek, getDay, parseISO, addWeeks, subWeeks } from "date-fns"
import { ru } from "date-fns/locale"
import {
  CalendarIcon,
  LogIn,
  LogOut,
  Lock,
  UserPlus,
  UserMinus,
  Settings,
  RefreshCw,
  Save,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type Employee, type DayPreference, type ScheduleEntry, initDB, loadFromStore, saveToStore } from "@/lib/db"

// Utility function to generate a unique ID
const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9)

// Color options for employees
const colorOptions = [
  { name: "Красный", value: "#FF5733" },
  { name: "Зеленый", value: "#33FF57" },
  { name: "Синий", value: "#3357FF" },
  { name: "Фиолетовый", value: "#F033FF" },
  { name: "Оранжевый", value: "#FF9933" },
  { name: "Желтый", value: "#FFFF33" },
  { name: "Голубой", value: "#33FFFF" },
  { name: "Розовый", value: "#FF33A8" },
]

// Дни недели
const WEEKDAYS = [
  { value: 0, label: "Понедельник" },
  { value: 1, label: "Вторник" },
  { value: 2, label: "Среда" },
  { value: 3, label: "Четверг" },
  { value: 4, label: "Пятница" },
  { value: 5, label: "Суббота" },
  { value: 6, label: "Воскресенье" },
]

// Функция для безопасного форматирования даты
const safeFormat = (date: Date | null | undefined, formatStr: string, options?: any) => {
  if (!date) return ""
  try {
    return format(date, formatStr, options)
  } catch (error) {
    console.error("Error formatting date:", error)
    return ""
  }
}

export default function ScheduleModule() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [dayPreferences, setDayPreferences] = useState<DayPreference[]>([])
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedWeekDates, setSelectedWeekDates] = useState<Date[]>([])
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: "",
    color: "#33FF57",
    workSchedule: "flexible",
    minWorkDays: 4,
    maxWorkDays: 6,
    minOffDays: 1,
    maxOffDays: 3,
    fixedWorkDays: [],
    fixedOffDays: [],
    isAdmin: false,
  })
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false)
  const [activeTab, setActiveTab] = useState("preferences")
  const [preferencesChanged, setPreferencesChanged] = useState(false)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [dayOffConflicts, setDayOffConflicts] = useState<{ [key: string]: string[] }>({})
  const [minFlexibleEmployees, setMinFlexibleEmployees] = useState(3)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { toast } = useToast()

  // Initialize database and load data
  useEffect(() => {
    const loadData = async () => {
      await initDB()

      // Загрузка сотрудников
      const loadedEmployees = await loadFromStore("employees")
      if (loadedEmployees.length === 0) {
        // Add default employees if none exist
        const defaultEmployees = [
          {
            id: "1",
            name: "Евсеенков Д.",
            color: "#FF5733",
            workSchedule: "5/2",
            minWorkDays: 5,
            maxWorkDays: 5,
            minOffDays: 2,
            maxOffDays: 2,
            isAdmin: true,
          },
          {
            id: "2",
            name: "Даша Б.",
            color: "#33FF57",
            workSchedule: "flexible",
            minWorkDays: 4,
            maxWorkDays: 6,
            minOffDays: 1,
            maxOffDays: 3,
            isAdmin: false,
          },
          {
            id: "3",
            name: "Иван С.",
            color: "#3357FF",
            workSchedule: "fixed",
            minWorkDays: 2,
            maxWorkDays: 2,
            minOffDays: 5,
            maxOffDays: 5,
            fixedWorkDays: [5, 6], // Суббота и воскресенье
            fixedOffDays: [0, 1, 2, 3, 4], // Пн-Пт
            isAdmin: false,
          },
        ]
        await saveToStore("employees", defaultEmployees)
        setEmployees(defaultEmployees)
      } else {
        setEmployees(loadedEmployees)
      }

      // Загрузка предпочтений
      const loadedPreferences = await loadFromStore("dayPreferences")
      setDayPreferences(loadedPreferences)

      // Загрузка расписания
      const loadedSchedule = await loadFromStore("scheduleEntries")
      setScheduleEntries(loadedSchedule)

      // Загрузка настроек
      const loadedSettings = await loadFromStore("settings")
      const minEmployeesSetting = loadedSettings.find((s) => s.key === "minFlexibleEmployees")
      if (minEmployeesSetting) {
        setMinFlexibleEmployees(minEmployeesSetting.value)
      } else {
        // Сохраняем настройку по умолчанию
        await saveToStore("settings", [...loadedSettings, { id: generateId(), key: "minFlexibleEmployees", value: 3 }])
      }
    }

    loadData()
    updateSelectedWeek(new Date())
  }, [])

  // Check for day off conflicts when preferences change
  useEffect(() => {
    if (selectedWeekDates.length === 0 || dayPreferences.length === 0) return

    // Count how many flexible employees we have
    const flexibleEmployeesCount = employees.filter((emp) => emp.workSchedule === "flexible").length

    // If we don't have enough flexible employees to meet the minimum requirement
    if (flexibleEmployeesCount < minFlexibleEmployees) {
      setWarningMessage(
        `Внимание: у вас всего ${flexibleEmployeesCount} сотрудников с гибким графиком, что меньше минимального требования (${minFlexibleEmployees}).`,
      )
      return
    }

    // Check each day of the week for conflicts
    const conflicts: { [key: string]: string[] } = {}

    selectedWeekDates.forEach((date) => {
      try {
        const dateStr = date.toISOString().split("T")[0]

        // Get all employees who prefer this day off
        const employeesWantingOff = dayPreferences
          .filter((pref) => pref.date === dateStr && pref.isPreferred)
          .map((pref) => pref.employeeId)

        // Get names of these employees
        const employeeNames = employeesWantingOff.map((id) => {
          const emp = employees.find((e) => e.id === id)
          return emp ? emp.name : "Неизвестный"
        })

        // If too many employees want this day off
        if (employeesWantingOff.length > flexibleEmployeesCount - minFlexibleEmployees) {
          conflicts[dateStr] = employeeNames
        }
      } catch (error) {
        console.error("Error checking day conflicts:", error)
      }
    })

    setDayOffConflicts(conflicts)

    // Set warning message if there are conflicts
    if (Object.keys(conflicts).length > 0) {
      setWarningMessage(
        `Обнаружены конфликты выходных дней. Некоторые сотрудники могут не получить выбранные выходные.`,
      )
    } else {
      setWarningMessage(null)
    }
  }, [dayPreferences, selectedWeekDates, employees, minFlexibleEmployees])

  // Update selected week dates when selected date changes
  const updateSelectedWeek = (date: Date) => {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Start from Monday
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      setSelectedWeekDates(weekDates)
    } catch (error) {
      console.error("Error in updateSelectedWeek:", error)
      // Fallback to current date if there's an error
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
      setSelectedWeekDates(weekDates)
    }
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    if (selectedWeekDates.length > 0) {
      const newDate = subWeeks(selectedWeekDates[0], 1)
      setSelectedDate(newDate)
      updateSelectedWeek(newDate)
    }
  }

  // Navigate to next week
  const goToNextWeek = () => {
    if (selectedWeekDates.length > 0) {
      const newDate = addWeeks(selectedWeekDates[0], 1)
      setSelectedDate(newDate)
      updateSelectedWeek(newDate)
    }
  }

  // Handle admin login
  const handleAdminLogin = () => {
    if (adminPassword === "2905") {
      setIsAdmin(true)
      setAdminPassword("")
      setIsAdminLoginOpen(false)
      toast({
        title: "Успешно",
        description: "Вы вошли как администратор",
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Неверный пароль",
        variant: "destructive",
      })
    }
  }

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false)
    toast({
      title: "Выход",
      description: "Вы вышли из режима администратора",
    })
  }

  // Handle user login
  const handleUserLogin = () => {
    const foundEmployee = employees.find((emp) => emp.name.toLowerCase() === userName.toLowerCase())

    if (foundEmployee) {
      setCurrentUser(foundEmployee)
      setUserName("")
      setIsUserLoginOpen(false)
      toast({
        title: "Успешно",
        description: `Вы вошли как ${foundEmployee.name}`,
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Сотрудник не найден",
        variant: "destructive",
      })
    }
  }

  // Handle user logout
  const handleUserLogout = () => {
    setCurrentUser(null)
    toast({
      title: "Выход",
      description: "Вы вышли из системы",
    })
  }

  // Add new employee
  const handleAddEmployee = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может добавлять сотрудников",
        variant: "destructive",
      })
      return
    }

    if (!newEmployee.name) {
      toast({
        title: "Ошибка",
        description: "Введите имя сотрудника",
        variant: "destructive",
      })
      return
    }

    // Проверка настроек в зависимости от типа графика
    if (newEmployee.workSchedule === "5/2") {
      // Для графика 5/2 фиксированные значения
      newEmployee.minWorkDays = 5
      newEmployee.maxWorkDays = 5
      newEmployee.minOffDays = 2
      newEmployee.maxOffDays = 2
      newEmployee.fixedWorkDays = [0, 1, 2, 3, 4] // Пн-Пт
      newEmployee.fixedOffDays = [5, 6] // Сб-Вс
    } else if (newEmployee.workSchedule === "fixed") {
      // Для фиксированного графика проверяем, что выбраны дни
      if (!newEmployee.fixedWorkDays || newEmployee.fixedWorkDays.length === 0) {
        toast({
          title: "Ошибка",
          description: "Выберите рабочие дни для фиксированного графика",
          variant: "destructive",
        })
        return
      }

      // Устанавливаем выходные дни как дополнение к рабочим
      const allDays = [0, 1, 2, 3, 4, 5, 6]
      newEmployee.fixedOffDays = allDays.filter((day) => !newEmployee.fixedWorkDays?.includes(day))

      // Устанавливаем min/max дни в соответствии с выбранными днями
      newEmployee.minWorkDays = newEmployee.fixedWorkDays.length
      newEmployee.maxWorkDays = newEmployee.fixedWorkDays.length
      newEmployee.minOffDays = 7 - newEmployee.fixedWorkDays.length
      newEmployee.maxOffDays = 7 - newEmployee.fixedWorkDays.length
    } else if (newEmployee.workSchedule === "flexible") {
      // Для гибкого графика проверяем корректность настроек
      if (!newEmployee.minWorkDays || !newEmployee.maxWorkDays || !newEmployee.minOffDays || !newEmployee.maxOffDays) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля для гибкого графика",
          variant: "destructive",
        })
        return
      }

      // Проверка на корректность значений
      if (newEmployee.minWorkDays > newEmployee.maxWorkDays) {
        toast({
          title: "Ошибка",
          description: "Минимальное количество рабочих дней не может быть больше максимального",
          variant: "destructive",
        })
        return
      }

      if (newEmployee.minOffDays > newEmployee.maxOffDays) {
        toast({
          title: "Ошибка",
          description: "Минимальное количество выходных дней не может быть больше максимального",
          variant: "destructive",
        })
        return
      }

      if (newEmployee.minWorkDays + newEmployee.minOffDays > 7) {
        toast({
          title: "Ошибка",
          description: "Сумма минимальных рабочих и выходных дней не может превышать 7",
          variant: "destructive",
        })
        return
      }

      if (newEmployee.maxWorkDays + newEmployee.maxOffDays < 7) {
        toast({
          title: "Ошибка",
          description: "Сумма максимальных рабочих и выходных дней должна быть не менее 7",
          variant: "destructive",
        })
        return
      }
    }

    const employee = {
      id: generateId(),
      name: newEmployee.name,
      color: newEmployee.color || "#33FF57",
      workSchedule: newEmployee.workSchedule || "flexible",
      minWorkDays: newEmployee.minWorkDays || 4,
      maxWorkDays: newEmployee.maxWorkDays || 6,
      minOffDays: newEmployee.minOffDays || 1,
      maxOffDays: newEmployee.maxOffDays || 3,
      fixedWorkDays: newEmployee.fixedWorkDays || [],
      fixedOffDays: newEmployee.fixedOffDays || [],
      isAdmin: newEmployee.isAdmin || false,
    }

    const updatedEmployees = [...employees, employee]
    await saveToStore("employees", updatedEmployees)
    setEmployees(updatedEmployees)
    setNewEmployee({
      name: "",
      color: "#33FF57",
      workSchedule: "flexible",
      minWorkDays: 4,
      maxWorkDays: 6,
      minOffDays: 1,
      maxOffDays: 3,
      fixedWorkDays: [],
      fixedOffDays: [],
      isAdmin: false,
    })
    setIsAddEmployeeOpen(false)
    toast({
      title: "Успешно",
      description: "Сотрудник добавлен",
    })
  }

  // Delete employee
  const handleDeleteEmployee = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может удалять сотрудников",
        variant: "destructive",
      })
      return
    }

    // Remove employee and their preferences
    const updatedEmployees = employees.filter((emp) => emp.id !== id)
    const updatedPreferences = dayPreferences.filter((pref) => pref.employeeId !== id)
    const updatedSchedule = scheduleEntries.filter((entry) => entry.employeeId !== id)

    await saveToStore("employees", updatedEmployees)
    await saveToStore("dayPreferences", updatedPreferences)
    await saveToStore("scheduleEntries", updatedSchedule)

    setEmployees(updatedEmployees)
    setDayPreferences(updatedPreferences)
    setScheduleEntries(updatedSchedule)

    toast({
      title: "Успешно",
      description: "Сотрудник удален",
    })
  }

  // Toggle day preference
  const handleToggleDayPreference = async (employeeId: string, date: Date, isPreferred: boolean) => {
    if (!currentUser && !isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Войдите в систему, чтобы выбрать предпочитаемые выходные",
        variant: "destructive",
      })
      return
    }

    // Only allow toggling for the current user or if admin
    if (!isAdmin && currentUser?.id !== employeeId) {
      toast({
        title: "Доступ запрещен",
        description: "Вы можете выбирать выходные только для себя",
        variant: "destructive",
      })
      return
    }

    // Check if employee has a fixed schedule
    const employee = employees.find((emp) => emp.id === employeeId)
    if (employee?.workSchedule === "5/2" || employee?.workSchedule === "fixed") {
      toast({
        title: "Ошибка",
        description: "Сотрудники с фиксированным графиком не могут выбирать выходные дни",
        variant: "destructive",
      })
      return
    }

    try {
      const dateStr = date.toISOString().split("T")[0]
      const dayOfWeek = getDay(date) === 0 ? 6 : getDay(date) - 1 // Convert to 0-6 where 0 is Monday

      // Check if preference already exists
      const existingPrefIndex = dayPreferences.findIndex(
        (pref) => pref.employeeId === employeeId && pref.date === dateStr,
      )

      const updatedPreferences = [...dayPreferences]

      if (existingPrefIndex >= 0) {
        // Update existing preference
        updatedPreferences[existingPrefIndex] = {
          ...updatedPreferences[existingPrefIndex],
          isPreferred,
        }
      } else {
        // Add new preference
        updatedPreferences.push({
          id: generateId(),
          employeeId,
          date: dateStr,
          dayOfWeek,
          isPreferred,
        })
      }

      setDayPreferences(updatedPreferences)
      setPreferencesChanged(true)
    } catch (error) {
      console.error("Error toggling day preference:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось изменить предпочтение",
        variant: "destructive",
      })
    }
  }

  // Save preferences
  const handleSavePreferences = async () => {
    if (!currentUser && !isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Войдите в систему, чтобы сохранить предпочтения",
        variant: "destructive",
      })
      return
    }

    try {
      await saveToStore("dayPreferences", dayPreferences)
      setPreferencesChanged(false)

      // Check if there are conflicts and show appropriate message
      if (Object.keys(dayOffConflicts).length > 0) {
        toast({
          title: "Предупреждение",
          description: "Предпочтения сохранены, но обнаружены конфликты выходных дней",
          variant: "warning",
        })
      } else {
        toast({
          title: "Успешно",
          description: "Предпочтения сохранены",
        })
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить предпочтения",
        variant: "destructive",
      })
    }
  }

  // Save settings
  const handleSaveSettings = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может изменять настройки",
        variant: "destructive",
      })
      return
    }

    try {
      // Загрузка текущих настроек
      const loadedSettings = await loadFromStore("settings")
      const minEmployeesSetting = loadedSettings.find((s) => s.key === "minFlexibleEmployees")

      if (minEmployeesSetting) {
        // Обновляем существующую настройку
        const updatedSettings = loadedSettings.map((s) =>
          s.key === "minFlexibleEmployees" ? { ...s, value: minFlexibleEmployees } : s,
        )
        await saveToStore("settings", updatedSettings)
      } else {
        // Создаем новую настройку
        await saveToStore("settings", [
          ...loadedSettings,
          { id: generateId(), key: "minFlexibleEmployees", value: minFlexibleEmployees },
        ])
      }

      setIsSettingsOpen(false)
      toast({
        title: "Успешно",
        description: "Настройки сохранены",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      })
    }
  }

  // Generate schedule
  const handleGenerateSchedule = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может генерировать график",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingSchedule(true)
    toast({
      title: "Генерация графика",
      description: "Пожалуйста, подождите...",
    })

    try {
      // Получаем даты недели в формате строк
      const weekDates = selectedWeekDates.map((date) => date.toISOString().split("T")[0])

      // Создаем новое расписание
      const newScheduleEntries: ScheduleEntry[] = []

      // Обрабатываем сотрудников с графиком 5/2
      employees.forEach((employee) => {
        if (employee.workSchedule === "5/2") {
          // Для графика 5/2 рабочие дни - пн-пт, выходные - сб-вс
          weekDates.forEach((dateStr, dayIndex) => {
            // dayIndex: 0 = пн, 1 = вт, ..., 6 = вс
            const status = dayIndex < 5 ? 1 : 0 // 1 = рабочий, 0 = выходной

            newScheduleEntries.push({
              id: generateId(),
              employeeId: employee.id,
              date: dateStr,
              status: status,
            })
          })
        }
      })

      // Обрабатываем сотрудников с фиксированным графиком
      employees.forEach((employee) => {
        if (employee.workSchedule === "fixed" && employee.fixedWorkDays) {
          weekDates.forEach((dateStr, dayIndex) => {
            // Проверяем, является ли день рабочим для этого сотрудника
            const isWorkDay = employee.fixedWorkDays?.includes(dayIndex)
            const status = isWorkDay ? 1 : 0

            newScheduleEntries.push({
              id: generateId(),
              employeeId: employee.id,
              date: dateStr,
              status: status,
            })
          })
        }
      })

      // Обрабатываем сотрудников с гибким графиком
      const flexibleEmployees = employees.filter((emp) => emp.workSchedule === "flexible")

      // Проверяем, достаточно ли сотрудников с гибким графиком
      if (flexibleEmployees.length < minFlexibleEmployees) {
        toast({
          title: "Ошибка",
          description: `Недостаточно сотрудников с гибким графиком. Требуется минимум ${minFlexibleEmployees}.`,
          variant: "destructive",
        })
        setIsGeneratingSchedule(false)
        return
      }

      // Для каждого дня недели определяем, кто будет работать
      weekDates.forEach((dateStr, dayIndex) => {
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
        const mustWorkCount = Math.max(minFlexibleEmployees, flexibleEmployees.length - employeesWantingOff.length)

        // Распределяем сотрудников
        sortedEmployees.forEach((employee, index) => {
          // Проверяем ограничения для каждого сотрудника

          // Получаем текущее количество рабочих и выходных дней для сотрудника
          const employeeEntries = newScheduleEntries.filter((entry) => entry.employeeId === employee.id)
          const workDaysCount = employeeEntries.filter((entry) => entry.status > 0).length
          const offDaysCount = employeeEntries.filter((entry) => entry.status === 0).length

          // Определяем, может ли сотрудник взять выходной
          const canTakeOff = workDaysCount >= employee.minWorkDays && offDaysCount < employee.maxOffDays

          // Определяем, может ли сотрудник работать
          const canWork = workDaysCount < employee.maxWorkDays && offDaysCount >= employee.minOffDays

          // Определяем статус для сотрудника
          let status: 0 | 1 | 11

          if (index < mustWorkCount) {
            // Этот сотрудник должен работать
            if (canWork) {
              status = dayIndex >= 5 ? 11 : 1 // Сокращенный день в выходные
            } else {
              // Не может работать из-за ограничений
              status = 0
            }
          } else {
            // Этот сотрудник может взять выходной
            if (employeesWantingOff.includes(employee.id) && canTakeOff) {
              status = 0
            } else {
              status = dayIndex >= 5 ? 11 : 1
            }
          }

          newScheduleEntries.push({
            id: generateId(),
            employeeId: employee.id,
            date: dateStr,
            status: status,
          })
        })
      })

      // Проверяем, что для каждого сотрудника соблюдены ограничения
      const employeeSchedules = {}

      employees.forEach((employee) => {
        const employeeEntries = newScheduleEntries.filter((entry) => entry.employeeId === employee.id)
        const workDaysCount = employeeEntries.filter((entry) => entry.status > 0).length
        const offDaysCount = employeeEntries.filter((entry) => entry.status === 0).length

        employeeSchedules[employee.id] = {
          workDays: workDaysCount,
          offDays: offDaysCount,
          entries: employeeEntries,
        }

        // Проверяем ограничения
        if (workDaysCount < employee.minWorkDays) {
          console.warn(
            `Сотрудник ${employee.name} имеет меньше рабочих дней (${workDaysCount}), чем минимально требуется (${employee.minWorkDays})`,
          )
        }

        if (workDaysCount > employee.maxWorkDays) {
          console.warn(
            `Сотрудник ${employee.name} имеет больше рабочих дней (${workDaysCount}), чем максимально допустимо (${employee.maxWorkDays})`,
          )
        }

        if (offDaysCount < employee.minOffDays) {
          console.warn(
            `Сотрудник ${employee.name} имеет меньше выходных дней (${offDaysCount}), чем минимально требуется (${employee.minOffDays})`,
          )
        }

        if (offDaysCount > employee.maxOffDays) {
          console.warn(
            `Сотрудник ${employee.name} имеет больше выходных дней (${offDaysCount}), чем максимально допустимо (${employee.maxOffDays})`,
          )
        }
      })

      // Проверяем, что в каждый день работает достаточное количество сотрудников с гибким графиком
      weekDates.forEach((dateStr, dayIndex) => {
        const workingFlexibleEmployees = newScheduleEntries.filter(
          (entry) =>
            entry.date === dateStr && entry.status > 0 && flexibleEmployees.some((emp) => emp.id === entry.employeeId),
        )

        if (workingFlexibleEmployees.length < minFlexibleEmployees) {
          console.warn(
            `В день ${dateStr} работает недостаточное количество сотрудников с гибким графиком: ${workingFlexibleEmployees.length} (требуется ${minFlexibleEmployees})`,
          )
        }
      })

      // Сохраняем расписание
      await saveToStore("scheduleEntries", newScheduleEntries)
      setScheduleEntries(newScheduleEntries)
      setActiveTab("schedule")

      toast({
        title: "Успешно",
        description: "График сгенерирован",
      })
    } catch (error) {
      console.error("Error generating schedule:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать график",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingSchedule(false)
    }
  }

  // Check if a day is preferred by an employee
  const isDayPreferred = (employeeId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split("T")[0]
      return dayPreferences.some((pref) => pref.employeeId === employeeId && pref.date === dateStr && pref.isPreferred)
    } catch (error) {
      console.error("Error in isDayPreferred:", error)
      return false
    }
  }

  // Get schedule status for a day
  const getScheduleStatus = (employeeId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split("T")[0]
      const entry = scheduleEntries.find((entry) => entry.employeeId === employeeId && entry.date === dateStr)
      return entry ? entry.status : null
    } catch (error) {
      console.error("Error in getScheduleStatus:", error)
      return null
    }
  }

  // Format date for display in conflicts
  const formatDateForDisplay = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return safeFormat(date, "EEE, dd.MM", { locale: ru })
    } catch (error) {
      return dateStr
    }
  }

  // Handle fixed days selection
  const handleFixedDayToggle = (day: number) => {
    const currentDays = newEmployee.fixedWorkDays || []

    if (currentDays.includes(day)) {
      // Remove day
      setNewEmployee({
        ...newEmployee,
        fixedWorkDays: currentDays.filter((d) => d !== day),
      })
    } else {
      // Add day
      setNewEmployee({
        ...newEmployee,
        fixedWorkDays: [...currentDays, day],
      })
    }
  }

  // Render schedule visualization
  const renderSchedule = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Сотрудник</TableHead>
              {selectedWeekDates.map((date, index) => (
                <TableHead key={index} className="text-center min-w-[100px]">
                  {safeFormat(date, "EEE", { locale: ru })}
                  <br />
                  {safeFormat(date, "dd.MM")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium" style={{ borderLeft: `4px solid ${employee.color}` }}>
                  {employee.name}
                  {employee.workSchedule === "5/2" && <span className="ml-2 text-xs text-gray-500">(5/2)</span>}
                  {employee.workSchedule === "fixed" && <span className="ml-2 text-xs text-gray-500">(фикс.)</span>}
                </TableCell>
                {selectedWeekDates.map((date, index) => {
                  const status = getScheduleStatus(employee.id, date)
                  let bgColor = "bg-white"
                  let textContent = ""

                  if (status === 0) {
                    bgColor = "bg-gray-100" // Выходной день - белый фон
                    textContent = "Выходной"
                  } else if (status === 1) {
                    bgColor = employee.color
                    textContent = "12 ч"
                  } else if (status === 11) {
                    bgColor = employee.color // Используем тот же цвет для субботы и воскресенья
                    textContent = "11 ч"
                  }

                  return (
                    <TableCell
                      key={index}
                      className={`text-center`}
                      style={{
                        backgroundColor: status === 0 ? "white" : status !== null ? bgColor : undefined,
                        color: status === 1 || status === 11 ? "white" : undefined,
                      }}
                    >
                      {textContent}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Render preferences selection
  const renderPreferences = () => {
    // If no user is logged in and not admin, show login prompt
    if (!currentUser && !isAdmin) {
      return (
        <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">Войдите в систему, чтобы выбрать предпочитаемые выходные дни</p>
            <Button onClick={() => setIsUserLoginOpen(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              Войти
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {isAdmin && (
          <div className="mb-4">
            <Label>Выберите сотрудника для настройки выходных:</Label>
            <Select
              value={currentUser?.id || ""}
              onValueChange={(value) => {
                const employee = employees.find((emp) => emp.id === value)
                setCurrentUser(employee || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {warningMessage && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Внимание</AlertTitle>
            <AlertDescription>{warningMessage}</AlertDescription>
          </Alert>
        )}

        {Object.keys(dayOffConflicts).length > 0 && (
          <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
            <Info className="h-4 w-4" />
            <AlertTitle>Конфликты выходных дней</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Слишком много сотрудников хотят взять выходной в одни и те же дни. Некоторым придется работать для
                обеспечения минимального количества персонала ({minFlexibleEmployees} чел.).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {Object.entries(dayOffConflicts).map(([date, employees]) => (
                  <li key={date}>
                    <strong>{formatDateForDisplay(date)}</strong>: {employees.join(", ")}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {currentUser && (
          <>
            {currentUser.workSchedule === "5/2" || currentUser.workSchedule === "fixed" ? (
              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardContent className="p-6">
                  <p className="text-amber-600">
                    У сотрудника {currentUser.name} установлен{" "}
                    {currentUser.workSchedule === "5/2"
                      ? "график работы 5/2 (понедельник-пятница)"
                      : "фиксированный график работы"}
                    .
                    <br />
                    {currentUser.workSchedule === "5/2"
                      ? "Выходные дни - суббота и воскресенье, и они уже зафиксированы в системе."
                      : "Рабочие дни зафиксированы в настройках сотрудника."}
                    <br />
                    Нельзя изменить выходные дни при данном графике работы.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Выбор выходных дней для {currentUser.name}</CardTitle>
                  <CardDescription>
                    Выберите предпочитаемые выходные дни на неделю{" "}
                    {safeFormat(selectedWeekDates[0], "dd.MM", { locale: ru })} -{" "}
                    {safeFormat(selectedWeekDates[6], "dd.MM", { locale: ru })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {selectedWeekDates.map((date, index) => (
                      <div key={index} className="text-center p-2 border rounded-md">
                        <div className="font-medium">{safeFormat(date, "EEE", { locale: ru })}</div>
                        <div className="text-sm text-gray-500">{safeFormat(date, "dd.MM", { locale: ru })}</div>
                        <div className="mt-2">
                          <Switch
                            checked={isDayPreferred(currentUser.id, date)}
                            onCheckedChange={(checked) => handleToggleDayPreference(currentUser.id, date, checked)}
                          />
                        </div>
                        <div className="text-xs mt-1">
                          {isDayPreferred(currentUser.id, date) ? "Выходной" : "Рабочий"}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    onClick={handleSavePreferences}
                    disabled={!preferencesChanged}
                    className="bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить
                  </Button>
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </div>
    )
  }

  // Render employee management
  const renderEmployeeManagement = () => {
    if (!isAdmin) {
      return (
        <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
          <CardContent className="p-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="mb-4">Только администратор может управлять сотрудниками</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Button onClick={() => setIsAddEmployeeOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>

          <Button onClick={() => setIsSettingsOpen(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
          <CardHeader>
            <CardTitle>Управление сотрудниками</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>График</TableHead>
                  <TableHead>Цвет</TableHead>
                  <TableHead>Мин/Макс рабочих дней</TableHead>
                  <TableHead>Мин/Макс выходных</TableHead>
                  <TableHead>Админ</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      {employee.workSchedule === "5/2"
                        ? "5/2"
                        : employee.workSchedule === "fixed"
                          ? "Фиксированный"
                          : "Гибкий"}
                    </TableCell>
                    <TableCell>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: employee.color }}></div>
                    </TableCell>
                    <TableCell>
                      {employee.minWorkDays}/{employee.maxWorkDays}
                    </TableCell>
                    <TableCell>
                      {employee.minOffDays}/{employee.maxOffDays}
                    </TableCell>
                    <TableCell>{employee.isAdmin ? "Да" : "Нет"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteEmployee(employee.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">График бар</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button variant="outline" onClick={handleAdminLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти из режима администратора
            </Button>
          ) : (
            <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Режим администратора
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Вход для администратора</DialogTitle>
                  <DialogDescription>Введите пароль для доступа к функциям администратора</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Пароль</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAdminLoginOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleAdminLogin}>Войти</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {currentUser ? (
            <Button variant="outline" onClick={handleUserLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Выйти ({currentUser.name})
            </Button>
          ) : (
            <Dialog open={isUserLoginOpen} onOpenChange={setIsUserLoginOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Вход в систему</DialogTitle>
                  <DialogDescription>Введите свою фамилию и имя для входа</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-name">Фамилия и имя</Label>
                    <Input
                      id="user-name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Например: Иванов И."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserLoginOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleUserLogin}>Войти</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {selectedWeekDates.length > 0 && (
                  <>
                    {safeFormat(selectedWeekDates[0], "dd.MM", { locale: ru })} -{" "}
                    {safeFormat(selectedWeekDates[6], "dd.MM", { locale: ru })}
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date)
                    updateSelectedWeek(date)
                  }
                }}
                initialFocus
                locale={ru}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isAdmin && (
          <Button
            onClick={handleGenerateSchedule}
            disabled={isGeneratingSchedule}
            className="bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingSchedule ? "animate-spin" : ""}`} />
            Сгенерировать график
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Выбор выходных</TabsTrigger>
          <TabsTrigger value="schedule">График работы</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="mt-4">
          {renderPreferences()}
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
            <CardHeader>
              <CardTitle>График работы</CardTitle>
              <CardDescription>
                Неделя: {safeFormat(selectedWeekDates[0], "dd.MM", { locale: ru })} -{" "}
                {safeFormat(selectedWeekDates[6], "dd.MM", { locale: ru })}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderSchedule()}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="employees" className="mt-4">
          {renderEmployeeManagement()}
        </TabsContent>
      </Tabs>

      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
            <DialogDescription>Заполните информацию о новом сотруднике</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Имя сотрудника</Label>
              <Input
                id="employee-name"
                value={newEmployee.name || ""}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-color">Цвет</Label>
              <Select
                value={newEmployee.color || "#33FF57"}
                onValueChange={(value) => setNewEmployee({ ...newEmployee, color: value })}
              >
                <SelectTrigger id="employee-color">
                  <SelectValue placeholder="Выберите цвет" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color.value }}></div>
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-schedule">График работы</Label>
              <Select
                value={newEmployee.workSchedule || "flexible"}
                onValueChange={(value) =>
                  setNewEmployee({
                    ...newEmployee,
                    workSchedule: value,
                    // Сбрасываем настройки при смене типа графика
                    fixedWorkDays: value === "fixed" ? [] : undefined,
                    fixedOffDays: value === "fixed" ? [] : undefined,
                  })
                }
              >
                <SelectTrigger id="work-schedule">
                  <SelectValue placeholder="Выберите график" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5/2">5/2 (Пн-Пт)</SelectItem>
                  <SelectItem value="flexible">Гибкий</SelectItem>
                  <SelectItem value="fixed">Фиксированный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newEmployee.workSchedule === "fixed" && (
              <div className="space-y-2">
                <Label>Выберите рабочие дни</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={(newEmployee.fixedWorkDays || []).includes(day.value)}
                        onCheckedChange={() => handleFixedDayToggle(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`}>{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newEmployee.workSchedule === "flexible" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-work-days">Мин. рабочих дней</Label>
                    <Input
                      id="min-work-days"
                      type="number"
                      min="1"
                      max="7"
                      value={newEmployee.minWorkDays || 4}
                      onChange={(e) =>
                        setNewEmployee({
                          ...newEmployee,
                          minWorkDays: Number.parseInt(e.target.value) || 4,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-work-days">Макс. рабочих дней</Label>
                    <Input
                      id="max-work-days"
                      type="number"
                      min="1"
                      max="7"
                      value={newEmployee.maxWorkDays || 6}
                      onChange={(e) =>
                        setNewEmployee({
                          ...newEmployee,
                          maxWorkDays: Number.parseInt(e.target.value) || 6,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-off-days">Мин. выходных дней</Label>
                    <Input
                      id="min-off-days"
                      type="number"
                      min="0"
                      max="6"
                      value={newEmployee.minOffDays || 1}
                      onChange={(e) =>
                        setNewEmployee({
                          ...newEmployee,
                          minOffDays: Number.parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-off-days">Макс. выходных дней</Label>
                    <Input
                      id="max-off-days"
                      type="number"
                      min="1"
                      max="6"
                      value={newEmployee.maxOffDays || 3}
                      onChange={(e) =>
                        setNewEmployee({
                          ...newEmployee,
                          maxOffDays: Number.parseInt(e.target.value) || 3,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is-admin"
                checked={newEmployee.isAdmin || false}
                onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, isAdmin: checked })}
              />
              <Label htmlFor="is-admin">Администратор</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddEmployee}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки графика</DialogTitle>
            <DialogDescription>Настройте параметры генерации графика</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="min-flexible-employees">
                Минимальное количество сотрудников в день с гибким графиком
              </Label>
              <Input
                id="min-flexible-employees"
                type="number"
                min="1"
                max="10"
                value={minFlexibleEmployees}
                onChange={(e) => setMinFlexibleEmployees(Number.parseInt(e.target.value) || 3)}
              />
              <p className="text-sm text-gray-500">
                Это минимальное количество сотрудников с гибким графиком, которые должны работать каждый день.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveSettings}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
