# Modal System - Документация

## 🎯 Что это?

Система для управления модальными окнами (диалогами) в приложении:
- 🪟 Красивые диалоги с backdrop
- 🔄 Автоматическое управление состоянием
- 🎣 Простой hook для открытия/закрытия
- 🔗 Интеграция с React Query и Notifications
- 📱 Адаптивный дизайн

## 📂 Структура

```
src/
├── context/
│   └── ModalContext.tsx           (контекст для управления модалями)
├── hooks/
│   └── useModal.ts                (хук для использования)
├── components/
│   ├── ui/
│   │   ├── dialog.tsx             (базовый Dialog компонент)
│   │   └── modal-renderer.tsx     (рендерер всех открытых модалей)
│   └── modals/
│       ├── ProjectModals.tsx      (Create/Edit Project)
│       ├── DatasetModals.tsx      (Create/Edit Dataset)
│       └── DeleteConfirmModal.tsx (подтверждение удаления)
```

## 🚀 Использование

### 1️⃣ Открыть модальное окно

```tsx
import { useModal } from "@/hooks";
import { CreateProjectModal } from "@/components/modals/ProjectModals";

export function MyPage() {
  const { openModal } = useModal();

  const handleClick = () => {
    openModal({
      id: `create-project-${Date.now()}`, // уникальный ID
      title: "Create New Project",          // заголовок диалога
      component: CreateProjectModal,        // компонент для отображения
      props: {},                            // пропсы компоненту
    });
  };

  return <button onClick={handleClick}>Create</button>;
}
```

### 2️⃣ Компонент в модале получает props

```tsx
interface CreateProjectModalProps {
  onClose: () => void;  // функция для закрытия
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  return (
    <form onSubmit={() => {
      // Логика сохранения
      onClose(); // Закрыть модаль
    }}>
      {/* форма */}
    </form>
  );
}
```

## 📚 Доступные модали

### Projects

```tsx
// Создание проекта
import { CreateProjectModal } from "@/components/modals/ProjectModals";

openModal({
  id: "create-project",
  title: "Create New Project",
  component: CreateProjectModal,
});

// Редактирование проекта
import { EditProjectModal } from "@/components/modals/ProjectModals";

openModal({
  id: `edit-project-${project.id}`,
  title: "Edit Project",
  component: EditProjectModal,
  props: { project },
});
```

### Datasets

```tsx
// Создание датасета
import { CreateDatasetModal } from "@/components/modals/DatasetModals";

openModal({
  id: "create-dataset",
  title: "Create New Dataset",
  component: CreateDatasetModal,
  props: { projectId: 1 },
});

// Редактирование датасета
import { EditDatasetModal } from "@/components/modals/DatasetModals";

openModal({
  id: `edit-dataset-${dataset.id}`,
  title: "Edit Dataset",
  component: EditDatasetModal,
  props: { dataset },
});
```

### Удаление

```tsx
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { useDeleteProject } from "@/hooks";

const deleteProject = useDeleteProject();

openModal({
  id: `delete-project-${id}`,
  title: "Delete Project",
  component: DeleteConfirmModal,
  props: {
    title: "Delete Project?",
    message: "Are you sure?",
    itemName: project.name,
    isLoading: deleteProject.isPending,
    onConfirm: () => deleteProject.mutateAsync(id),
  },
});
```

## 🎨 Создание своей модали

```tsx
interface MyModalProps {
  data?: any;
  onClose: () => void;
}

export function MyModal({ data, onClose }: MyModalProps) {
  return (
    <div className="space-y-4">
      <h3>My Modal Content</h3>
      <p>{data?.name}</p>
      
      <button onClick={onClose}>Close</button>
    </div>
  );
}

// Использование:
openModal({
  id: "my-modal",
  title: "My Modal",
  component: MyModal,
  props: { data: { name: "test" } },
});
```

## 🔄 Lifecycle

1. **Открыть**: `openModal({ ... })` → добавить в стек
2. **Отобразить**: `ModalRenderer` показывает модаль
3. **Закрыть**: 
   - Нажать X кнопку
   - Клик на backdrop
   - Вызвать `onClose()`
4. **Удалить**: модаль удаляется из стека

## 🧩 Интеграция с React Query

Все встроенные модали автоматически работают с React Query:

```tsx
const createProject = useCreateProject();

// В CreateProjectModal:
await createProject.mutateAsync(formData);
// - Показывает loading
// - На успех: зелёное уведомление + закрывает модаль
// - На ошибку: красное уведомление + остаётся открыта
```

## 🎯 Best Practices

### ✅ Делай так:
```tsx
// Использовать для CRUD операций
openModal({
  id: `create-${Date.now()}`, // уникальный ID
  title: "Create",
  component: CreateModal,
});
```

### ❌ Не делай так:
```tsx
// Избегай статических ID (только для одной модали)
openModal({
  id: "create", // плохо, может быть несколько
  title: "Create",
  component: CreateModal,
});
```

## 📝 Чек-лист для новых модалей

При создании новой модали:

1. ✅ Создай компонент с props `onClose`
2. ✅ Используй React Query mutation если нужно
3. ✅ Вызови `onClose()` после успешного действия
4. ✅ Добавь в `components/modals/`
5. ✅ Экспортируй из файла
6. ✅ Используй через `openModal()`

## 🎨 Стилизация

Dialog компонент поддерживает размеры:

```tsx
<Dialog size="sm">  {/* 384px max */}
<Dialog size="md">  {/* 448px max */}
<Dialog size="lg">  {/* 512px max */}
```

Используется в ModalRenderer автоматически (md по умолчанию).

## ⌨️ Клавиатура

- **Esc** → закрыть модаль
- **Enter** → отправить форму (если есть button type="submit")
- **Tab** → навигация по элементам

---

**Готово к использованию! 🎉**

Система полностью интегрирована с:
- ✅ React Query (notifications, loading states)
- ✅ Notification System (success/error messages)
- ✅ Dialog API (backdrop, keyboard navigation)
