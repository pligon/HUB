"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Send, AlertTriangle, Info, RefreshCw, QrCode } from "lucide-react"
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

              <div className="grid grid-cols-1 gap-2 mt-2">
                {employeesWithTelegram.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => handleToggleEmployee(employee.id)}
                      />
                      <Label htmlFor={`employee-${employee.id}`} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: employee.color }}></div>
                        {employee.name}
                        <span className="text-xs text-gray-500 ml-1">({employee.telegramUsername})</span>
                      </Label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateRegistrationCode(employee)}
                      disabled={isGeneratingCode}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Код регистрации
                    </Button>
                  </div>
                ))}
              </div>
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
  )
}
