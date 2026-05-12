# Toast/Notification System - Документация

## 🎯 Что это?

Глобальная система уведомлений для приложения. Позволяет показывать сообщения об ошибках, успехе, предупреждениях и информации пользователю из любого компонента.

## 📂 Файлы

```
src/
├── context/
│   ├── NotificationContext.tsx  (контекст для управления уведомлениями)
│   └── index.ts                 (экспорты)
├── hooks/
│   ├── useNotification.ts       (хук для использования в компонентах)
│   └── index.ts                 (экспорты)
└── components/
    └── ui/
        ├── toast.tsx            (компонент одного уведомления)
        ├── toast-container.tsx  (контейнер для всех уведомлений)
        └── demo/
            └── NotificationDemo.tsx (пример использования)
```

## 🚀 Использование

### 1. В любом компоненте используй хук:

```tsx
import { useNotification } from "@/hooks";

export function MyComponent() {
  const { success, error, warning, info } = useNotification();

  const handleCreateProject = async () => {
    try {
      await createProject(data);
      success("Project created!", "Your project has been created successfully.");
    } catch (err) {
      error("Failed to create project", err.message);
    }
  };

  return (
    <button onClick={handleCreateProject}>
      Create Project
    </button>
  );
}
```

### 2. Доступные методы:

```tsx
const { success, error, warning, info } = useNotification();

// Все методы имеют одинаковую сигнатуру:
// (title: string, message?: string, duration?: number)

success("Title", "Optional message", 3000);  // Длительность в мс
error("Oops!", "Something went wrong");
warning("Warning", "Be careful");
info("Info", "Just letting you know");
```

### 3. Параметры:

- **title** (string) - заголовок уведомления (обязательно)
- **message** (string, optional) - дополнительное сообщение
- **duration** (number, optional) - сколько мс показывать (default: 3000)
  - Если `duration = 0`, уведомление не будет автоматически закрыто

## 🎨 Примеры

### Success уведомление:
```tsx
success("Dataset imported", "5 new images added to your dataset");
```

### Error уведомление:
```tsx
error("Upload failed", "File size exceeds 100MB limit");
```

### Warning уведомление:
```tsx
warning("Deletion in progress", "This action cannot be undone", 5000);
```

### Info уведомление:
```tsx
info("Processing", "Your model is being trained...", 0); // Не закроется автоматически
```

## 📱 Где используется?

Уже интегрировано:
- ❌ Dashboard page - показывает ошибку при загрузке данных

Можно добавить:
- ✅ Projects page - при создании/удалении проекта
- ✅ Datasets page - при загрузке файлов
- ✅ Все API операции - успех/ошибка

## 🧪 Тестирование

В компоненте `NotificationDemo` можно увидеть все типы уведомлений. 

Добавить в любой компонент для тестирования:
```tsx
import { NotificationDemo } from "@/components/demo/NotificationDemo";

export function SomePage() {
  return (
    <>
      <NotificationDemo />
      {/* остальной контент */}
    </>
  );
}
```

## 🔧 Technicals

- **Context API** для глобального состояния
- **React Hooks** для удобства использования
- **Auto-dismiss** через setTimeout
- **Manual dismiss** кнопка (X) для каждого уведомления
- **Стек** - новые уведомления появляются внизу справа

## ♿ Доступность

- ✅ ARIA role="alert"
- ✅ Semantic HTML
- ✅ Keyboard closable (X button)
- ✅ Color + icon для типа (не только цвет)

## 📝 Интеграция с API

Рекомендуемый паттерн для API calls:

```tsx
const { success, error } = useNotification();

const handleAction = async () => {
  try {
    const result = await apiCall();
    success("Success!", "Operation completed.");
    // обновить UI
  } catch (err) {
    error("Failed", err.message);
    // optionally retry
  }
};
```

---

**Готово к использованию! 🎉**
