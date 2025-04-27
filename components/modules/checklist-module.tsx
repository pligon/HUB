"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Plus, CalendarIcon, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { type Task, loadFromStore, saveToStore } from "@/lib/db"

type Priority = "high" | "medium" | "low"
type Status = "pending" | "in-progress" | "completed"

export default function ChecklistModule() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState<{
    title: string
    priority: Priority
    dueDate: Date | null
  }>({
    title: "",
    priority: "medium",
    dueDate: null,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")
  const [dbInitialized, setDbInitialized] = useState(false)
  const { toast } = useToast()

  // Load tasks from database on component mount
  useEffect(() => {
    const loadTasks = async () => {
      const loadedTasks = await loadFromStore<Task>("tasks")
      if (loadedTasks.length > 0) {
        // Convert string dates back to Date objects for UI display
        const tasksWithDates = loadedTasks.map((task) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : null, // Преобразуем строку в Date
          createdAt: new Date(task.createdAt), // Также преобразуем createdAt для консистентности
        }))
        setTasks(tasksWithDates)
      }
      setDbInitialized(true)
    }

    loadTasks()
  }, [])

  // Save tasks to database whenever they change
  useEffect(() => {
    if (dbInitialized && tasks.length > 0) {
      // Convert Date objects to strings for storage
      const tasksForStorage = tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null, // Преобразуем в Date, затем в строку
        createdAt: new Date(task.createdAt).toISOString(), // Преобразуем createdAt для консистентности
      }))
      saveToStore("tasks", tasksForStorage)
    }
  }, [tasks, dbInitialized])

  const handleAddTask = () => {
    if (newTask.title.trim() === "") {
      toast({
        title: "Ошибка",
        description: "Введите название задачи",
        variant: "destructive",
      })
      return
    }

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null, // Преобразуем в Date, затем в строку
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    setTasks([...tasks, task])
    setNewTask({
      title: "",
      priority: "medium",
      dueDate: null,
    })
    setIsDialogOpen(false)
    toast({
      title: "Успешно",
      description: "Задача добавлена",
    })
  }

  const handleTaskStatusChange = (taskId: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const newStatus =
            task.status === "pending" ? "in-progress" : task.status === "in-progress" ? "completed" : "pending"
          return { ...task, status: newStatus }
        }
        return task
      }),
    )
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true
    if (filter === "active") return task.status !== "completed"
    if (filter === "completed") return task.status === "completed"
    return true
  })

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Ожидает</Badge>
      case "in-progress":
        return <Badge variant="secondary">В процессе</Badge>
      case "completed":
        return <Badge variant="default">Выполнено</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Чек-лист</h1>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Фильтр
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <Button
                  variant={filter === "all" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setFilter("all")}
                >
                  Все задачи
                </Button>
                <Button
                  variant={filter === "active" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setFilter("active")}
                >
                  Активные
                </Button>
                <Button
                  variant={filter === "completed" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setFilter("completed")}
                >
                  Выполненные
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Новая задача
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить задачу</DialogTitle>
                <DialogDescription>Создайте новую задачу для вашего чек-листа</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Название задачи</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Приоритет</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: Priority) =>
                      setNewTask({
                        ...newTask,
                        priority: value,
                      })
                    }
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue placeholder="Выберите приоритет" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Высокий</SelectItem>
                      <SelectItem value="medium">Средний</SelectItem>
                      <SelectItem value="low">Низкий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">Срок выполнения</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="task-due-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.dueDate ? format(newTask.dueDate, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.dueDate || undefined}
                        onSelect={(date) =>
                          setNewTask({
                            ...newTask,
                            dueDate: date,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddTask}>Добавить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                "bg-white/80 backdrop-blur-sm border-none cursor-pointer transition-all",
                task.status === "completed" && "opacity-60",
              )}
              onClick={() => handleTaskStatusChange(task.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        task.priority === "high" && "bg-red-500",
                        task.priority === "medium" && "bg-yellow-500",
                        task.priority === "low" && "bg-green-500",
                      )}
                    />
                    <div>
                      <div className="font-medium">{task.title}</div>
                      {task.dueDate && (
                        <div className="text-sm text-gray-500">
                          До{" "}
                          {format(
                            typeof task.dueDate === "string" ? new Date(task.dueDate) : task.dueDate,
                            "d MMMM yyyy",
                            { locale: ru },
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">{getStatusBadge(task.status)}</div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-none">
            <CardContent className="p-6 text-center text-gray-500">
              {filter === "all"
                ? "Нет задач. Добавьте новую задачу, чтобы начать."
                : filter === "active"
                  ? "Нет активных задач."
                  : "Нет выполненных задач."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
