# React Query Integration - Документация

## 🎯 Что это?

**React Query** (TanStack Query) - библиотека для управления серверным состоянием (server state):
- 🔄 Автоматическое кеширование данных
- 🔁 Background синхронизация
- ✅ Встроенная обработка ошибок (интегрирована с Toast системой)
- ⚡ Automatический retry
- 🎯 Loading и error состояния

## 📂 Структура

```
src/
├── lib/
│   └── queryClient.ts        (конфигурация React Query)
└── hooks/
    ├── useDashboard.ts       (для dashboard)
    ├── useProjects.ts        (для проектов)
    └── useDatasets.ts        (для датасетов)
```

## 🚀 Использование

### 1️⃣ Простой запрос данных - useQuery

```tsx
import { useProjects } from "@/hooks";

export function ProjectsList() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {projects?.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

### 2️⃣ Создание/изменение данных - useMutation

```tsx
import { useCreateProject } from "@/hooks";

export function CreateProjectForm() {
  const createProject = useCreateProject();

  const handleSubmit = async (data) => {
    // Автоматически:
    // - Показывает loading
    // - На успех: уведомление + инвалидирует кеш
    // - На ошибку: красное уведомление
    await createProject.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* форма */}
      <button disabled={createProject.isPending}>
        {createProject.isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

## 📚 Доступные хуки

### Projects
```tsx
import { 
  useProjects,              // список проектов
  useProject,               // один проект по ID
  useCreateProject,         // создать проект
  useUpdateProject,         // обновить проект
  useDeleteProject,         // удалить проект
} from "@/hooks";
```

### Datasets
```tsx
import { 
  useDatasets,              // список датасетов
  useDataset,               // один датасет по ID
  useDatasetMedia,          // медиа файлы датасета
  useDatasetClasses,        // классы в датасете
  useDatasetSplits,         // сплиты (train/val/test)
  useDatasetEvents,         // история событий
  useCreateDataset,         // создать датасет
  useImportDataset,         // импортировать датасет
  useUpdateDataset,         // обновить датасет
  useDeleteDataset,         // удалить датасет
  useRescanDataset,         // пересканировать датасет
} from "@/hooks";
```

### Dashboard
```tsx
import { useDashboard } from "@/hooks";

// Базовое использование
const { data: dashboard, isLoading, error } = useDashboard();

// С фильтрами
const { data: dashboard } = useDashboard({
  projectId: 1,
  datasetId: 5,
});
```

## 🔄 Кеширование и синхронизация

### Как это работает?

1. **Первый запрос** → данные кешируются на 5 минут
2. **Второй запрос в течение 5 мин** → берёт из кеша (бесплатно!)
3. **После 5 минут** → данные становятся "stale" (устаревшими)
4. **Фокус на окно** → если данные стale, переф в фоне
5. **Mutation (создание/удаление)** → автоматически инвалидирует кеш

### Пример: Создал проект → автоматически обновляет список

```tsx
// 1. Загружаем список
const { data: projects } = useProjects();

// 2. Создаём проект
const createProject = useCreateProject();
await createProject.mutateAsync(newProject);

// 3. Автоматически:
// - queryClient.invalidateQueries(['projects'])
// - список перезагружается
// - список обновляется на экране
```

## 📊 Состояния

Каждый хук возвращает состояние:

```tsx
const {
  data,           // загруженные данные
  isLoading,      // первая загрузка (нет данных)
  isFetching,     // любая загрузка (есть старые данные)
  error,          // ошибка (Error объект)
  isError,        // есть ошибка?
  status,         // 'pending' | 'error' | 'success'
  refetch,        // ручная загрузка
} = useProjects();
```

## 🔧 Configuration

В `lib/queryClient.ts`:

```tsx
staleTime: 1000 * 60 * 5,     // 5 минут (кеш свежий)
gcTime: 1000 * 60 * 10,       // 10 минут (кеш удалится)
retry: 1,                      // 1 повтор при ошибке
refetchOnWindowFocus: false,   // не перефетчить при фокусе
```

## 💡 Примеры использования

### Пример 1: Список проектов с обновлением

```tsx
import { useProjects, useDeleteProject } from "@/hooks";

export function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const deleteProject = useDeleteProject();

  const handleDelete = async (id: number) => {
    await deleteProject.mutateAsync(id);
    // Кеш автоматически обновится!
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {projects?.map(p => (
        <div key={p.id}>
          <span>{p.name}</span>
          <button onClick={() => handleDelete(p.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Пример 2: Зависимые запросы

```tsx
import { useDashboard } from "@/hooks";

export function Dashboard() {
  const { data: dashboard, isLoading } = useDashboard({
    projectId: selectedProjectId,
    datasetId: selectedDatasetId,
  });

  // Автоматически перезагружает когда меняются projectId или datasetId
  // Кеширует разные версии отдельно
}
```

## ⚙️ Integration с Notifications

Все mutations автоматически показывают уведомления:

```tsx
const createProject = useCreateProject();
// На успех: green "Project created"
// На ошибку: red "Failed to create project" + сообщение ошибки
```

## 🎯 Когда использовать

### useQuery (для GET)
- Загрузить список проектов
- Загрузить датасет
- Загрузить детали
- **Никогда не изменяет данные на сервере**

### useMutation (для POST/PUT/DELETE)
- Создать проект
- Обновить датасет
- Удалить проект
- **Изменяет данные**

## 📝 Чек-лист для новых страниц

При создании новой страницы:

1. ✅ Используй `useXXX` хуки вместо прямых fetch вызовов
2. ✅ Обработай `isLoading` и `error` состояния
3. ✅ Для изменения данных используй `useMutation`
4. ✅ Notifications будут показаны автоматически

---

**Готово к использованию! 🎉**

Теперь все запросы автоматически:
- Кешируются ✅
- Обновляются при необходимости ✅
- Показывают уведомления ✅
- Имеют retry логику ✅
