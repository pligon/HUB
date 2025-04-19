"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Clipboard, ArrowLeft, Trash2, LogIn, LogOut, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { type Product, loadFromStore, saveToStore } from "@/lib/db"

type OrderItem = {
  productId: string
  quantity: number
}

export default function BarOrderModule() {
  const [view, setView] = useState<"main" | "products" | "create-order" | "add-product" | "order-summary">("main")
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "Сливки", weight: 0.5 },
    { id: "2", name: "Молоко", weight: 1 },
    { id: "3", name: "Кофе", weight: 0.25 },
  ])
  const [newProduct, setNewProduct] = useState<{ name: string; weight: string }>({
    name: "",
    weight: "",
  })
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [quantityInput, setQuantityInput] = useState<{ [key: string]: number }>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [dbInitialized, setDbInitialized] = useState(false)
  const { toast } = useToast()

  // Load products from database on component mount
  useEffect(() => {
    const loadProducts = async () => {
      const loadedProducts = await loadFromStore<Product>("products")
      if (loadedProducts.length > 0) {
        setProducts(loadedProducts)
      } else {
        // Save default products to database if none exist
        await saveToStore("products", products)
      }
      setDbInitialized(true)
    }

    loadProducts()
  }, [])

  // Save products to database whenever they change
  useEffect(() => {
    if (dbInitialized && products.length > 0) {
      saveToStore("products", products)
    }
  }, [products, dbInitialized])

  const handleAdminLogin = () => {
    if (adminPassword === "2905") {
      setIsAdmin(true)
      setAdminPassword("")
      setIsAdminLoginOpen(false)
      toast({
        title: "Успешно",
        description: "Вы вошли как администратор",
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Неверный пароль",
        variant: "destructive",
      })
    }
  }

  const handleAdminLogout = () => {
    setIsAdmin(false)
    toast({
      title: "Выход",
      description: "Вы вышли из режима администратора",
    })
  }

  const handleAddProduct = async () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может добавлять продукты",
        variant: "destructive",
      })
      return
    }

    if (newProduct.name.trim() === "" || newProduct.weight.trim() === "") {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      })
      return
    }

    const weight = Number.parseFloat(newProduct.weight)
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: "Ошибка",
        description: "Вес должен быть положительным числом",
        variant: "destructive",
      })
      return
    }

    const newProductItem: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      weight,
    }

    const updatedProducts = [...products, newProductItem]
    setProducts(updatedProducts)
    setNewProduct({ name: "", weight: "" })
    toast({
      title: "Успешно",
      description: "Продукт добавлен",
    })
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может удалять продукты",
        variant: "destructive",
      })
      return
    }

    // Check if product is used in any order
    const isUsedInOrder = orderItems.some((item) => item.productId === productId)
    if (isUsedInOrder) {
      toast({
        title: "Ошибка",
        description: "Нельзя удалить продукт, который используется в заказе",
        variant: "destructive",
      })
      return
    }

    const updatedProducts = products.filter((product) => product.id !== productId)
    setProducts(updatedProducts)
    toast({
      title: "Успешно",
      description: "Продукт удален",
    })
  }

  const handleAddToOrder = (productId: string) => {
    const quantity = quantityInput[productId] || 0
    if (quantity <= 0) {
      toast({
        title: "Ошибка",
        description: "Количество должно быть больше нуля",
        variant: "destructive",
      })
      return
    }

    const existingItemIndex = orderItems.findIndex((item) => item.productId === productId)

    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems]
      updatedItems[existingItemIndex].quantity = quantity
      setOrderItems(updatedItems)
    } else {
      setOrderItems([...orderItems, { productId, quantity }])
    }

    setQuantityInput({ ...quantityInput, [productId]: 0 })
    toast({
      title: "Успешно",
      description: "Продукт добавлен в заказ",
    })
  }

  const handleClearOrder = () => {
    setOrderItems([])
    toast({
      title: "Очищено",
      description: "Список заказа очищен",
    })
  }

  const handleCreateOrder = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте продукты в заказ",
        variant: "destructive",
      })
      return
    }
    setView("order-summary")
  }

  const copyOrderToClipboard = () => {
    const date = new Date().toLocaleString("ru-RU")
    let orderText = `Заказ от ${date}\n\n`

    orderItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        const totalWeight = (product.weight * item.quantity).toFixed(2)
        orderText += `${product.name}: ${item.quantity} шт. (${totalWeight} ${totalWeight === "1" ? "л/кг" : "л/кг"})\n`
      }
    })

    navigator.clipboard.writeText(orderText)
    toast({
      title: "Скопировано",
      description: "Заказ скопирован в буфер обмена",
    })
  }

  const renderView = () => {
    switch (view) {
      case "main":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white/80 backdrop-blur-sm border-none shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3c6b53]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10" onClick={() => setView("products")}>
                <div className="flex items-center space-x-4">
                  <div className="font-medium text-lg">Продукты</div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white/80 backdrop-blur-sm border-none shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3c6b53]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10" onClick={() => setView("create-order")}>
                <div className="flex items-center space-x-4">
                  <div className="font-medium text-lg">Составить заказ</div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-xl transition-all cursor-pointer bg-white/80 backdrop-blur-sm border-none shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#3c6b53]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 relative z-10" onClick={() => setView("add-product")}>
                <div className="flex items-center space-x-4">
                  <div className="font-medium text-lg">Добавить продукт</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "products":
        return (
          <div>
            <div className="flex items-center mb-6 flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setView("main")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <h2 className="text-2xl font-bold ml-4 text-white drop-shadow-md">Продукты</h2>
              <div className="ml-auto">
                {isAdmin ? (
                  <Button variant="outline" onClick={handleAdminLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти
                  </Button>
                ) : (
                  <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <LogIn className="h-4 w-4 mr-2" />
                        Войти как администратор
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Вход для администратора</DialogTitle>
                        <DialogDescription>Введите пароль для доступа к функциям администратора</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin-password">Пароль</Label>
                          <Input
                            id="admin-password"
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdminLoginOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleAdminLogin}>Войти</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
              <CardContent className="p-6">
                {!isAdmin && (
                  <div className="mb-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                    <Lock className="h-4 w-4 inline mr-1" /> Для управления продуктами необходимо войти как
                    администратор
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Вес/Объем (л/кг)</TableHead>
                      {isAdmin && <TableHead>Действия</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.weight}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )

      case "create-order":
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={() => setView("main")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <h2 className="text-2xl font-bold ml-4 text-white drop-shadow-md">Составить заказ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Доступные продукты</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Вес/Объем</TableHead>
                        <TableHead>Количество</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.weight} л/кг</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={quantityInput[product.id] || ""}
                              onChange={(e) =>
                                setQuantityInput({
                                  ...quantityInput,
                                  [product.id]: Number.parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleAddToOrder(product.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Текущий заказ</CardTitle>
                </CardHeader>
                <CardContent>
                  {orderItems.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Название</TableHead>
                            <TableHead>Количество</TableHead>
                            <TableHead>Общий вес/объем</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item) => {
                            const product = products.find((p) => p.id === item.productId)
                            return (
                              <TableRow key={item.productId}>
                                <TableCell>{product?.name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>{product ? (product.weight * item.quantity).toFixed(2) : 0} л/кг</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button
                          className="w-full bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
                          onClick={handleCreateOrder}
                        >
                          Сформировать заказ
                        </Button>
                        <Button className="w-full" variant="outline" onClick={handleClearOrder}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Очистить заказ
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500">Добавьте продукты в заказ</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "add-product":
        return (
          <div>
            <div className="flex items-center mb-6 flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setView("main")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <h2 className="text-2xl font-bold ml-4 text-white drop-shadow-md">Добавить продукт</h2>
              <div className="ml-auto">
                {isAdmin ? (
                  <Button variant="outline" onClick={handleAdminLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Выйти
                  </Button>
                ) : (
                  <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <LogIn className="h-4 w-4 mr-2" />
                        Войти как администратор
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Вход для администратора</DialogTitle>
                        <DialogDescription>Введите пароль для доступа к функциям администратора</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="admin-password">Пароль</Label>
                          <Input
                            id="admin-password"
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdminLoginOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleAdminLogin}>Войти</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Новый продукт</CardTitle>
                  <CardDescription>Добавьте новый продукт в каталог</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isAdmin ? (
                    <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-md mb-4">
                      <Lock className="h-4 w-4 inline mr-1" /> Для добавления продуктов необходимо войти как
                      администратор
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="product-name">Название</Label>
                        <Input
                          id="product-name"
                          value={newProduct.name}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="product-weight">Вес/Объем (л/кг)</Label>
                        <Input
                          id="product-weight"
                          type="number"
                          step="0.01"
                          value={newProduct.weight}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              weight: e.target.value,
                            })
                          }
                        />
                      </div>
                      <Button
                        onClick={handleAddProduct}
                        className="bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
                      >
                        Добавить
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
                <CardHeader>
                  <CardTitle>Существующие продукты</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Вес/Объем (л/кг)</TableHead>
                        {isAdmin && <TableHead>Действия</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.weight}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case "order-summary":
        return (
          <div>
            <div className="flex items-center mb-6">
              <Button variant="ghost" onClick={() => setView("create-order")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <h2 className="text-2xl font-bold ml-4 text-white drop-shadow-md">Сводка заказа</h2>
            </div>
            <Card className="bg-white/80 backdrop-blur-sm border-none shadow-md">
              <CardHeader>
                <CardTitle>Заказ от {new Date().toLocaleString("ru-RU")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Общий вес/объем</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => {
                      const product = products.find((p) => p.id === item.productId)
                      return (
                        <TableRow key={item.productId}>
                          <TableCell>{product?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{product ? (product.weight * item.quantity).toFixed(2) : 0} л/кг</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <Button
                  className="mt-6 bg-gradient-to-r from-[#3c6b53] to-[#2a5a41] hover:from-[#2a5a41] hover:to-[#1e4d36] text-white shadow-md"
                  onClick={copyOrderToClipboard}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Копировать заказ
                </Button>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 module-container">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">Заказ бар</h1>
        {view === "main" && (
          <div>
            {isAdmin ? (
              <Button variant="outline" onClick={handleAdminLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            ) : (
              <Dialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <LogIn className="h-4 w-4 mr-2" />
                    Войти как администратор
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Вход для администратора</DialogTitle>
                    <DialogDescription>Введите пароль для доступа к функциям администратора</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Пароль</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAdminLoginOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleAdminLogin}>Войти</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
      {renderView()}
    </div>
  )
}
