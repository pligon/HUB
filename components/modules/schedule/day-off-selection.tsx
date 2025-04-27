"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Info, AlertTriangle, Save, LogIn } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Employee, DayPreference, ScheduleSettings } from "@/lib/types/schedule-types"
import {
  dateToISOString,
  getDayOfWeek,
  formatDate,
  getMaxOffDaysForEmployee,
  isOffDaysLimitExceeded,
  getSelectedOffDaysCount,
  checkDayOffConflicts,
  isDayOffSelectionAvailable,
} from "@/lib/schedule-utils"
import { generateId } from "@/lib/db-schedule"

interface DayOffSelectionProps {
  employees: Employee[]
  dayPreferences: DayPreference[]
  weekDates: Date[]
  settings: ScheduleSettings
  currentUser: Employee | null
  isAdmin: boolean
  onDayPreferencesChange: (preferences: DayPreference[]) => void
  onLogin: () => void
}

export default function DayOffSelection({
  employees,
  dayPreferences,
  weekDates,
  settings,
  currentUser,
  isAdmin,
  onDayPreferencesChange,
  onLogin,
}: DayOffSelectionProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(currentUser?.id || null)
  const [preferencesChanged, setPreferencesChanged] = useState(false)
  const [dayOffConflicts, setDayOffConflicts] = useState<{ [key: string]: string[] }>({})
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const { toast } = useToast()

  // Проверка доступности выбора выходных
  const selectionAvailable = isDayOffSelectionAvailable(settings)

  // Проверка конфликтов при изменении предпочтений
  useEffect(() => {
    // Проверяем конфликты выходных дней
    const conflicts = checkDayOffConflicts(employees, dayPreferences, weekDates, settings)
    setDayOffConflicts(conflicts)

    // Устанавливаем предупреждение, если есть конфликты
    if (Object.keys(conflicts).length > 0) {
      setWarningMessage(
        `Обнаружены конфликты выходных дней. Некоторые сотрудники могут не получить выбранные выходные.`,
      )
    } else {
      setWarningMessage(null)
    }
  }, [dayPreferences, employees, weekDates, settings])

  // Обработчик переключения предпочтения выходного дня
  const handleToggleDayPreference = (employeeId: string, date: Date, isPreferred: boolean) => {
    if (!selectionAvailable && !isAdmin) {
      toast({
        title: "Выбор недоступен",
        description: "Выбор выходных дней закрыт. График уже формируется или сформирован.",
        variant: "destructive",
      })
      return
    }

    if (!currentUser && !isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Войдите в систему, чтобы выбрать предпочитаемые выходные",
        variant: "destructive",
      })
      return
    }

    // Только администратор может менять предпочтения других сотрудников
    if (!isAdmin && currentUser?.id !== employeeId) {
      toast({
        title: "Доступ запрещен",
        description: "Вы можете выбирать выходные только для себя",
        variant: "destructive",
      })
      return
    }

    // Проверяем режим работы сотрудника
    const employee = employees.find((emp) => emp.id === employeeId)
    if (!employee) return

    if (employee.workScheduleMode === "5/2" || employee.workScheduleMode === "fixed") {
      toast({
        title: "Ошибка",
        description: "Сотрудники с фиксированным графиком не могут выбирать выходные дни",
        variant: "destructive",
      })
      return
    }

    // Проверяем, не превышает ли количество выбранных выходных максимально допустимое
    if (isPreferred) {
      const currentOffDaysCount = getSelectedOffDaysCount(employeeId, dayPreferences, weekDates)
      const maxOffDays = getMaxOffDaysForEmployee(employee)

      if (currentOffDaysCount >= maxOffDays) {
        toast({
          title: "Превышен лимит выходных",
          description: `Вы не можете выбрать более ${maxOffDays} выходных дней в неделю`,
          variant: "destructive",
        })
        return
      }
    }

    // Проверяем, является ли день фиксированным выходным
    const dayOfWeek = getDayOfWeek(date)
    if (employee.fixedOffDays?.includes(dayOfWeek)) {
      toast({
        title: "Фиксированный выходной",
        description: "Этот день уже установлен как фиксированный выходной",
        variant: "destructive",
      })
      return
    }

    try {
      const dateStr = dateToISOString(date)

      // Проверяем, существует ли уже предпочтение
      const existingPrefIndex = dayPreferences.findIndex(
        (pref) => pref.employeeId === employeeId && pref.date === dateStr,
      )

      const updatedPreferences = [...dayPreferences]

      if (existingPrefIndex >= 0) {
        // Обновляем существующее предпочтение
        updatedPreferences[existingPrefIndex] = {
          ...updatedPreferences[existingPrefIndex],
          isPreferred,
        }
      } else {
        // Добавляем новое предпочтение
        updatedPreferences.push({
          id: generateId(),
          employeeId,
          date: dateStr,
          dayOfWeek,
          isPreferred,
          createdAt: new Date().toISOString(),
        })
      }

      onDayPreferencesChange(updatedPreferences)
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

  // Обработчик сохранения предпочтений
  const handleSavePreferences = () => {
    if (!currentUser && !isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Войдите в систему, чтобы сохранить предпочтения",
        variant: "destructive",
      })
      return
    }

    // Проверяем, не превышает ли количество выбранных выходных максимально допустимое
    if (selectedEmployeeId) {
      const employee = employees.find((emp) => emp.id === selectedEmployeeId)
      if (employee && isOffDaysLimitExceeded(employee, dayPreferences, weekDates)) {
        toast({
          title: "Превышен лимит выходных",
          description: `Вы не можете выбрать более ${getMaxOffDaysForEmployee(employee)} выходных дней в неделю`,
          variant: "destructive",
        })
        return
      }
    }

    setPreferencesChanged(false)

    // Проверяем, есть ли конфликты
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
  }

  // Проверка, выбран ли день как предпочитаемый выходной
  const isDayPreferred = (employeeId: string, date: Date) => {
    try {
      const dateStr = dateToISOString(date)
      return dayPreferences.some((pref) => pref.employeeId === employeeId && pref.date === dateStr && pref.isPreferred)
    } catch (error) {
      console.error("Error in isDayPreferred:", error)
      return false
    }
  }

  // Проверка, является ли день фиксированным выходным
  const isFixedOffDay = (employeeId: string, date: Date) => {
    try {
      const employee = employees.find((emp) => emp.id === employeeId)
      if (!employee || !employee.fixedOffDays) return false

      const dayOfWeek = getDayOfWeek(date)
      return employee.fixedOffDays.includes(dayOfWeek)
    } catch (error) {
      console.error("Error in isFixedOffDay:", error)
      return false
    }
  }

  // Если выбор выходных недоступен
  if (!selectionAvailable && !isAdmin) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className="mb-4">Выбор выходных дней закрыт. График уже формируется или сформирован.</p>
        </CardContent>
      </Card>
    )
  }

  // Если пользователь не авторизован
  if (!currentUser && !isAdmin) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
        <CardContent className="p-6 text-center">
          <p className="mb-4">Войдите в систему, чтобы выбрать предпочитаемые выходные дни</p>
          <Button onClick={onLogin}>
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
          <Select value={selectedEmployeeId || ""} onValueChange={(value) => setSelectedEmployeeId(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите сотрудника" />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter((emp) => emp.workScheduleMode === "flexible")
                .map((employee) => (
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
              обеспечения минимального количества персонала ({settings.minEmployeesPerDay} чел.).
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {Object.entries(dayOffConflicts).map(([date, employees]) => (
                <li key={date}>
                  <strong>{formatDate(date, "EEE, dd.MM")}</strong>: {employees.join(", ")}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {selectedEmployeeId && (
        <>
          {(() => {
            const employee = employees.find((emp) => emp.id === selectedEmployeeId)
            if (!employee) return null

            if (employee.workScheduleMode === "5/2" || employee.workScheduleMode === "fixed") {
              return (
                <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                  <CardContent className="p-6">
                    <p className="text-amber-600">
                      У сотрудника {employee.name} установлен{" "}
                      {employee.workScheduleMode === "5/2"
                        ? "график работы 5/2 (понедельник-пятница)"
                        : "фиксированный график работы"}
                      .
                      <br />
                      {employee.workScheduleMode === "5/2"
                        ? "Выходные дни - суббота и воскресенье, и они уже зафиксированы в системе."
                        : "Рабочие дни зафиксированы в настройках сотрудника."}
                      <br />
                      Нельзя изменить выходные дни при данном графике работы.
                    </p>
                  </CardContent>
                </Card>
              )
            }

            const maxOffDays = getMaxOffDaysForEmployee(employee)
            const selectedOffDays = getSelectedOffDaysCount(employee.id, dayPreferences, weekDates)

            return (
              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Выбор выходных дней для {employee.name}</CardTitle>
                  <CardDescription>
                    Выберите предпочитаемые выходные дни на неделю {formatDate(weekDates[0], "dd.MM")} -{" "}
                    {formatDate(weekDates[6], "dd.MM")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      Выбрано выходных: {selectedOffDays} из {maxOffDays} доступных
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div
                        className="bg-green-600 h-2.5 rounded-full"
                        style={{ width: `${(selectedOffDays / maxOffDays) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {weekDates.map((date, index) => {
                      const isFixed = isFixedOffDay(employee.id, date)
                      return (
                        <div
                          key={index}
                          className={`text-center p-2 border rounded-md ${isFixed ? "bg-gray-100" : ""}`}
                        >
                          <div className="font-medium">{formatDate(date, "EEE")}</div>
                          <div className="text-sm text-gray-500">{formatDate(date, "dd.MM")}</div>
                          <div className="mt-2">
                            {isFixed ? (
                              <div className="text-xs mt-1 text-gray-500">Фиксированный выходной</div>
                            ) : (
                              <>
                                <Switch
                                  checked={isDayPreferred(employee.id, date)}
                                  onCheckedChange={(checked) => handleToggleDayPreference(employee.id, date, checked)}
                                />
                                <div className="text-xs mt-1">
                                  {isDayPreferred(employee.id, date) ? "Выходной" : "Рабочий"}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
            )
          })()}
        </>
      )}
    </div>
  )
}
