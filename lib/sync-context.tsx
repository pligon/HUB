"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { syncWithServer, isSupabaseAvailable } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"

// Тип для контекста синхронизации
type SyncContextType = {
  isSyncing: boolean
  syncStatus: "online" | "offline" | "syncing"
  lastSyncTime: Date | null
  manualSync: () => Promise<void>
}

// Создаем контекст
const SyncContext = createContext<SyncContextType | undefined>(undefined)

// Провайдер контекста
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"online" | "offline" | "syncing">("offline")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { toast } = useToast()

  // Функция для синхронизации данных
  const syncData = async (showToast = false) => {
    if (isSyncing) return // Предотвращаем одновременные синхронизации

    setIsSyncing(true)
    setSyncStatus("syncing")
    try {
      const success = await syncWithServer()
      setSyncStatus(success ? "online" : "offline")

      if (success) {
        setLastSyncTime(new Date())
        if (showToast) {
          toast({
            title: "Синхронизация завершена",
            description: "Данные успешно синхронизированы с сервером",
          })
        }
      } else if (showToast) {
        toast({
          title: "Синхронизация не удалась",
          description: "Не удалось подключиться к серверу. Приложение работает в автономном режиме.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error during sync:", error)
      setSyncStatus("offline")
      if (showToast) {
        toast({
          title: "Ошибка синхронизации",
          description: "Не удалось синхронизировать данные с сервером. Приложение работает в автономном режиме.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Функция для ручной синхронизации (с уведомлением)
  const manualSync = async () => {
    await syncData(true)
  }

  // Автоматическая синхронизация при загрузке
  useEffect(() => {
    syncData()

    // Проверяем статус соединения каждые 30 секунд
    const checkConnectionInterval = setInterval(() => {
      setSyncStatus(isSupabaseAvailable() ? "online" : "offline")
    }, 30000)

    return () => clearInterval(checkConnectionInterval)
  }, [])

  // Автоматическая синхронизация каждые 10 секунд
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      syncData()
    }, 10000) // 10 секунд

    return () => clearInterval(autoSyncInterval)
  }, [])

  return (
    <SyncContext.Provider value={{ isSyncing, syncStatus, lastSyncTime, manualSync }}>{children}</SyncContext.Provider>
  )
}

// Хук для использования контекста синхронизации
export function useSync() {
  const context = useContext(SyncContext)
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider")
  }
  return context
}
