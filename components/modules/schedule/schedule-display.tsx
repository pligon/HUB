"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Edit, AlertTriangle, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Employee, DayPreference, ScheduleEntry, ScheduleSettings, ShiftStatus } from "@/lib/types/schedule-types"
import { formatDate, generateSchedule, sendTelegramMessage, generateScheduleReadyMessage } from "@/lib/schedule-utils"

interface ScheduleDisplayProps {
  employees: Employee[]
  dayPreferences: DayPreference[]
  scheduleEntries: ScheduleEntry[]
  weekDates: Date[]
  settings: ScheduleSettings
  isAdmin: boolean
  onScheduleEntriesChange: (entries: ScheduleEntry[]) => void
  onSettingsChange: (settings: ScheduleSettings) => void
}

export default function ScheduleDisplay({
  employees,
  dayPreferences,
  scheduleEntries,
  weekDates,
  settings,
  isAdmin,
  onScheduleEntriesChange,
  onSettingsChange,
}: ScheduleDisplayProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditingEntry, setIsEditingEntry] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null)
  const [editedSettings, setEditedSettings] = useState<ScheduleSettings>({ ...settings })

  // Обновляем editedSettings при изменении settings
  useEffect(() => {
    setEditedSettings({ ...settings })
  }, [settings])

  const { toast } = useToast()

  // Фильтрация записей графика для текущей недели
  const currentWeekEntries = scheduleEntries.filter((entry) => {
    const weekDateStrings = weekDates.map((date) => date.toISOString().split("T")[0])
    return weekDateStrings.includes(entry.date)
  })

  // Обработчик генерации графика
  const handleGenerateSchedule = () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может генерировать график",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    toast({
      title: "Генерация графика",
      description: "Пожалуйста, подождите...",
    })

    try {
      // Генерируем график
      const newSchedule = generateSchedule(employees, dayPreferences, weekDates, settings)

      // Фильтруем существующие записи, оставляя только те, которые не относятся к текущей неделе
      const otherWeekEntries = scheduleEntries.filter((entry) => {
        const weekDateStrings = weekDates.map((date) => date.toISOString().split("T")[0])
        return !weekDateStrings.includes(entry.date)
      })

      // Объединяем с новыми записями для текущей недели
      const updatedEntries = [...otherWeekEntries, ...newSchedule]
      onScheduleEntriesChange(updatedEntries)

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
      setIsGenerating(false)
    }
  }

  // Обработчик отправки уведомлений о готовности графика
  const handleSendScheduleReadyNotifications = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может отправлять уведомления",
        variant: "destructive",
      })
      return
    }

    setIsSendingNotifications(true)
    toast({
      title: "Отправка уведомлений",
      description: "Пожалуйста, подождите...",
    })

    try {
      const message = generateScheduleReadyMessage(weekDates)
      let successCount = 0
      let failCount = 0

      // Отправляем уведомления всем сотрудникам с указанным именем пользователя Telegram
      for (const employee of employees) {
        if (employee.telegramUsername) {
          const success = await sendTelegramMessage(employee.telegramUsername, message)
          if (success) {
            successCount++
          } else {
            failCount++
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: "Успешно",
          description: `Уведомления отправлены ${successCount} сотрудникам${failCount > 0 ? `, не удалось отправить ${failCount} сотрудникам` : ""}`,
        })
      } else {
        toast({
          title: "Предупреждение",
          description: "Не удалось отправить уведомления. Проверьте имена пользователей Telegram.",
          variant: "warning",
        })
      }
    } catch (error) {
      console.error("Error sending notifications:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отправить уведомления",
        variant: "destructive",
      })
    } finally {
      setIsSendingNotifications(false)
    }
  }

  // Обработчик редактирования записи графика
  const handleEditEntry = (entry: ScheduleEntry) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может редактировать график",
        variant: "destructive",
      })
      return
    }

    // Создаем копию с гарантированными значениями для всех полей
    const entryToEdit = {
      ...entry,
      hours: entry.hours || (entry.status === 11 ? 11 : 12), // Устанавливаем значение по умолчанию
    }

    setEditingEntry(entryToEdit)
    setIsEditingEntry(true)
  }

  // Обработчик сохранения отредактированной записи
  const handleSaveEditedEntry = () => {
    if (!editingEntry) return

    // Фильтруем существующие записи, оставляя только те, которые не относятся к текущей неделе
    const otherEntries = scheduleEntries.filter((entry) => entry.id !== editingEntry.id)
    const updatedEntries = [...otherEntries, editingEntry]

    onScheduleEntriesChange(updatedEntries)
    setIsEditingEntry(false)
    setEditingEntry(null)

    toast({
      title: "Успешно",
      description: "Запись графика обновлена",
    })
  }

  // Обработчик сохранения настроек
  const handleSaveSettings = () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может изменять настройки",
        variant: "destructive",
      })
      return
    }

    onSettingsChange(editedSettings)
    setIsSettingsOpen(false)

    toast({
      title: "Успешно",
      description: "Настройки сохранены",
    })
  }

  // Получение статуса смены для отображения
  const getScheduleStatus = (employeeId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split("T")[0]
      return currentWeekEntries.find((entry) => entry.employeeId === employeeId && entry.date === dateStr) || null
    } catch (error) {
      console.error("Error in getScheduleStatus:", error)
      return null
    }
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
              Сгенерировать график
            </Button>

            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              Настройки генерации
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleSendScheduleReadyNotifications}
            disabled={isSendingNotifications || currentWeekEntries.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Уведомить о готовности графика
          </Button>
        </div>
      )}

      <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
        <CardHeader>
          <CardTitle>График работы</CardTitle>
          <CardDescription>
            Неделя: {formatDate(weekDates[0], "dd.MM")} - {formatDate(weekDates[6], "dd.MM")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentWeekEntries.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <p className="text-lg font-medium">График еще не сформирован</p>
              {isAdmin && (
                <p className="text-gray-500 mt-2">
                  Нажмите кнопку "Сгенерировать график", чтобы создать расписание на выбранную неделю
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Сотрудник</TableHead>
                    {weekDates.map((date, index) => (
                      <TableHead key={index} className="text-center min-w-[100px]">
                        {formatDate(date, "EEE")}
                        <br />
                        {formatDate(date, "dd.MM")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium" style={{ borderLeft: `4px solid ${employee.color}` }}>
                        {employee.name}
                        {employee.workScheduleMode === "5/2" && (
                          <span className="ml-2 text-xs text-gray-500">(5/2)</span>
                        )}
                        {employee.workScheduleMode === "fixed" && (
                          <span className="ml-2 text-xs text-gray-500">(фикс.)</span>
                        )}
                      </TableCell>
                      {weekDates.map((date, index) => {
                        const entry = getScheduleStatus(employee.id, date)
                        let bgColor = "bg-white"
                        let textContent = ""

                        if (!entry) {
                          return (
                            <TableCell key={index} className="text-center">
                              -
                            </TableCell>
                          )
                        }

                        if (entry.status === 0) {
                          bgColor = "bg-gray-100" // Выходной день - серый фон
                          textContent = "Выходной"
                        } else if (entry.status === 1) {
                          bgColor = employee.color
                          textContent = `${entry.hours || 12} ч`
                        } else if (entry.status === 11) {
                          bgColor = employee.color // Используем тот же цвет для сокращенного дня
                          textContent = `${entry.hours || 11} ч`
                        }

                        return (
                          <TableCell
                            key={index}
                            className={`text-center relative`}
                            style={{
                              backgroundColor: entry.status === 0 ? "white" : bgColor,
                              color: entry.status === 1 || entry.status === 11 ? "white" : undefined,
                            }}
                          >
                            {textContent}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-1 right-1 h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                onClick={() => handleEditEntry(entry)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования записи графика */}
      <Dialog open={isEditingEntry} onOpenChange={setIsEditingEntry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование смены</DialogTitle>
            <DialogDescription>
              {editingEntry && (
                <>
                  Сотрудник: {employees.find((emp) => emp.id === editingEntry.employeeId)?.name || "Неизвестный"}
                  <br />
                  Дата: {formatDate(editingEntry.date, "EEEE, dd MMMM yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shift-status">Статус смены</Label>
                <Select
                  value={String(editingEntry.status)}
                  onValueChange={(value) =>
                    setEditingEntry({
                      ...editingEntry,
                      status: Number(value) as ShiftStatus,
                      // Устанавливаем часы по умолчанию при изменении статуса
                      hours: Number(value) === 11 ? 11 : Number(value) === 1 ? 12 : undefined,
                    })
                  }
                >
                  <SelectTrigger id="shift-status">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Выходной</SelectItem>
                    <SelectItem value="1">Рабочий день (12ч)</SelectItem>
                    <SelectItem value="11">Сокращенный день (11ч)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingEntry.status > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="shift-hours">Количество часов</Label>
                  <Input
                    id="shift-hours"
                    type="number"
                    min="1"
                    max="24"
                    value={editingEntry.hours || (editingEntry.status === 11 ? 11 : 12)}
                    onChange={(e) =>
                      setEditingEntry({
                        ...editingEntry,
                        hours: Number(e.target.value) || (editingEntry.status === 11 ? 11 : 12),
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingEntry(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEditedEntry}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог настроек генерации графика */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки генерации графика</DialogTitle>
            <DialogDescription>Настройте параметры автоматической генерации графика</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exact-employees">Точное количество сотрудников в день</Label>
              <Input
                id="exact-employees"
                type="number"
                min="1"
                max="20"
                value={editedSettings.exactEmployeesPerDay}
                onChange={(e) =>
                  setEditedSettings({
                    ...editedSettings,
                    exactEmployeesPerDay: Number(e.target.value) || 3,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Точное количество сотрудников с гибким графиком, которые должны работать каждый день (не больше и не
                меньше)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-attempts">Количество попыток на поиск лучшего варианта</Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                max="100"
                value={editedSettings.maxGenerationAttempts}
                onChange={(e) =>
                  setEditedSettings({
                    ...editedSettings,
                    maxGenerationAttempts: Number(e.target.value) || 10,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Сколько раз система будет пытаться сгенерировать оптимальный график
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-generation"
                checked={editedSettings.autoGenerationEnabled}
                onChange={(e) =>
                  setEditedSettings({
                    ...editedSettings,
                    autoGenerationEnabled: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="auto-generation">Включить автоматическую генерацию графика</Label>
            </div>

            {editedSettings.autoGenerationEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auto-day">День автоматической генерации</Label>
                  <Select
                    value={String(editedSettings.autoGenerationDay)}
                    onValueChange={(value) =>
                      setEditedSettings({
                        ...editedSettings,
                        autoGenerationDay: Number(value) || 6,
                      })
                    }
                  >
                    <SelectTrigger id="auto-day">
                      <SelectValue placeholder="Выберите день" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Понедельник</SelectItem>
                      <SelectItem value="1">Вторник</SelectItem>
                      <SelectItem value="2">Среда</SelectItem>
                      <SelectItem value="3">Четверг</SelectItem>
                      <SelectItem value="4">Пятница</SelectItem>
                      <SelectItem value="5">Суббота</SelectItem>
                      <SelectItem value="6">Воскресенье</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auto-time">Время автоматической генерации</Label>
                  <Input
                    id="auto-time"
                    type="time"
                    value={editedSettings.autoGenerationTime}
                    onChange={(e) =>
                      setEditedSettings({
                        ...editedSettings,
                        autoGenerationTime: e.target.value || "10:00",
                      })
                    }
                  />
                </div>
              </>
            )}
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
