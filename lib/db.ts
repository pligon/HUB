import { openDB } from "idb"
import {
  supabase,
  syncWithSupabase,
  saveToSupabase,
  checkSupabaseAvailability,
  getSupabaseAvailability,
  type SupabaseProduct,
  type SupabaseTask,
  type SupabaseEmployee,
  type SupabaseDayPreference,
  type SupabaseScheduleEntry,
  type SupabaseSchoolFile,
} from "./supabase"

// Define database schemas
export interface SchoolFile {
  id: string
  name: string
  type: "folder" | "file" | "link"
  url?: string
  fileType?: string
  size?: number
  parentId: string | null
  createdAt: string // ISO string
}

export interface Product {
  id: string
  name: string
  weight: number
}

export interface Task {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  dueDate: string | null
  status: "pending" | "in-progress" | "completed"
  createdAt: string
}

export interface Employee {
  id: string
  name: string
  color: string
  workSchedule: "5/2" | "flexible" | "fixed" // Добавлен новый тип "fixed"
  minWorkDays: number
  maxWorkDays: number
  minOffDays: number
  maxOffDays: number
  fixedWorkDays?: number[] // Дни недели (0-6), когда сотрудник работает (для фиксированного графика)
  fixedOffDays?: number[] // Дни недели (0-6), когда у сотрудника выходной (для фиксированного графика)
  isAdmin: boolean
}

export interface DayPreference {
  id: string
  employeeId: string
  date: string
  dayOfWeek: number
  isPreferred: boolean
}

export interface ScheduleEntry {
  id: string
  date: string
  employeeId: string
  status: 0 | 1 | 11 // 0 = выходной, 1 = рабочий, 11 = сокращенный
}

// Initialize the database
export const initDB = async () => {
  // Проверяем доступность Supabase
  await checkSupabaseAvailability()

  return openDB("enterpriseHubDB", 1, {
    upgrade(db) {
      // Create stores for different data types
      if (!db.objectStoreNames.contains("schoolFiles")) {
        db.createObjectStore("schoolFiles", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("employees")) {
        db.createObjectStore("employees", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("dayPreferences")) {
        db.createObjectStore("dayPreferences", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("scheduleEntries")) {
        db.createObjectStore("scheduleEntries", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" })
      }
    },
  })
}

// Generic function to save items to a store
export const saveToStore = async (storeName, items) => {
  try {
    const db = await initDB()
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)

    // Clear existing records
    await store.clear()

    // Add all items
    for (const item of items) {
      await store.add(item)
    }

    await tx.done

    // Синхронизация с Supabase только если он доступен
    if (getSupabaseAvailability()) {
      if (storeName === "products") {
        await saveToSupabase<Product, SupabaseProduct>(items, "products", (product) => ({
          id: product.id,
          name: product.name,
          weight: product.weight,
        }))
      } else if (storeName === "tasks") {
        await saveToSupabase<Task, SupabaseTask>(items, "tasks", (task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          due_date: task.dueDate,
          status: task.status,
          created_at: task.createdAt,
        }))
      } else if (storeName === "employees") {
        await saveToSupabase<Employee, SupabaseEmployee>(items, "employees", (employee) => ({
          id: employee.id,
          name: employee.name,
          color: employee.color,
          work_schedule: employee.workSchedule,
          min_work_days: employee.minWorkDays,
          max_work_days: employee.maxWorkDays,
          min_off_days: employee.minOffDays,
          max_off_days: employee.maxOffDays,
          fixed_work_days: employee.fixedWorkDays,
          fixed_off_days: employee.fixedOffDays,
          is_admin: employee.isAdmin,
        }))
      } else if (storeName === "dayPreferences") {
        await saveToSupabase<DayPreference, SupabaseDayPreference>(items, "day_preferences", (pref) => ({
          id: pref.id,
          employee_id: pref.employeeId,
          date: pref.date,
          day_of_week: pref.dayOfWeek,
          is_preferred: pref.isPreferred,
        }))
      } else if (storeName === "scheduleEntries") {
        await saveToSupabase<ScheduleEntry, SupabaseScheduleEntry>(items, "schedule_entries", (entry) => ({
          id: entry.id,
          date: entry.date,
          employee_id: entry.employeeId,
          status: entry.status,
        }))
      } else if (storeName === "schoolFiles") {
        await saveToSupabase<SchoolFile, SupabaseSchoolFile>(items, "school_files", (file) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          url: file.url,
          file_type: file.fileType,
          size: file.size,
          parent_id: file.parentId,
          created_at: file.createdAt,
        }))
      }
    }

    return true
  } catch (error) {
    console.error(`Error saving to ${storeName}:`, error)
    return false
  }
}

// Generic function to load items from a store
export const loadFromStore = async (storeName) => {
  try {
    const db = await initDB()
    const items = await db.getAll(storeName)

    // Если локальных данных нет и Supabase доступен, пробуем загрузить с сервера
    if (items.length === 0 && getSupabaseAvailability()) {
      if (storeName === "products") {
        const { data } = await supabase.from("products").select("*")
        if (data && data.length > 0) {
          const products = data.map((item) => ({
            id: item.id,
            name: item.name,
            weight: item.weight,
          }))
          await saveToStore(storeName, products)
          return products
        }
      } else if (storeName === "tasks") {
        const { data } = await supabase.from("tasks").select("*")
        if (data && data.length > 0) {
          const tasks = data.map((item) => ({
            id: item.id,
            title: item.title,
            priority: item.priority,
            dueDate: item.due_date,
            status: item.status,
            createdAt: item.created_at,
          }))
          await saveToStore(storeName, tasks)
          return tasks
        }
      } else if (storeName === "employees") {
        const { data } = await supabase.from("employees").select("*")
        if (data && data.length > 0) {
          const employees = data.map((item) => ({
            id: item.id,
            name: item.name,
            color: item.color,
            workSchedule: item.work_schedule,
            minWorkDays: item.min_work_days,
            maxWorkDays: item.max_work_days,
            minOffDays: item.min_off_days,
            maxOffDays: item.max_off_days,
            fixedWorkDays: item.fixed_work_days,
            fixedOffDays: item.fixed_off_days,
            isAdmin: item.is_admin,
          }))
          await saveToStore(storeName, employees)
          return employees
        }
      } else if (storeName === "dayPreferences") {
        const { data } = await supabase.from("day_preferences").select("*")
        if (data && data.length > 0) {
          const preferences = data.map((item) => ({
            id: item.id,
            employeeId: item.employee_id,
            date: item.date,
            dayOfWeek: item.day_of_week,
            isPreferred: item.is_preferred,
          }))
          await saveToStore(storeName, preferences)
          return preferences
        }
      } else if (storeName === "scheduleEntries") {
        const { data } = await supabase.from("schedule_entries").select("*")
        if (data && data.length > 0) {
          const entries = data.map((item) => ({
            id: item.id,
            date: item.date,
            employeeId: item.employee_id,
            status: item.status,
          }))
          await saveToStore(storeName, entries)
          return entries
        }
      } else if (storeName === "schoolFiles") {
        const { data } = await supabase.from("school_files").select("*")
        if (data && data.length > 0) {
          const files = data.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
            fileType: item.file_type,
            size: item.size,
            parentId: item.parent_id,
            createdAt: item.created_at,
          }))
          await saveToStore(storeName, files)
          return files
        }
      }
    }

    return items
  } catch (error) {
    console.error(`Error loading from ${storeName}:`, error)
    return []
  }
}

// Add a single item to a store
export const addToStore = async (storeName, item) => {
  try {
    const db = await initDB()
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    await store.add(item)
    await tx.done
    return true
  } catch (error) {
    console.error(`Error adding to ${storeName}:`, error)
    return false
  }
}

// Update a single item in a store
export const updateInStore = async (storeName, item) => {
  try {
    const db = await initDB()
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    await store.put(item)
    await tx.done
    return true
  } catch (error) {
    console.error(`Error updating in ${storeName}:`, error)
    return false
  }
}

// Delete an item from a store
export const deleteFromStore = async (storeName, id) => {
  try {
    const db = await initDB()
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    await store.delete(id)
    await tx.done
    return true
  } catch (error) {
    console.error(`Error deleting from ${storeName}:`, error)
    return false
  }
}

// Добавьте новую функцию для синхронизации с Supabase
export const syncWithServer = async () => {
  // Если Supabase недоступен, пропускаем синхронизацию
  if (!getSupabaseAvailability()) {
    // Проверяем доступность еще раз
    const isAvailable = await checkSupabaseAvailability()
    if (!isAvailable) {
      return false
    }
  }

  try {
    // Синхронизация продуктов
    const products = await loadFromStore<Product>("products")
    const syncedProducts = await syncWithSupabase<Product, SupabaseProduct>(
      products,
      "products",
      (product) => ({
        id: product.id,
        name: product.name,
        weight: product.weight,
      }),
      (supaProduct) => ({
        id: supaProduct.id,
        name: supaProduct.name,
        weight: supaProduct.weight,
      }),
    )
    await saveToStore("products", syncedProducts)

    // Синхронизация задач
    const tasks = await loadFromStore<Task>("tasks")
    const syncedTasks = await syncWithSupabase<Task, SupabaseTask>(
      tasks,
      "tasks",
      (task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        due_date: task.dueDate,
        status: task.status,
        created_at: task.createdAt,
      }),
      (supaTask) => ({
        id: supaTask.id,
        title: supaTask.title,
        priority: supaTask.priority,
        dueDate: supaTask.due_date,
        status: supaTask.status,
        createdAt: supaTask.created_at,
      }),
    )
    await saveToStore("tasks", syncedTasks)

    // Синхронизация сотрудников
    const employees = await loadFromStore<Employee>("employees")
    const syncedEmployees = await syncWithSupabase<Employee, SupabaseEmployee>(
      employees,
      "employees",
      (employee) => ({
        id: employee.id,
        name: employee.name,
        color: employee.color,
        work_schedule: employee.workSchedule,
        min_work_days: employee.minWorkDays,
        max_work_days: employee.maxWorkDays,
        min_off_days: employee.minOffDays,
        max_off_days: employee.maxOffDays,
        fixed_work_days: employee.fixedWorkDays,
        fixed_off_days: employee.fixedOffDays,
        is_admin: employee.isAdmin,
      }),
      (supaEmployee) => ({
        id: supaEmployee.id,
        name: supaEmployee.name,
        color: supaEmployee.color,
        workSchedule: supaEmployee.work_schedule,
        minWorkDays: supaEmployee.min_work_days,
        maxWorkDays: supaEmployee.max_work_days,
        minOffDays: supaEmployee.min_off_days,
        maxOffDays: supaEmployee.max_off_days,
        fixedWorkDays: supaEmployee.fixed_work_days,
        fixedOffDays: supaEmployee.fixed_off_days,
        isAdmin: supaEmployee.is_admin,
      }),
    )
    await saveToStore("employees", syncedEmployees)

    // Синхронизация предпочтений дней
    const dayPreferences = await loadFromStore<DayPreference>("dayPreferences")
    const syncedDayPreferences = await syncWithSupabase<DayPreference, SupabaseDayPreference>(
      dayPreferences,
      "day_preferences",
      (pref) => ({
        id: pref.id,
        employee_id: pref.employeeId,
        date: pref.date,
        day_of_week: pref.dayOfWeek,
        is_preferred: pref.isPreferred,
      }),
      (supaPref) => ({
        id: supaPref.id,
        employeeId: supaPref.employee_id,
        date: supaPref.date,
        dayOfWeek: supaPref.day_of_week,
        isPreferred: supaPref.is_preferred,
      }),
    )
    await saveToStore("dayPreferences", syncedDayPreferences)

    // Синхронизация записей расписания
    const scheduleEntries = await loadFromStore<ScheduleEntry>("scheduleEntries")
    const syncedScheduleEntries = await syncWithSupabase<ScheduleEntry, SupabaseScheduleEntry>(
      scheduleEntries,
      "schedule_entries",
      (entry) => ({
        id: entry.id,
        date: entry.date,
        employee_id: entry.employeeId,
        status: entry.status,
      }),
      (supaEntry) => ({
        id: supaEntry.id,
        date: supaEntry.date,
        employeeId: supaEntry.employee_id,
        status: supaEntry.status,
      }),
    )
    await saveToStore("scheduleEntries", syncedScheduleEntries)

    // Синхронизация файлов школы
    const schoolFiles = await loadFromStore<SchoolFile>("schoolFiles")
    const syncedSchoolFiles = await syncWithSupabase<SchoolFile, SupabaseSchoolFile>(
      schoolFiles,
      "school_files",
      (file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        url: file.url,
        file_type: file.fileType,
        size: file.size,
        parent_id: file.parentId,
        created_at: file.createdAt,
      }),
      (supaFile) => ({
        id: supaFile.id,
        name: supaFile.name,
        type: supaFile.type,
        url: supaFile.url,
        fileType: supaFile.file_type,
        size: supaFile.size,
        parentId: supaFile.parent_id,
        createdAt: supaFile.created_at,
      }),
    )
    await saveToStore("schoolFiles", syncedSchoolFiles)

    return true
  } catch (error) {
    console.error("Error syncing with server:", error)
    return false
  }
}

// Функция для проверки, доступен ли Supabase
export const isSupabaseAvailable = (): boolean => {
  return getSupabaseAvailability()
}
