"use client"

import { useState, useEffect } from "react"
import { HomeIcon, ListTodo, BookOpen, Menu, X, Calendar, RefreshCw, CloudOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import BarOrderModule from "@/components/modules/bar-order-module"
import ChecklistModule from "@/components/modules/checklist-module"
import SchoolModule from "@/components/modules/school-module"
import ScheduleModule from "@/components/modules/schedule-module"
import { useMobile } from "@/hooks/use-mobile"
import { useSync } from "@/lib/sync-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Home() {
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useMobile()
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const { isSyncing, syncStatus, lastSyncTime, manualSync } = useSync()

  // Detect keyboard visibility on mobile
  useEffect(() => {
    if (typeof window !== "undefined") {
      const detectKeyboard = () => {
        // On mobile, when keyboard is visible, the viewport height decreases
        const isKeyboardVisible = window.innerHeight < window.outerHeight * 0.75
        setKeyboardVisible(isKeyboardVisible)
      }

      window.addEventListener("resize", detectKeyboard)
      return () => window.removeEventListener("resize", detectKeyboard)
    }
  }, [])

  // Отслеживание прокрутки для эффекта параллакса
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Форматирование времени последней синхронизации
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return "Никогда"

    const now = new Date()
    const diffMs = now.getTime() - lastSyncTime.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return `${diffSec} сек. назад`

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin} мин. назад`

    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour} ч. назад`

    return lastSyncTime.toLocaleString("ru-RU")
  }

  const modules = [
    {
      id: "bar-order",
      name: "Заказ бар",
      icon: <HomeIcon className="h-5 w-5" />,
      component: <BarOrderModule />,
    },
    {
      id: "schedule",
      name: "График бар",
      icon: <Calendar className="h-5 w-5" />,
      component: <ScheduleModule />,
    },
    {
      id: "checklist",
      name: "Чек-лист",
      icon: <ListTodo className="h-5 w-5" />,
      component: <ChecklistModule />,
    },
    {
      id: "school",
      name: "Школа",
      icon: <BookOpen className="h-5 w-5" />,
      component: <SchoolModule />,
    },
  ]

  return (
    <div
      className={cn(
        "flex h-screen bg-[#1e4d36] relative overflow-hidden",
        keyboardVisible && "h-auto min-h-screen pb-20", // Adjust layout when keyboard is visible
      )}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-20 z-10 pointer-events-none"></div>

      {/* Background gradient elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#2a5a41] opacity-40 blur-3xl z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#2a5a41] opacity-40 blur-3xl z-0"></div>
      <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full bg-[#3c6b53] opacity-20 blur-3xl z-0"></div>

      {/* Decorative monstera leaves - с анимацией и эффектами */}
      <div
        className="absolute top-[5%] right-[10%] w-[200px] h-[200px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 pointer-events-none leaf-animation leaf-shadow parallax-leaf parallax-slow"
        style={{ opacity: 0.3, transform: `rotate(45deg) translateY(${scrollY * -0.05}px)` }}
      ></div>

      <div
        className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 pointer-events-none leaf-animation-slow leaf-shadow parallax-leaf parallax-medium"
        style={{ opacity: 0.3, transform: `rotate(-12deg) translateY(${scrollY * -0.1}px)` }}
      ></div>

      <div
        className="absolute top-[40%] left-[20%] w-[180px] h-[180px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 pointer-events-none leaf-animation-large leaf-shadow parallax-leaf parallax-fast"
        style={{ opacity: 0.2, transform: `rotate(90deg) translateY(${scrollY * -0.15}px)` }}
      ></div>

      <div
        className="absolute bottom-[40%] right-[15%] w-[220px] h-[220px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 pointer-events-none leaf-animation leaf-shadow parallax-leaf parallax-medium hidden md:block"
        style={{ opacity: 0.25, transform: `rotate(180deg) translateY(${scrollY * -0.1}px)` }}
      ></div>

      <div
        className="absolute top-[70%] right-[30%] w-[150px] h-[150px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 pointer-events-none leaf-animation-slow leaf-shadow parallax-leaf parallax-slow hidden md:block"
        style={{ opacity: 0.2, transform: `rotate(-45deg) translateY(${scrollY * -0.05}px)` }}
      ></div>

      {/* Интерактивный лист с эффектом при наведении */}
      <div
        className="absolute top-[20%] right-[25%] w-[120px] h-[120px] bg-[url('/monstera-leaf.png')] bg-contain bg-no-repeat z-10 leaf-hover-effect leaf-shadow"
        style={{ opacity: 0.4, transform: `rotate(15deg)` }}
      ></div>

      {/* Mobile sidebar toggle */}
      {isMobile && (
        <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 text-white" onClick={toggleSidebar}>
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      )}

      {/* Sidebar with enhanced styling */}
      <div
        className={cn(
          "bg-gradient-to-b from-[#2a5a41]/90 to-[#1e4d36]/90 backdrop-blur-md w-64 p-6 flex flex-col transition-all duration-300 ease-in-out z-30 border-r border-white/10",
          isMobile && "fixed inset-y-0 left-0 z-40",
          isMobile && !sidebarOpen && "-translate-x-full",
        )}
      >
        <div className="text-2xl font-bold mb-8 text-white">Задачи</div>
        <div className="space-y-4">
          {modules.map((module) => (
            <Button
              key={module.id}
              variant={activeModule === module.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-left",
                activeModule === module.id
                  ? "bg-[#3c6b53] hover:bg-[#3c6b53]/90 text-white"
                  : "hover:bg-[#3c6b53]/50 text-white/80",
              )}
              onClick={() => {
                setActiveModule(module.id)
                if (isMobile) setSidebarOpen(false)
              }}
            >
              <div className="flex items-center">
                {module.icon}
                <span className="ml-2">{module.name}</span>
              </div>
            </Button>
          ))}
        </div>
        <div className="mt-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-white/80 hover:bg-[#3c6b53]/50"
                  onClick={manualSync}
                  disabled={isSyncing}
                >
                  {syncStatus === "online" ? (
                    <RefreshCw className={`h-5 w-5 mr-2 ${isSyncing ? "animate-spin" : ""} text-green-400`} />
                  ) : syncStatus === "syncing" ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin text-yellow-400" />
                  ) : (
                    <CloudOff className="h-5 w-5 mr-2 text-red-400" />
                  )}
                  <span>
                    {syncStatus === "online"
                      ? "Синхронизировано"
                      : syncStatus === "syncing"
                        ? "Синхронизация..."
                        : "Автономный режим"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {syncStatus === "online"
                  ? `Данные синхронизированы с сервером. Последняя синхронизация: ${formatLastSyncTime()}`
                  : syncStatus === "syncing"
                    ? "Выполняется синхронизация данных"
                    : "Нет подключения к серверу. Приложение работает в автономном режиме."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm text-white/50 mt-2">Версия 1.0.0</div>
        </div>
      </div>

      {/* Main content with enhanced styling */}
      <div
        className={cn(
          "flex-1 p-6 overflow-auto relative z-20",
          isMobile && "pt-16", // Add padding for the mobile menu button
          keyboardVisible && "pb-20", // Add padding when keyboard is visible
        )}
      >
        {activeModule ? (
          modules.find((m) => m.id === activeModule)?.component
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <h1 className="text-4xl font-bold text-white col-span-full mb-6 drop-shadow-md">Добро пожаловать</h1>
            {modules.map((module) => (
              <Card
                key={module.id}
                className="hover:shadow-xl transition-all cursor-pointer bg-white/80 backdrop-blur-sm border-none shadow-lg relative overflow-hidden group"
                onClick={() => setActiveModule(module.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#3c6b53]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-[#3c6b53] to-[#2a5a41] text-white p-3 rounded-full shadow-md">
                      {module.icon}
                    </div>
                    <div className="font-medium text-lg">{module.name}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
