"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Send, AlertTriangle, Info, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Employee } from "@/lib/types/schedule-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getChatIdByUsername, generateRegistrationCodeForEmployee, sendTelegramMessage } from "@/lib/telegram-utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase" // Исправлен импорт
import { canBotSendMessage, logNotification } from "@/lib/bot-status"
import BotStatusDisplay from "./bot-status-display"

// Заменяем интерфейс EmployeeWithCode на EmployeeWithChatId
interface EmployeeWithChatId extends Employee {
  chatIdInput: string
}

interface EmployeeNotificationsProps {
  employees: Employee[]
  isAdmin: boolean
}

export default function EmployeeNotifications({ employees, isAdmin }: EmployeeNotificationsProps) {
  const [message, setMessage] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false)
  const [selectedEmployeeForRegistration, setSelectedEmployeeForRegistration] = useState<Employee | null>(null)
  const [registrationCode, setRegistrationCode] = useState<string | null>(null)
  const { toast } = useToast()

  // В компоненте EmployeeNotifications заменяем:
  const [employeesWithChatId, setEmployeesWithChatId] = useState<EmployeeWithChatId[]>([])

  // В useEffect заменяем:
  useEffect(() => {
    // Инициализируем состояние с данными сотрудников
    const initialEmployeesWithChatId = employees.map((employee) => ({
      ...employee,
      chatIdInput: employee.chat_id?.toString() || "",
    }))
    setEmployeesWithChatId(initialEmployeesWithChatId)
  }, [employees])

  // Обработчик выбора/отмены выбора всех сотрудников
  const handleToggleAll = () => {
    if (selectedEmployees.length === employees.filter((e) => e.telegramUsername).length) {
      // Если выбраны все, снимаем выбор со всех
      setSelectedEmployees([])
    } else {
      // Иначе выбираем всех сотрудников с указанным именем пользователя Telegram
      setSelectedEmployees(employees.filter((e) => e.telegramUsername).map((e) => e.id))
    }
  }

  // Обработчик выбора/отмены выбора сотрудника
  const handleToggleEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter((id) => id !== employeeId))
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId])
    }
  }

  // Обработчик отправки сообщения
  const handleSendMessage = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может отправлять уведомления",
        variant: "destructive",
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст сообщения",
        variant: "destructive",
      })
      return
    }

    if (selectedEmployees.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одного сотрудника",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    toast({
      title: "Отправка сообщений",
      description: "Пожалуйста, подождите...",
    })

    try {
      let successCount = 0
      let failCount = 0
      const failedUsernames: string[] = []

      // Отправляем сообщения выбранным сотрудникам
      for (const employeeId of selectedEmployees) {
        const employee = employees.find((e) => e.id === employeeId)
        if (employee && employee.telegramUsername) {
          try {
            // Получаем chat_id из базы данных
            const chatId = await getChatIdByUsername(employee.telegramUsername)

            if (chatId) {
              // Отправляем сообщение по chat_id
              const success = await sendTelegramMessage(chatId, message)
              if (success) {
                successCount++
              } else {
                failCount++
                failedUsernames.push(employee.telegramUsername)
              }
            } else {
              // Если chat_id не найден, пробуем отправить по username
              const success = await sendTelegramMessage(`@${employee.telegramUsername}`, message)
              if (success) {
                successCount++
              } else {
                failCount++
                failedUsernames.push(employee.telegramUsername)
              }
            }
          } catch (error) {
            console.error(`Error sending message to ${employee.name}:`, error)
            failCount++
            failedUsernames.push(employee.telegramUsername)
          }
        }
      }

      if (successCount > 0) {
        toast({
          title: "Успешно",
          description: `Сообщения отправлены ${successCount} сотрудникам${failCount > 0 ? `, не удалось отправить ${failCount} сотрудникам` : ""}`,
        })
        setMessage("")
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось отправить сообщения. Проверьте, что пользователи зарегистрированы в боте.",
          variant: "destructive",
        })
        console.error("Failed to send messages to users:", failedUsernames.join(", "))
      }
    } catch (error) {
      console.error("Error sending messages:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщения. Проверьте консоль для получения дополнительной информации.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Заменяем функцию handleGenerateCode на handleChatIdChange
  const handleChatIdChange = (employeeId: string, value: string) => {
    setEmployeesWithChatId((prev) => prev.map((emp) => (emp.id === employeeId ? { ...emp, chatIdInput: value } : emp)))
  }

  // Заменяем функцию generateRegistrationCode на функцию updateChatId
  const updateChatId = async (employeeId: string, chatId: string) => {
    if (!chatId || isNaN(Number(chatId))) {
      toast({
        title: "Ошибка",
        description: "Введите корректный Chat ID",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("employees")
        .update({ chat_id: Number(chatId) })
        .eq("id", employeeId)

      if (error) {
        console.error("Ошибка при обновлении Chat ID:", error)
        toast({
          title: "Ошибка",
          description: "Не удалось обновить Chat ID",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Успешно",
        description: "Chat ID обновлен",
      })

      // Обновляем локальное состояние
      setEmployeesWithChatId((prev) =>
        prev.map((emp) => (emp.id === employeeId ? { ...emp, chatIdInput: chatId, chat_id: Number(chatId) } : emp)),
      )
    } catch (error) {
      console.error("Ошибка при обновлении Chat ID:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить Chat ID",
        variant: "destructive",
      })
    }
  }

  // Обработчик генерации кода регистрации
  const handleGenerateRegistrationCode = async (employee: Employee) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может генерировать коды регистрации",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingCode(true)
    setSelectedEmployeeForRegistration(employee)

    try {
      const code = await generateRegistrationCodeForEmployee(employee.id)

      if (code) {
        setRegistrationCode(code)
        setShowRegistrationDialog(true)

        toast({
          title: "Успешно",
          description: `Код регистрации для ${employee.name} сгенерирован`,
        })
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось сгенерировать код регистрации",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error generating registration code:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать код регистрации",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingCode(false)
    }
  }

  // В функции sendTestNotification добавляем проверку статуса бота и логирование
  const sendTestNotification = async (employee: Employee) => {
    setIsSending(true)
    try {
      // Проверяем, может ли бот отправлять сообщения в этот чат
      if (employee.chat_id) {
        const canSend = await canBotSendMessage(employee.chat_id)
        if (!canSend) {
          toast({
            title: "Ошибка",
            description:
              "Бот не может отправлять сообщения в этот чат. Возможно, пользователь не начал диалог с ботом.",
            variant: "destructive",
          })
          await logNotification(
            employee.id,
            employee.chat_id,
            "test",
            false,
            "Бот не может отправлять сообщения в этот чат",
          )
          setIsSending(false)
          return
        }
      }

      const result = await sendTelegramMessage(
        employee,
        "Это тестовое уведомление от системы управления графиком работы.",
      )

      if (result.success) {
        toast({
          title: "Успешно",
          description: "Тестовое уведомление отправлено",
        })
        await logNotification(employee.id, employee.chat_id, "test", true)
      } else {
        toast({
          title: "Ошибка",
          description: result.error || "Не удалось отправить уведомление",
          variant: "destructive",
        })
        await logNotification(employee.id, employee.chat_id, "test", false, result.error)
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отправить тестовое уведомление",
        variant: "destructive",
      })
      await logNotification(
        employee.id,
        employee.chat_id,
        "test",
        false,
        error instanceof Error ? error.message : "Неизвестная ошибка",
      )
    } finally {
      setIsSending(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className="mb-4">Только администратор может отправлять уведомления сотрудникам</p>
        </CardContent>
      </Card>
    )
  }

  const employeesWithTelegram = employees.filter((e) => e.telegramUsername)
  const allSelected = selectedEmployees.length === employeesWithTelegram.length && employeesWithTelegram.length > 0

  return (
    <div className="space-y-6">
      <BotStatusDisplay />

      <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
        <CardHeader>
          <CardTitle>Отправка уведомлений сотрудникам</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Важная информация</AlertTitle>
            <AlertDescription>
              <p>Для корректной работы уведомлений необходимо:</p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>
                  <strong>Обязательно:</strong> Каждый пользователь должен начать диалог с ботом @BarScheduleManagerBot,
                  отправив ему команду /start
                </li>
                <li>
                  Затем пользователь должен зарегистрироваться, используя команду /register с кодом, который вы можете
                  сгенерировать, нажав на кнопку "Код регистрации" рядом с именем сотрудника
                </li>
                <li>В поле "Имя пользователя в Telegram" должен быть указан точный username без символа @</li>
              </ol>
            </AlertDescription>
          </Alert>

          {employeesWithTelegram.length === 0 ? (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p>Нет сотрудников с указанным именем пользователя Telegram</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="select-all" checked={allSelected} onCheckedChange={handleToggleAll} />
                  <Label htmlFor="select-all">Выбрать всех</Label>
                </div>

                {/* Заменяем кнопку "Сгенерировать код" на поле ввода Chat ID: */}
                <Table>
                  <TableCaption>Список сотрудников с Chat ID</TableCaption>
                  <TableHead>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Telegram Username</TableHead>
                      <TableHead>Chat ID</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employeesWithChatId.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.telegramUsername || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={employee.chatIdInput}
                              onChange={(e) => handleChatIdChange(employee.id, e.target.value)}
                              placeholder="Введите Chat ID"
                              className="w-40"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateChatId(employee.id, employee.chatIdInput)}
                            >
                              Сохранить
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.chat_id ? (
                            <Badge variant="outline" className="bg-green-50">
                              Подключен
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50">
                              Не подключен
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Текст сообщения</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Введите текст сообщения..."
                  rows={5}
                />
                <p className="text-xs text-gray-500">
                  Вы можете использовать HTML-теги для форматирования: &lt;b&gt;жирный&lt;/b&gt;,
                  &lt;i&gt;курсив&lt;/i&gt;, &lt;u&gt;подчеркнутый&lt;/u&gt;
                </p>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isSending || selectedEmployees.length === 0 || !message.trim()}
                className="w-full bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
              >
                <Send className={`h-4 w-4 mr-2 ${isSending ? "animate-pulse" : ""}`} />
                {isSending ? "Отправка..." : "Отправить сообщение"}
              </Button>
            </>
          )}
        </CardContent>

        {/* Диалог с кодом регистрации */}
        <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Код регистрации</DialogTitle>
              <DialogDescription>
                {selectedEmployeeForRegistration && (
                  <>Код регистрации для сотрудника {selectedEmployeeForRegistration.name}</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="text-center">
                {registrationCode ? (
                  <>
                    <div className="text-3xl font-bold mb-4">{registrationCode}</div>
                    <p className="text-sm text-gray-500 mb-4">Попросите сотрудника отправить боту команду:</p>
                    <div className="bg-gray-100 p-2 rounded-md mb-4">
                      <code>/register {registrationCode}</code>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowRegistrationDialog(false)}>Закрыть</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  )
}
