"use client"

import React, { useState, useEffect } from "react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb"
import {
  Folder,
  File,
  LinkIcon,
  MoreVertical,
  Upload,
  ChevronRight,
  Home,
  Trash,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  FileIcon as FilePdf,
  Eye,
  Lock,
  LogIn,
  LogOut,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { type SchoolFile, loadFromStore, saveToStore } from "@/lib/db"

type FileType = "folder" | "file" | "link"

// Modify the FileItem type to make fileData optional and add a size property
type FileItem = {
  id: string
  name: string
  type: FileType
  url?: string
  fileType?: string
  fileData?: string
  size?: number
  parentId: string | null
  createdAt: Date
}

export default function SchoolModule() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Главная" }])
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [newLink, setNewLink] = useState({ name: "", url: "" })
  const [dbInitialized, setDbInitialized] = useState(false)
  const { toast } = useToast()

  // Initialize database and load files
  useEffect(() => {
    const loadFiles = async () => {
      const loadedFiles = await loadFromStore<SchoolFile>("schoolFiles")

      if (loadedFiles.length > 0) {
        // Convert string dates back to Date objects
        const filesWithDates = loadedFiles.map((file) => ({
          ...file,
          createdAt: new Date(file.createdAt),
        }))
        setFiles(filesWithDates as FileItem[])
      }

      setDbInitialized(true)
    }

    loadFiles()
  }, [])

  // Save files to database whenever they change
  useEffect(() => {
    if (dbInitialized && files.length > 0) {
      // Create a version of files without the large fileData for storage
      const filesForStorage = files.map((file) => ({
        ...file,
        // Remove fileData from storage to save space
        fileData: undefined,
        createdAt: file.createdAt.toISOString(),
      }))

      saveToStore("schoolFiles", filesForStorage)
    }
  }, [files, dbInitialized])

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

  const handleCreateFolder = () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может создавать папки",
        variant: "destructive",
      })
      return
    }

    if (newFolderName.trim() === "") {
      toast({
        title: "Ошибка",
        description: "Введите название папки",
        variant: "destructive",
      })
      return
    }

    const folder: FileItem = {
      id: Date.now().toString(),
      name: newFolderName,
      type: "folder",
      parentId: currentFolder,
      createdAt: new Date(),
    }

    const updatedFiles = [...files, folder]
    setFiles(updatedFiles)
    setNewFolderName("")
    setIsCreateFolderOpen(false)
    toast({
      title: "Успешно",
      description: "Папка создана",
    })
  }

  const handleAddLink = () => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может добавлять ссылки",
        variant: "destructive",
      })
      return
    }

    if (newLink.name.trim() === "" || newLink.url.trim() === "") {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      })
      return
    }

    // Basic URL validation
    try {
      new URL(newLink.url)
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Введите корректный URL",
        variant: "destructive",
      })
      return
    }

    const link: FileItem = {
      id: Date.now().toString(),
      name: newLink.name,
      type: "link",
      url: newLink.url,
      parentId: currentFolder,
      createdAt: new Date(),
    }

    const updatedFiles = [...files, link]
    setFiles(updatedFiles)
    setNewLink({ name: "", url: "" })
    setIsAddLinkOpen(false)
    toast({
      title: "Успешно",
      description: "Ссылка добавлена",
    })
  }

  const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase()
  }

  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename)

    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return <ImageIcon className="h-6 w-6 text-purple-500" />
    } else if (["pdf"].includes(ext)) {
      return <FilePdf className="h-6 w-6 text-red-500" />
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />
    } else if (["doc", "docx", "txt", "rtf"].includes(ext)) {
      return <FileText className="h-6 w-6 text-blue-500" />
    } else {
      return <File className="h-6 w-6 text-gray-500" />
    }
  }

  // Modify the handleFileUpload function to handle file size limits
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может загружать файлы",
        variant: "destructive",
      })
      e.target.value = ""
      return
    }

    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const newFiles: FileItem[] = []
    const filePromises: Promise<FileItem>[] = []
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit for preview

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]

      // Always create a basic file entry with metadata
      const fileItem: FileItem = {
        id: Date.now().toString() + i,
        name: file.name,
        type: "file",
        fileType: file.type,
        size: file.size,
        parentId: currentFolder,
        createdAt: new Date(),
      }

      // Only read file data for preview if it's an image or PDF and under size limit
      if ((file.type.startsWith("image/") || file.type === "application/pdf") && file.size <= MAX_FILE_SIZE) {
        const filePromise = new Promise<FileItem>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve({
              ...fileItem,
              fileData: event.target?.result as string,
            })
          }
          reader.readAsDataURL(file)
        })
        filePromises.push(filePromise)
      } else {
        // For other file types or large files, just use the metadata
        newFiles.push(fileItem)
      }
    }

    Promise.all(filePromises).then((resolvedFiles) => {
      const updatedFiles = [...files, ...resolvedFiles, ...newFiles]
      setFiles(updatedFiles)
      toast({
        title: "Успешно",
        description: `Загружено файлов: ${resolvedFiles.length + newFiles.length}`,
      })
    })
  }

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId)

    // Update breadcrumbs
    const folderIndex = breadcrumbs.findIndex((b) => b.id === folderId)

    if (folderIndex >= 0) {
      // If folder is already in breadcrumbs, truncate to that point
      setBreadcrumbs(breadcrumbs.slice(0, folderIndex + 1))
    } else {
      // Add new folder to breadcrumbs
      setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }])
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    const breadcrumb = breadcrumbs[index]
    setCurrentFolder(breadcrumb.id)
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
  }

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handlePreviewFile = (file: FileItem) => {
    setPreviewFile(file)
    setIsPreviewOpen(true)
  }

  const handleDeleteItem = (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Доступ запрещен",
        description: "Только администратор может удалять элементы",
        variant: "destructive",
      })
      return
    }

    // Check if it's a folder and has children
    const isFolder = files.find((file) => file.id === id)?.type === "folder"
    if (isFolder) {
      const hasChildren = files.some((file) => file.parentId === id)
      if (hasChildren) {
        toast({
          title: "Ошибка",
          description: "Нельзя удалить папку, содержащую файлы",
          variant: "destructive",
        })
        return
      }
    }

    const updatedFiles = files.filter((file) => file.id !== id)
    setFiles(updatedFiles)
    toast({
      title: "Успешно",
      description: "Элемент удален",
    })
  }

  // Modify the renderFilePreview function to handle missing fileData
  const renderFilePreview = (file: FileItem) => {
    if (!file.fileType) return <div className="text-center p-4">Предпросмотр недоступен</div>

    if (!file.fileData) {
      return (
        <div className="text-center p-8">
          <div className="flex justify-center mb-4">{getFileIcon(file.name)}</div>
          <p className="mb-4">
            {file.size && file.size > 5 * 1024 * 1024
              ? "Файл слишком большой для предпросмотра"
              : "Предпросмотр недоступен для этого файла"}
          </p>
          <p className="text-sm text-gray-500 mb-4">Размер файла: {formatFileSize(file.size || 0)}</p>
        </div>
      )
    }

    if (file.fileType.startsWith("image/") && file.fileData) {
      return (
        <div className="flex justify-center">
          <img
            src={file.fileData || "/placeholder.svg"}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      )
    } else if (file.fileType === "application/pdf" && file.fileData) {
      return (
        <div className="h-[70vh]">
          <iframe src={file.fileData} className="w-full h-full" title={file.name}></iframe>
        </div>
      )
    } else {
      return (
        <div className="text-center p-8">
          <div className="flex justify-center mb-4">{getFileIcon(file.name)}</div>
          <p className="mb-4">Предпросмотр для этого типа файла недоступен</p>
          <p className="text-sm text-gray-500 mb-4">Размер файла: {formatFileSize(file.size || 0)}</p>
        </div>
      )
    }
  }

  // Add a helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const currentFiles = files.filter((file) => file.parentId === currentFolder)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">Школа</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Folder className="h-4 w-4 mr-2" />
                    Новая папка
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создать папку</DialogTitle>
                    <DialogDescription>Введите название для новой папки</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="folder-name">Название папки</Label>
                      <Input
                        id="folder-name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleCreateFolder}>Создать</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Добавить ссылку
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить ссылку</DialogTitle>
                    <DialogDescription>Добавьте ссылку на внешний ресурс</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="link-name">Название</Label>
                      <Input
                        id="link-name"
                        value={newLink.name}
                        onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddLinkOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={handleAddLink}>Добавить</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="relative">
                <Input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                  multiple
                />
                <Button variant="outline" className="pointer-events-none">
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить файл
                </Button>
              </div>

              <Button variant="outline" onClick={handleAdminLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </>
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
              <Lock className="h-4 w-4 inline mr-1" /> Для создания папок и загрузки файлов необходимо войти как
              администратор
            </div>
          )}
          <div className="mb-4">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => handleBreadcrumbClick(index)} className="cursor-pointer">
                        {index === 0 ? <Home className="h-4 w-4 mr-1" /> : null}
                        {breadcrumb.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <div className="mx-2 text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFiles.length > 0 ? (
              currentFiles.map((file) => (
                <Card key={file.id} className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center space-x-3 flex-1"
                        onClick={() => {
                          if (file.type === "folder") {
                            handleOpenFolder(file.id, file.name)
                          } else if (file.type === "link" && file.url) {
                            handleOpenLink(file.url)
                          } else if (file.type === "file") {
                            handlePreviewFile(file)
                          }
                        }}
                      >
                        {file.type === "folder" ? (
                          <Folder className="h-6 w-6 text-yellow-500" />
                        ) : file.type === "link" ? (
                          <LinkIcon className="h-6 w-6 text-blue-500" />
                        ) : (
                          getFileIcon(file.name)
                        )}
                        <div className="truncate">{file.name}</div>
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.type === "file" && (
                              <DropdownMenuItem onClick={() => handlePreviewFile(file)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Просмотр
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteItem(file.id)} className="text-red-600">
                              <Trash className="h-4 w-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-6 text-gray-500">
                {isAdmin ? "Эта папка пуста. Создайте новую папку или загрузите файлы." : "Эта папка пуста."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && renderFilePreview(previewFile)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
