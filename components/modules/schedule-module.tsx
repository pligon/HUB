"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon, LogIn, LogOut, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSync } from "@/lib/sync-context"

import type { Employee, DayPreference, ScheduleEntry, ScheduleSettings } from "@/lib/types/schedule-types"
import { getWeekDates, getPreviousWeek, getNextWeek } from "@/lib/schedule-utils"
import {
  loadEmployees,
  saveEmployees,
  loadDayPreferences,
  saveDayPreferences,
  loadScheduleEntries,
  saveScheduleEntries,
  loadScheduleSettings,
  saveScheduleSettings,
  createDefaultScheduleSettings,
} from "@/lib/db-schedule"
import { setupRealtimeSubscriptions, checkSupabaseAvailability } from "@/lib/supabase"

import EmployeeManagement from "./schedule/employee-management"
import DayOffSelection from "./schedule/day-off-selection"
import ScheduleDisplay from "./schedule/schedule-display"

export default function ScheduleModule() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [currentUser, setCurrentUser] = useState<Employee | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [dayPreferences, setDayPreferences] = useState<DayPreference[]>([])
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([])
  const [settings, setSettings] = useState<ScheduleSettings | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [activeTab, setActiveTab] = useState("preferences")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { isSyncing } = useSync() // Используем контекст синхронизации

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Проверяем доступность Supabase
        await checkSupabaseAvailability()

        // Загрузка сотрудников
        const loadedEmployees = await loadEmployees()
        setEmployees(loadedEmployees)

        // Загрузка предпочтений
        const loadedPreferences = await loadDayPreferences()
        setDayPreferences(loadedPreferences)

        // Загрузка записей графика
        const loadedEntries = await loadScheduleEntries()
        setScheduleEntries(loadedEntries)

        // Загрузка настроек
        let loadedSettings = await loadScheduleSettings()
        if (!loadedSettings) {
          loadedSettings = createDefaultScheduleSettings()
          await saveScheduleSettings(loadedSettings)
        }
        setSettings(loadedSettings)

        // Установка дат недели
        setWeekDates(getWeekDates(selectedDate))
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить данные",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Настройка подписок на изменения в реальном времени
    const unsubscribe = setupRealtimeSubscriptions(
      ["employees", "day_preferences", "schedule_entries", "schedule_settings"],
      (payload) => {
        // Обработка вставки новых данных
        if (payload.table === "employees") {
          const newEmployee = {
            id: payload.new.id,
            name: payload.new.name,
            color: payload.new.color,
            telegramUsername: payload.new.telegram_username,
            maxWorkDays: payload.new.max_work_days,
            minOffDays: payload.new.min_off_days,
            workDayReminderTime: payload.new.work_day_reminder_time,
            scheduleReadyReminderTime: payload.new.schedule_ready_reminder_time,
            scheduleReadyReminderDay: payload.new.schedule_ready_reminder_day,
            workScheduleMode: payload.new.work_schedule_mode,
            fixedWorkDays: payload.new.fixed_work_days,
            fixedOffDays: payload.new.fixed_off_days,
            password: payload.new.password,
            isAdmin: payload.new.is_admin,
            createdAt: payload.new.created_at,
          }
          setEmployees((prev) => [...prev.filter((e) => e.id !== newEmployee.id), newEmployee])
        } else if (payload.table === "day_preferences") {
          const newPreference = {
            id: payload.new.id,
            employeeId: payload.new.employee_id,
            date: payload.new.date,
            dayOfWeek: payload.new.day_of_week,
            isPreferred: payload.new.is_preferred,
            createdAt: payload.new.created_at,
          }
          setDayPreferences((prev) => [...prev.filter((p) => p.id !== newPreference.id), newPreference])
        } else if (payload.table === "schedule_entries") {
          const newEntry = {
            id: payload.new.id,
            employeeId: payload.new.employee_id,
            date: payload.new.date,
            status: payload.new.status,
            hours: payload.new.hours,
            createdAt: payload.new.created_at,
          }
          setScheduleEntries((prev) => [...prev.filter((e) => e.id !== newEntry.id), newEntry])
        } else if (payload.table === "schedule_settings") {
          const newSettings = {
            id: payload.new.id,
            minEmployeesPerDay: payload.new.min_employees_per_day,
            maxGenerationAttempts: payload.new.max_generation_attempts,
            autoGenerationEnabled: payload.new.auto_generation_enabled,
            autoGenerationDay: payload.new.auto_generation_day,
            autoGenerationTime: payload.new.auto_generation_time,
            createdAt: payload.new.created_at,
          }
          setSettings(newSettings)
        }
      },
      (payload) => {
        // Обработка обновления данных
        if (payload.table === "employees") {
          const updatedEmployee = {
            id: payload.new.id,
            name: payload.new.name,
            color: payload.new.color,
            telegramUsername: payload.new.telegram_username,
            maxWorkDays: payload.new.max_work_days,
            minOffDays: payload.new.min_off_days,
            workDayReminderTime: payload.new.work_day_reminder_time,
            scheduleReadyReminderTime: payload.new.schedule_ready_reminder_time,
            scheduleReadyReminderDay: payload.new.schedule_ready_reminder_day,
            workScheduleMode: payload.new.work_schedule_mode,
            fixedWorkDays: payload.new.fixed_work_days,
            fixedOffDays: payload.new.fixed_off_days,
            password: payload.new.password,
            isAdmin: payload.new.is_admin,
            createdAt: payload.new.created_at,
          }
          setEmployees((prev) => prev.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e)))
        } else if (payload.table === "day_preferences") {
          const updatedPreference = {
            id: payload.new.id,
            employeeId: payload.new.employee_id,
            date: payload.new.date,
            dayOfWeek: payload.new.day_of_week,
            isPreferred: payload.new.is_preferred,
            createdAt: payload.new.created_at,
          }
          setDayPreferences((prev) => prev.map((p) => (p.id === updatedPreference.id ? updatedPreference : p)))
        } else if (payload.table === "schedule_entries") {
          const updatedEntry = {
            id: payload.new.id,
            employeeId: payload.new.employee_id,
            date: payload.new.date,
            status: payload.new.status,
            hours: payload.new.hours,
            createdAt: payload.new.created_at,
          }
          setScheduleEntries((prev) => prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)))
        } else if (payload.table === "schedule_settings") {
          const updatedSettings = {
            id: payload.new.id,
            minEmployeesPerDay: payload.new.min_employees_per_day,
            maxGenerationAttempts: payload.new.max_generation_attempts,
            autoGenerationEnabled: payload.new.auto_generation_enabled,
            autoGenerationDay: payload.new.auto_generation_day,
            autoGenerationTime: payload.new.auto_generation_time,
            createdAt: payload.new.created_at,
          }
          setSettings(updatedSettings)
        }
      },
      (payload) => {
        // Обработка удаления данных
        if (payload.table === "employees") {
          setEmployees((prev) => prev.filter((e) => e.id !== payload.old.id))
        } else if (payload.table === "day_preferences") {
          setDayPreferences((prev) => prev.filter((p) => p.id !== payload.old.id))
        } else if (payload.table === "schedule_entries") {
          setScheduleEntries((prev) => prev.filter((e) => e.id !== payload.old.id))
        } else if (payload.table === "schedule_settings") {
          // Обычно настройки не удаляются, но на всякий случай
          setSettings(null)
        }
      },
    )

    return () => {
      unsubscribe()
    }
  }, [toast])

  // Обновление дат недели при изменении выбранной даты
  useEffect(() => {
    setWeekDates(getWeekDates(selectedDate))
  }, [selectedDate])

  // Обработчик входа администратора
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

  // Обработчик выхода администратора
  const handleAdminLogout = () => {
    setIsAdmin(false)
    toast({
      title: "Выход",
      description: "Вы вышли из режима администратора",
    })
  }

  // Обработчик входа пользователя
  const handleUserLogin = () => {
    const employee = employees.find((emp) => emp.password === userPassword)
    if (employee) {
      setCurrentUser(employee)
      setUserPassword("")
      setIsUserLoginOpen(false)
      toast({
        title: "Успешно",
        description: `Вы вошли как ${employee.name}`,
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Неверный пароль",
        variant: "destructive",
      })
    }
  }

  // Обработчик выхода пользователя
  const handleUserLogout = () => {
    setCurrentUser(null)
    toast({
      title: "Выход",
      description: "Вы вышли из системы",
    })
  }

  // Обработчик перехода к предыдущей неделе
  const handlePreviousWeek = () => {
    setSelectedDate(getPreviousWeek(selectedDate))
  }

  // Обработчик перехода к следующей неделе
  const handleNextWeek = () => {
    setSelectedDate(getNextWeek(selectedDate))
  }

  // Обработчик изменения сотрудников
  const handleEmployeesChange = async (updatedEmployees: Employee[]) => {
    try {
      const success = await saveEmployees(updatedEmployees)
      if (success) {
        setEmployees(updatedEmployees)
        toast({
          title: "Успешно",
          description: "Данные сотрудников сохранены",
        })
      }
    } catch (error) {
      console.error("Error saving employees:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные сотрудников",
        variant: "destructive",
      })
    }
  }

  // Обработчик изменения предпочтений
  const handleDayPreferencesChange = async (updatedPreferences: DayPreference[]) => {
    try {
      const success = await saveDayPreferences(updatedPreferences)
      if (success) {
        setDayPreferences(updatedPreferences)
        toast({
          title: "Успешно",
          description: "Предпочтения сохранены",
        })
      }
    } catch (error) {
      console.error("Error saving day preferences:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить предпочтения",
        variant: "destructive",
      })
    }
  }

  // Обработчик изменения записей графика
  const handleScheduleEntriesChange = async (updatedEntries: ScheduleEntry[]) => {
    try {
      const success = await saveScheduleEntries(updatedEntries)
      if (success) {
        setScheduleEntries(updatedEntries)
        toast({
          title: "Успешно",
          description: "График сохранен",
        })
      }
    } catch (error) {
      console.error("Error saving schedule entries:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить график",
        variant: "destructive",
      })
    }
  }

  // Обработчик изменения настроек
  const handleSettingsChange = async (updatedSettings: ScheduleSettings) => {
    try {
      const success = await saveScheduleSettings(updatedSettings)
      if (success) {
        setSettings(updatedSettings)
        toast({
          title: "Успешно",
          description: "Настройки сохранены",
        })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      })
    }
  }

  // Если данные еще загружаются, показываем индикатор загрузки
  if (isLoading || !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
                  <DialogDescription>Введите свой пароль для входа</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-password">Пароль</Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
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
          <Button variant="outline" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {weekDates.length > 0 && (
                  <>
                    {format(weekDates[0], "dd.MM", { locale: ru })} - {format(weekDates[6], "dd.MM", { locale: ru })}
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={ru}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Выбор выходных</TabsTrigger>
          <TabsTrigger value="schedule">График работы</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="mt-4">
          <DayOffSelection
            employees={employees}
            dayPreferences={dayPreferences}
            weekDates={weekDates}
            settings={settings}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onDayPreferencesChange={handleDayPreferencesChange}
            onLogin={() => setIsUserLoginOpen(true)}
          />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ScheduleDisplay
            employees={employees}
            dayPreferences={dayPreferences}
            scheduleEntries={scheduleEntries}
            weekDates={weekDates}
            settings={settings}
            isAdmin={isAdmin}
            onScheduleEntriesChange={handleScheduleEntriesChange}
            onSettingsChange={handleSettingsChange}
          />
        </TabsContent>
        <TabsContent value="employees" className="mt-4">
          <EmployeeManagement employees={employees} isAdmin={isAdmin} onEmployeesChange={handleEmployeesChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
