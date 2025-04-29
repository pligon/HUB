"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { checkBotStatus, type BotStatus } from "@/lib/bot-status"
import { useToast } from "@/hooks/use-toast"

export default function BotStatusDisplay() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchBotStatus = async () => {
    setIsLoading(true)
    try {
      const botStatus = await checkBotStatus()
      setStatus(botStatus)
    } catch (error) {
      console.error("Ошибка при проверке статуса бота:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось проверить статус бота",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBotStatus()
  }, [])

  const setupWebhook = async () => {
    try {
      const response = await fetch("/api/telegram/setup-webhook", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Ошибка при настройке вебхука")
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Успешно",
          description: "Вебхук успешно настроен",
        })
        // Обновляем статус бота
        fetchBotStatus()
      } else {
        throw new Error(data.error || "Неизвестная ошибка")
      }
    } catch (error) {
      console.error("Ошибка при настройке вебхука:", error)
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось настроить вебхук",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Статус Telegram бота</span>
          <Button variant="ghost" size="sm" onClick={fetchBotStatus} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Статус бота:</span>
              {status.isActive ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-4 w-4 mr-1" /> Активен
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-4 w-4 mr-1" /> Неактивен
                </Badge>
              )}
            </div>

            {status.isActive && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm text-gray-500">Имя бота:</span>
                    <p>{status.firstName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Username:</span>
                    <p>@{status.username}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Вебхук:</span>
                  {status.webhookInfo?.url ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-4 w-4 mr-1" /> Настроен
                    </Badge>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertCircle className="h-4 w-4 mr-1" /> Не настроен
                      </Badge>
                      <Button size="sm" onClick={setupWebhook}>
                        Настроить
                      </Button>
                    </div>
                  )}
                </div>

                {status.webhookInfo?.url && (
                  <div>
                    <span className="text-sm text-gray-500">URL вебхука:</span>
                    <p className="text-xs break-all">{status.webhookInfo.url}</p>
                  </div>
                )}
              </>
            )}

            {status.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <span className="text-sm text-red-700">{status.error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">Не удалось получить информацию о статусе бота</div>
        )}
      </CardContent>
    </Card>
  )
}
