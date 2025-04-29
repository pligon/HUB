"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { TimePickerInput } from "@/components/ui/time-picker-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserPlus, UserMinus, Lock, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Employee, WorkScheduleMode } from "@/lib/types/schedule-types"
import { generateId, addEmployee, updateEmployee, deleteEmployee } from "@/lib/db-schedule"
import EmployeeNotifications from "./employee-notifications"

// Добавляем импорт BotStatusDisplay
import BotStatusDisplay from "./bot-status-display"

// Цветовые опции для сотрудников
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

// Создаем полный шаблон сотрудника для избежания undefined значений
const emptyEmployee: Employee = {
  id: "",
  name: "",
  color: "#33FF57",
  telegramUsername: "",
  maxWorkDays: 5,
  minOffDays: 2,
  workDayReminderTime: "08:00",
  scheduleReadyReminderTime: "20:00",
  scheduleReadyReminderDay: 5, // Пятница
  workScheduleMode: "flexible",
  fixedWorkDays: [],
  fixedOffDays: [],
  password: "",
  isAdmin: false,
  createdAt: new Date().toISOString(),
  chat_id: undefined,
}

interface EmployeeManagementProps {
  employees: Employee[]
  isAdmin: boolean
  onEmployeesChange: (employees: Employee[]) => void
}

export default function EmployeeManagement({ employees, isAdmin, onEmployeesChange }: EmployeeManagementProps) {
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState<Employee>({ ...emptyEmployee })
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [activeTab, setActiveTab] = useState("employees")
  const { toast } = useToast()

  // Обработчик добавления сотрудника
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
    if (newEmployee.workScheduleMode === "5/2") {
      // Для графика 5/2 фиксированные значения
      newEmployee.maxWorkDays = 5
      newEmployee.minOffDays = 2
      newEmployee.fixedWorkDays = [0, 1, 2, 3, 4] // Пн-Пт
      newEmployee.fixedOffDays = [5, 6] // Сб-Вс
    } else if (newEmployee.workScheduleMode === "fixed") {
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

      // Устанавливаем max/min дни в соответствии с выбранными днями
      newEmployee.maxWorkDays = newEmployee.fixedWorkDays.length
      newEmployee.minOffDays = 7 - newEmployee.fixedWorkDays.length
    } else if (newEmployee.workScheduleMode === "flexible") {
      // Для гибкого графика проверяем корректность настроек
      if (!newEmployee.maxWorkDays || !newEmployee.minOffDays) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля для гибкого графика",
          variant: "destructive",
        })
        return
      }

      // Проверка на корректность значений
      if (newEmployee.maxWorkDays + newEmployee.minOffDays > 7) {
        toast({
          title: "Ошибка",
          description: "Сумма максимальных рабочих и минимальных выходных дней не может превышать 7",
          variant: "destructive",
        })
        return
      }
    }

    const employee: Employee = {
      ...newEmployee,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }

    try {
      // Добавляем сотрудника напрямую в базу данных
      const success = await addEmployee(employee)

      if (success) {
        // Обновляем локальное состояние
        const updatedEmployees = [...employees, employee]
        onEmployeesChange(updatedEmployees)

        setNewEmployee({ ...emptyEmployee })
        setIsAddEmployeeOpen(false)

        toast({
          title: "Успешно",
          description: "Сотрудник добавлен",
        })
      }
    } catch (error) {
      console.error("Error adding employee:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить сотрудника",
        variant: "destructive",
      })
    }
  }

  // Обработчик редактирования сотрудника
  const handleEditEmployee = (employee: Employee) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может редактировать сотрудников",
        variant: "destructive",
      })
      return
    }

    // Создаем полную копию сотрудника с гарантированными значениями для всех полей
    const employeeToEdit: Employee = {
      ...emptyEmployee,
      ...employee,
      telegramUsername: employee.telegramUsername || "",
      workDayReminderTime: employee.workDayReminderTime || "08:00",
      scheduleReadyReminderTime: employee.scheduleReadyReminderTime || "20:00",
      scheduleReadyReminderDay: employee.scheduleReadyReminderDay !== undefined ? employee.scheduleReadyReminderDay : 5,
      fixedWorkDays: employee.fixedWorkDays || [],
      fixedOffDays: employee.fixedOffDays || [],
      password: employee.password || "",
    }

    setEditingEmployee(employeeToEdit)
    setIsEditEmployeeOpen(true)
  }

  // Обработчик сохранения отредактированного сотрудника
  const handleSaveEditedEmployee = async () => {
    if (!editingEmployee) return

    // Проверка настроек в зависимости от типа графика
    if (editingEmployee.workScheduleMode === "5/2") {
      // Для графика 5/2 фиксированные значения
      editingEmployee.maxWorkDays = 5
      editingEmployee.minOffDays = 2
      editingEmployee.fixedWorkDays = [0, 1, 2, 3, 4] // Пн-Пт
      editingEmployee.fixedOffDays = [5, 6] // Сб-Вс
    } else if (editingEmployee.workScheduleMode === "fixed") {
      // Для фиксированного графика проверяем, что выбраны дни
      if (!editingEmployee.fixedWorkDays || editingEmployee.fixedWorkDays.length === 0) {
        toast({
          title: "Ошибка",
          description: "Выберите рабочие дни для фиксированного графика",
          variant: "destructive",
        })
        return
      }

      // Устанавливаем выходные дни как дополнение к рабочим
      const allDays = [0, 1, 2, 3, 4, 5, 6]
      editingEmployee.fixedOffDays = allDays.filter((day) => !editingEmployee.fixedWorkDays?.includes(day))

      // Устанавливаем max/min дни в соответствии с выбранными днями
      editingEmployee.maxWorkDays = editingEmployee.fixedWorkDays.length
      editingEmployee.minOffDays = 7 - editingEmployee.fixedWorkDays.length
    } else if (editingEmployee.workScheduleMode === "flexible") {
      // Для гибкого графика проверяем корректность настроек
      if (editingEmployee.maxWorkDays + editingEmployee.minOffDays > 7) {
        toast({
          title: "Ошибка",
          description: "Сумма максимальных рабочих и минимальных выходных дней не может превышать 7",
          variant: "destructive",
        })
        return
      }
    }

    try {
      // Обновляем сотрудника напрямую в базе данных
      const success = await updateEmployee(editingEmployee)

      if (success) {
        // Обновляем локальное состояние
        const updatedEmployees = employees.map((emp) => (emp.id === editingEmployee.id ? editingEmployee : emp))
        onEmployeesChange(updatedEmployees)

        setEditingEmployee(null)
        setIsEditEmployeeOpen(false)

        toast({
          title: "Успешно",
          description: "Данные сотрудника обновлены",
        })
      }
    } catch (error) {
      console.error("Error updating employee:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные сотрудника",
        variant: "destructive",
      })
    }
  }

  // Обработчик удаления сотрудника
  const handleDeleteEmployee = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может удалять сотрудников",
        variant: "destructive",
      })
      return
    }

    try {
      // Удаляем сотрудника напрямую из базы данных
      const success = await deleteEmployee(id)

      if (success) {
        // Обновляем локальное состояние
        const updatedEmployees = employees.filter((emp) => emp.id !== id)
        onEmployeesChange(updatedEmployees)

        toast({
          title: "Успешно",
          description: "Сотрудник удален",
        })
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сотрудника",
        variant: "destructive",
      })
    }
  }

  // Обработчик переключения дня для фиксированного графика (для нового сотрудника)
  const handleFixedDayToggle = (day: number) => {
    const currentDays = newEmployee.fixedWorkDays || []

    if (currentDays.includes(day)) {
      // Удаляем день
      setNewEmployee({
        ...newEmployee,
        fixedWorkDays: currentDays.filter((d) => d !== day),
      })
    } else {
      // Добавляем день
      setNewEmployee({
        ...newEmployee,
        fixedWorkDays: [...currentDays, day],
      })
    }
  }

  // Обработчик переключения дня для фиксированных выходных (для нового сотрудника)
  const handleFixedOffDayToggle = (day: number) => {
    const currentDays = newEmployee.fixedOffDays || []

    if (currentDays.includes(day)) {
      // Удаляем день
      setNewEmployee({
        ...newEmployee,
        fixedOffDays: currentDays.filter((d) => d !== day),
      })
    } else {
      // Добавляем день
      setNewEmployee({
        ...newEmployee,
        fixedOffDays: [...currentDays, day],
      })
    }
  }

  // Обработчик переключения дня для фиксированного графика (для редактирования)
  const handleEditFixedDayToggle = (day: number) => {
    if (!editingEmployee) return

    const currentDays = editingEmployee.fixedWorkDays || []

    if (currentDays.includes(day)) {
      // Удаляем день
      setEditingEmployee({
        ...editingEmployee,
        fixedWorkDays: currentDays.filter((d) => d !== day),
      })
    } else {
      // Добавляем день
      setEditingEmployee({
        ...editingEmployee,
        fixedWorkDays: [...currentDays, day],
      })
    }
  }

  // Обработчик переключения дня для фиксированных выходных (для редактирования)
  const handleEditFixedOffDayToggle = (day: number) => {
    if (!editingEmployee) return

    const currentDays = editingEmployee.fixedOffDays || []

    if (currentDays.includes(day)) {
      // Удаляем день
      setEditingEmployee({
        ...editingEmployee,
        fixedOffDays: currentDays.filter((d) => d !== day),
      })
    } else {
      // Добавляем день
      setEditingEmployee({
        ...editingEmployee,
        fixedOffDays: [...currentDays, day],
      })
    }
  }

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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* В компоненте EmployeeManagement обновляем TabsList, добавляя вкладку "Статус бота" */}
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="bot-status">Статус бота</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <div className="flex justify-between mb-4">
            <Button onClick={() => setIsAddEmployeeOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Добавить сотрудника
            </Button>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
            <CardHeader>
              <CardTitle>Управление сотрудниками</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>График</TableHead>
                      <TableHead>Цвет</TableHead>
                      <TableHead>Telegram</TableHead>
                      <TableHead>Макс. рабочих дней</TableHead>
                      <TableHead>Мин. выходных</TableHead>
                      <TableHead>Админ</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          {employee.workScheduleMode === "5/2"
                            ? "5/2"
                            : employee.workScheduleMode === "fixed"
                              ? "Фиксированный"
                              : "Гибкий"}
                        </TableCell>
                        <TableCell>
                          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: employee.color }}></div>
                        </TableCell>
                        <TableCell>{employee.telegramUsername || "-"}</TableCell>
                        <TableCell>{employee.maxWorkDays}</TableCell>
                        <TableCell>{employee.minOffDays}</TableCell>
                        <TableCell>{employee.isAdmin ? "Да" : "Нет"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-700"
                              onClick={() => handleEditEmployee(employee)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteEmployee(employee.id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <EmployeeNotifications employees={employees} isAdmin={isAdmin} />
        </TabsContent>

        {/* Добавляем содержимое для новой вкладки */}
        <TabsContent value="bot-status" className="mt-4">
          <BotStatusDisplay />
        </TabsContent>
      </Tabs>

      {/* Диалог добавления сотрудника */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Добавить сотрудника</DialogTitle>
            <DialogDescription>Заполните информацию о новом сотруднике</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Имя сотрудника</Label>
              <Input
                id="employee-name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-color">Цвет</Label>
              <Select
                value={newEmployee.color}
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
              <Label htmlFor="telegram-username">Имя пользователя в Telegram</Label>
              <Input
                id="telegram-username"
                value={newEmployee.telegramUsername}
                onChange={(e) => setNewEmployee({ ...newEmployee, telegramUsername: e.target.value })}
                placeholder="@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work-schedule">Режим графика</Label>
              <Select
                value={newEmployee.workScheduleMode}
                onValueChange={(value: WorkScheduleMode) =>
                  setNewEmployee({
                    ...newEmployee,
                    workScheduleMode: value,
                    // Сбрасываем настройки при смене типа графика
                    fixedWorkDays: value === "fixed" ? [] : [],
                    fixedOffDays: value === "flexible" ? [] : [],
                  })
                }
              >
                <SelectTrigger id="work-schedule">
                  <SelectValue placeholder="Выберите режим" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5/2">5/2 (Пн-Пт)</SelectItem>
                  <SelectItem value="flexible">Гибкий</SelectItem>
                  <SelectItem value="fixed">Фиксированный</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newEmployee.workScheduleMode === "flexible" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="max-work-days">Максимальное количество рабочих дней</Label>
                  <Input
                    id="max-work-days"
                    type="number"
                    min="1"
                    max="7"
                    value={newEmployee.maxWorkDays}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        maxWorkDays: Number.parseInt(e.target.value) || 5,
                        minOffDays: 7 - (Number.parseInt(e.target.value) || 5),
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-off-days">Минимальное количество выходных дней</Label>
                  <Input id="min-off-days" type="number" min="0" max="6" value={newEmployee.minOffDays} disabled />
                  <p className="text-xs text-gray-500">
                    Рассчитывается автоматически: 7 - макс. рабочих дней = {7 - newEmployee.maxWorkDays}
                  </p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Фиксированные выходные дни</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`off-day-${day.value}`}
                          checked={(newEmployee.fixedOffDays || []).includes(day.value)}
                          onCheckedChange={() => handleFixedOffDayToggle(day.value)}
                        />
                        <Label htmlFor={`off-day-${day.value}`}>{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {newEmployee.workScheduleMode === "fixed" && (
              <div className="space-y-2 col-span-2">
                <Label>Выберите рабочие дни</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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

            <div className="space-y-2">
              <Label htmlFor="work-day-reminder">Время напоминания о рабочем дне</Label>
              <TimePickerInput
                value={newEmployee.workDayReminderTime}
                onChange={(value) => setNewEmployee({ ...newEmployee, workDayReminderTime: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-ready-reminder">Время напоминания о готовности графика</Label>
              <TimePickerInput
                value={newEmployee.scheduleReadyReminderTime}
                onChange={(value) => setNewEmployee({ ...newEmployee, scheduleReadyReminderTime: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-ready-day">День напоминания о готовности графика</Label>
              <Select
                value={String(newEmployee.scheduleReadyReminderDay)}
                onValueChange={(value) =>
                  setNewEmployee({ ...newEmployee, scheduleReadyReminderDay: Number.parseInt(value) })
                }
              >
                <SelectTrigger id="schedule-ready-day">
                  <SelectValue placeholder="Выберите день" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-password">Личный пароль сотрудника</Label>
              <Input
                id="employee-password"
                type="password"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat-id">Chat ID в Telegram</Label>
              <Input
                id="chat-id"
                type="number"
                value={newEmployee.chat_id || ""}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, chat_id: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Введите Chat ID"
              />
              <p className="text-xs text-gray-500">Идентификатор чата для отправки уведомлений</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-admin"
                checked={newEmployee.isAdmin}
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

      {/* Диалог редактирования сотрудника */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
            <DialogDescription>Измените информацию о сотруднике</DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-employee-name">Имя сотрудника</Label>
                <Input
                  id="edit-employee-name"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-employee-color">Цвет</Label>
                <Select
                  value={editingEmployee.color}
                  onValueChange={(value) => setEditingEmployee({ ...editingEmployee, color: value })}
                >
                  <SelectTrigger id="edit-employee-color">
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
                <Label htmlFor="edit-telegram-username">Имя пользователя в Telegram</Label>
                <Input
                  id="edit-telegram-username"
                  value={editingEmployee.telegramUsername}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, telegramUsername: e.target.value })}
                  placeholder="@username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-work-schedule">Режим графика</Label>
                <Select
                  value={editingEmployee.workScheduleMode}
                  onValueChange={(value: WorkScheduleMode) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      workScheduleMode: value,
                      // Сбрасываем настройки при смене типа графика
                      fixedWorkDays: value === "fixed" ? [] : [],
                      fixedOffDays: value === "flexible" ? [] : [],
                    })
                  }
                >
                  <SelectTrigger id="edit-work-schedule">
                    <SelectValue placeholder="Выберите режим" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5/2">5/2 (Пн-Пт)</SelectItem>
                    <SelectItem value="flexible">Гибкий</SelectItem>
                    <SelectItem value="fixed">Фиксированный</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingEmployee.workScheduleMode === "flexible" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-max-work-days">Максимальное количество рабочих дней</Label>
                    <Input
                      id="edit-max-work-days"
                      type="number"
                      min="1"
                      max="7"
                      value={editingEmployee.maxWorkDays}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          maxWorkDays: Number.parseInt(e.target.value) || 5,
                          minOffDays: 7 - (Number.parseInt(e.target.value) || 5),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-min-off-days">Минимальное количество выходных дней</Label>
                    <Input
                      id="edit-min-off-days"
                      type="number"
                      min="0"
                      max="6"
                      value={editingEmployee.minOffDays}
                      disabled
                    />
                    <p className="text-xs text-gray-500">
                      Рассчитывается автоматически: 7 - макс. рабочих дней = {7 - editingEmployee.maxWorkDays}
                    </p>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Фиксированные выходные дни</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {WEEKDAYS.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-off-day-${day.value}`}
                            checked={(editingEmployee.fixedOffDays || []).includes(day.value)}
                            onCheckedChange={() => handleEditFixedOffDayToggle(day.value)}
                          />
                          <Label htmlFor={`edit-off-day-${day.value}`}>{day.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {editingEmployee.workScheduleMode === "fixed" && (
                <div className="space-y-2 col-span-2">
                  <Label>Выберите рабочие дни</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-day-${day.value}`}
                          checked={(editingEmployee.fixedWorkDays || []).includes(day.value)}
                          onCheckedChange={() => handleEditFixedDayToggle(day.value)}
                        />
                        <Label htmlFor={`edit-day-${day.value}`}>{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-work-day-reminder">Время напоминания о рабочем дне</Label>
                <TimePickerInput
                  value={editingEmployee.workDayReminderTime}
                  onChange={(value) => setEditingEmployee({ ...editingEmployee, workDayReminderTime: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-schedule-ready-reminder">Время напоминания о готовности графика</Label>
                <TimePickerInput
                  value={editingEmployee.scheduleReadyReminderTime}
                  onChange={(value) => setEditingEmployee({ ...editingEmployee, scheduleReadyReminderTime: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-schedule-ready-day">День напоминания о готовности графика</Label>
                <Select
                  value={String(editingEmployee.scheduleReadyReminderDay)}
                  onValueChange={(value) =>
                    setEditingEmployee({ ...editingEmployee, scheduleReadyReminderDay: Number.parseInt(value) })
                  }
                >
                  <SelectTrigger id="edit-schedule-ready-day">
                    <SelectValue placeholder="Выберите день" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-employee-password">Личный пароль сотрудника</Label>
                <Input
                  id="edit-employee-password"
                  type="password"
                  value={editingEmployee.password}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                  placeholder="Оставьте пустым, чтобы не менять"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-chat-id">Chat ID в Telegram</Label>
                <Input
                  id="edit-chat-id"
                  type="number"
                  value={editingEmployee.chat_id || ""}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      chat_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Введите Chat ID"
                />
                <p className="text-xs text-gray-500">Идентификатор чата для отправки уведомлений</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-admin"
                  checked={editingEmployee.isAdmin}
                  onCheckedChange={(checked) => setEditingEmployee({ ...editingEmployee, isAdmin: checked })}
                />
                <Label htmlFor="edit-is-admin">Администратор</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEditedEmployee}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
