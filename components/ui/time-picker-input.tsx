"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface TimePickerInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TimePickerInput({ value, onChange, disabled = false }: TimePickerInputProps) {
  // Разбиваем начальное значение на часы и минуты
  const initialParts = value ? value.split(":") : ["00", "00"]
  const initialHours = initialParts[0] || "00"
  const initialMinutes = initialParts[1] || "00"

  // Инициализируем состояние с гарантированными значениями
  const [hours, setHours] = useState<string>(initialHours)
  const [minutes, setMinutes] = useState<string>(initialMinutes)

  // Обновляем состояние при изменении входного значения
  useEffect(() => {
    if (value) {
      const parts = value.split(":")
      if (parts.length === 2) {
        setHours(parts[0] || "00")
        setMinutes(parts[1] || "00")
      }
    }
  }, [value])

  // Обработчик изменения часов
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = e.target.value

    // Проверка на числовое значение
    if (!/^\d*$/.test(newHours)) return

    // Ограничение длины до 2 символов
    if (newHours.length > 2) newHours = newHours.slice(0, 2)

    // Ограничение значения от 0 до 23
    const numericValue = Number(newHours)
    if (numericValue > 23) newHours = "23"

    setHours(newHours)
    onChange(`${newHours.padStart(2, "0")}:${minutes}`)
  }

  // Обработчик изменения минут
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = e.target.value

    // Проверка на числовое значение
    if (!/^\d*$/.test(newMinutes)) return

    // Ограничение длины до 2 символов
    if (newMinutes.length > 2) newMinutes = newMinutes.slice(0, 2)

    // Ограничение значения от 0 до 59
    const numericValue = Number(newMinutes)
    if (numericValue > 59) newMinutes = "59"

    setMinutes(newMinutes)
    onChange(`${hours}:${newMinutes.padStart(2, "0")}`)
  }

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="text"
        value={hours}
        onChange={handleHoursChange}
        className="w-12 text-center"
        placeholder="HH"
        disabled={disabled}
      />
      <span>:</span>
      <Input
        type="text"
        value={minutes}
        onChange={handleMinutesChange}
        className="w-12 text-center"
        placeholder="MM"
        disabled={disabled}
      />
    </div>
  )
}
