"use client"

import { useState, useEffect } from "react"

export const useScroll = () => {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      // Устанавливаем CSS-переменную для использования в стилях
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`)
    }

    // Инициализация при монтировании
    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return scrollY
}
