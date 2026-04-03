import { createHash } from "node:crypto";

import { compileMarkdown } from "@/lib/markdown";
import { resolvePublicAssetUrl } from "@/lib/storage";
import type {
  ModuleDetailView,
  ModuleFileType,
  ModuleLevel,
  ModuleSeedInput,
  ModuleSummaryView
} from "@/lib/types";
import { buildSectionAnchor } from "@/lib/utils";

type Blueprint = {
  slug: string;
  title: string;
  summary: string;
  level: ModuleLevel;
  tags: [string, string, string];
  concepts: [string, string, string];
  lang: string;
  snippet: string;
};

const blueprints: Blueprint[] = [
  { slug: "intro-to-programming", title: "Как мыслит программа", summary: "Стартовый модуль о том, как разложить задачу на точные шаги для компьютера.", level: "base", tags: ["старт", "алгоритмы", "мышление"], concepts: ["вход", "обработка", "выход"], lang: "text", snippet: "Вход: имя\nОбработка: добавить приветствие\nВыход: готовая строка" },
  { slug: "variables-and-types", title: "Переменные и типы данных", summary: "Понимаем, как хранить числа, строки и флаги без путаницы в названиях и форматах.", level: "base", tags: ["переменные", "типы", "основы"], concepts: ["имя", "тип", "значение"], lang: "ts", snippet: "const studentName = 'Лена';\nconst lessonsDone = 12;\nconst hasAccess = true;" },
  { slug: "expressions-and-operators", title: "Операторы и выражения", summary: "Учимся собирать вычисления и проверки так, чтобы логика была читаемой.", level: "base", tags: ["операторы", "выражения", "логика"], concepts: ["арифметика", "сравнение", "связки"], lang: "ts", snippet: "const progress = Math.round((18 / 24) * 100);\nconst isReady = progress >= 75 && progress < 100;" },
  { slug: "conditionals", title: "Условные конструкции", summary: "Разбираем ветвление программы и порядок проверки условий.", level: "base", tags: ["условия", "ветвление", "if"], concepts: ["ветка true", "ветка false", "приоритет"], lang: "ts", snippet: "if (score >= 90) {\n  return 'Отлично';\n}\nreturn 'Нужно еще потренироваться';" },
  { slug: "loops", title: "Циклы и повторяющиеся действия", summary: "Обрабатываем однотипные элементы без копирования одинаковых строк кода.", level: "base", tags: ["циклы", "повторение", "for"], concepts: ["счетчик", "условие", "остановка"], lang: "ts", snippet: "for (const topic of ['переменные', 'циклы', 'функции']) {\n  console.log(topic);\n}" },
  { slug: "functions", title: "Функции и повторно используемая логика", summary: "Выносим действия в компактные блоки с параметрами и понятным результатом.", level: "base", tags: ["функции", "параметры", "декомпозиция"], concepts: ["вход", "результат", "одна ответственность"], lang: "ts", snippet: "function formatScore(score: number) {\n  return `${score}%`;\n}" },
  { slug: "arrays-and-lists", title: "Массивы и списки", summary: "Показываем, как хранить набор данных и безопасно обращаться к элементам.", level: "base", tags: ["массивы", "списки", "данные"], concepts: ["индекс", "перебор", "длина"], lang: "ts", snippet: "const modules = ['Переменные', 'Условия', 'Циклы'];\nconsole.log(modules[0], modules.length);" },
  { slug: "strings", title: "Строки и работа с текстом", summary: "Разбираем форматирование, очистку и поиск по текстовым данным.", level: "base", tags: ["строки", "текст", "форматирование"], concepts: ["trim", "includes", "шаблоны"], lang: "ts", snippet: "const title = '  Функции  ';\nconst normalized = title.trim().toUpperCase();" },
  { slug: "dictionaries-and-maps", title: "Словари, объекты и быстрый доступ по ключу", summary: "Изучаем хранение данных по ключу и быстрый адресный доступ.", level: "core", tags: ["словари", "объекты", "карты"], concepts: ["ключ", "значение", "доступ"], lang: "ts", snippet: "const progressBySlug = { variables: 100, loops: 80 };\nconsole.log(progressBySlug.loops);" },
  { slug: "sets-and-uniqueness", title: "Множества и уникальные значения", summary: "Удаляем дубли и ускоряем проверку наличия элементов.", level: "core", tags: ["множества", "уникальность", "данные"], concepts: ["уникальность", "has", "очистка"], lang: "ts", snippet: "const tags = ['js', 'react', 'js'];\nconst uniqueTags = [...new Set(tags)];" },
  { slug: "recursion", title: "Рекурсия без мистики", summary: "Понимаем базовый случай и шаг рекурсии через простые повторяющиеся задачи.", level: "core", tags: ["рекурсия", "функции", "мышление"], concepts: ["база", "шаг", "глубина"], lang: "ts", snippet: "function factorial(n: number): number {\n  return n <= 1 ? 1 : n * factorial(n - 1);\n}" },
  { slug: "debugging", title: "Отладка и поиск ошибок", summary: "Строим системный процесс поиска бага вместо случайных правок кода.", level: "core", tags: ["отладка", "ошибки", "debug"], concepts: ["воспроизведение", "локализация", "гипотеза"], lang: "ts", snippet: "const total = ['100', '250'].reduce((sum, item) => sum + Number(item), 0);" },
  { slug: "algorithmic-thinking", title: "Алгоритмическое мышление", summary: "Учимся описывать шаги решения до того, как пишем код.", level: "core", tags: ["алгоритмы", "мышление", "декомпозиция"], concepts: ["шаги", "порядок", "граничные случаи"], lang: "text", snippet: "1. Получить данные\n2. Проверить формат\n3. Обработать\n4. Сохранить результат" },
  { slug: "complexity-analysis", title: "Сложность алгоритмов", summary: "Объясняем Big O и цену выбора структуры данных на больших объемах.", level: "core", tags: ["сложность", "big-o", "оптимизация"], concepts: ["время", "память", "рост"], lang: "ts", snippet: "ids.includes('c');\nnew Set(ids).has('c');" },
  { slug: "sorting-basics", title: "Сортировки на практике", summary: "Сортируем данные по правилам продукта и не ломаем исходные коллекции.", level: "core", tags: ["сортировка", "данные", "порядок"], concepts: ["ключ", "направление", "стоимость"], lang: "ts", snippet: "modules.sort((a, b) => a.order - b.order);" },
  { slug: "searching-techniques", title: "Поиск в данных", summary: "Сравниваем линейный поиск, индекс и быстрый доступ по ключу.", level: "core", tags: ["поиск", "данные", "индексы"], concepts: ["критерий", "индекс", "скорость"], lang: "ts", snippet: "const module = modules.find((item) => item.slug === targetSlug);" },
  { slug: "stack-and-queue", title: "Стек и очередь", summary: "Разбираем две базовые структуры данных и сценарии их применения.", level: "core", tags: ["стек", "очередь", "структуры"], concepts: ["LIFO", "FIFO", "порядок"], lang: "ts", snippet: "history.push('save');\nqueue.shift();" },
  { slug: "trees-basics", title: "Деревья и иерархии", summary: "Показываем иерархические структуры на примере меню и каталога сайта.", level: "advanced", tags: ["деревья", "иерархия", "структуры"], concepts: ["узел", "родитель", "обход"], lang: "json", snippet: "{\n  \"title\": \"Курс\",\n  \"children\": [{ \"title\": \"Основы\" }]\n}" },
  { slug: "graphs-basics", title: "Графы и связи между сущностями", summary: "Смотрим на зависимости модулей и маршруты как на граф.", level: "advanced", tags: ["графы", "связи", "алгоритмы"], concepts: ["вершины", "ребра", "маршрут"], lang: "ts", snippet: "const graph = { variables: ['conditionals'], conditionals: ['loops'] };" },
  { slug: "dynamic-programming", title: "Динамическое программирование", summary: "Ускоряем решения через запоминание повторяющихся подзадач.", level: "advanced", tags: ["dp", "оптимизация", "алгоритмы"], concepts: ["подзадачи", "кэш", "таблица"], lang: "ts", snippet: "const dp = [1, 1];\nfor (let i = 2; i <= n; i += 1) dp[i] = dp[i - 1] + dp[i - 2];" },
  { slug: "file-io", title: "Файлы и ввод-вывод", summary: "Читаем и записываем внешние данные безопасно и предсказуемо.", level: "core", tags: ["файлы", "io", "данные"], concepts: ["чтение", "запись", "ошибки"], lang: "ts", snippet: "const content = await readFile('tasks.txt', 'utf8');" },
  { slug: "csv-txt-pdf-data", title: "CSV, TXT и PDF как учебные артефакты", summary: "Разделяем метаданные файлов и их тяжелое содержимое ради быстрой загрузки.", level: "core", tags: ["csv", "txt", "pdf"], concepts: ["метаданные", "preview", "cdn"], lang: "json", snippet: "{ \"fileType\": \"pdf\", \"publicUrl\": \"https://cdn.example.com/handout.pdf\" }" },
  { slug: "oop-basics", title: "ООП без перегруза", summary: "Используем классы и объекты там, где они действительно упрощают модель.", level: "core", tags: ["ооп", "классы", "объекты"], concepts: ["состояние", "методы", "инкапсуляция"], lang: "ts", snippet: "class CourseModule {\n  constructor(public title: string) {}\n}" },
  { slug: "composition-vs-inheritance", title: "Композиция против наследования", summary: "Собираем поведение гибко, не запирая код в глубокой иерархии.", level: "advanced", tags: ["композиция", "наследование", "архитектура"], concepts: ["переиспользование", "слабая связность", "расширяемость"], lang: "ts", snippet: "const withSeo = (module: { title: string }) => ({ ...module, seoTitle: module.title });" },
  { slug: "error-handling", title: "Исключения и контроль ошибок", summary: "Ловим ошибки, не скрываем контекст и держим UX в стабильном состоянии.", level: "core", tags: ["ошибки", "исключения", "надёжность"], concepts: ["try/catch", "сообщение", "контекст"], lang: "ts", snippet: "try {\n  JSON.parse(raw);\n} catch (error) {\n  console.error(error);\n}" },
  { slug: "testing-basics", title: "Тестирование ключевой логики", summary: "Покрываем тестами самые рискованные и ценные части кода.", level: "core", tags: ["тестирование", "качество", "регрессия"], concepts: ["сценарий", "ожидание", "проверка"], lang: "ts", snippet: "expect(sanitizeComment('<script>x</script>ok')).toBe('ok');" },
  { slug: "git-workflow", title: "Git и рабочий процесс разработчика", summary: "Фиксируем изменения осмысленными коммитами и держим историю чистой.", level: "core", tags: ["git", "workflow", "команда"], concepts: ["commit", "branch", "diff"], lang: "bash", snippet: "git checkout -b feat/module-comments\ngit commit -m \"Add comments api\"" },
  { slug: "sql-basics", title: "SQL для чтения и выборок", summary: "Делаем понятные выборки, сортировки и фильтры без лишнего шума.", level: "core", tags: ["sql", "база", "запросы"], concepts: ["select", "where", "order"], lang: "sql", snippet: "SELECT slug, title FROM modules ORDER BY sort_order ASC;" },
  { slug: "database-design", title: "Проектирование базы данных", summary: "Разбиваем продукт на сущности, связи и ограничения до написания миграций.", level: "advanced", tags: ["бд", "схема", "архитектура"], concepts: ["сущность", "связь", "ограничение"], lang: "text", snippet: "Module 1-* ModuleSection\nModule 1-* ModuleAsset\nModule 1-* ModuleComment" },
  { slug: "http-and-rest", title: "HTTP и REST без абстракций", summary: "Проектируем API как контракт с методами, статусами и ресурсами.", level: "core", tags: ["http", "rest", "api"], concepts: ["метод", "статус", "ресурс"], lang: "http", snippet: "POST /api/modules/functions/comments\nContent-Type: application/json" },
  { slug: "json-and-serialization", title: "JSON и сериализация данных", summary: "Разбираем, как данные меняют форму на стыке клиента и сервера.", level: "core", tags: ["json", "сериализация", "api"], concepts: ["структура", "типы", "преобразование"], lang: "json", snippet: "{ \"items\": [{ \"id\": 1, \"body\": \"Полезно\" }] }" },
  { slug: "async-programming", title: "Асинхронность и ожидание результата", summary: "Управляем сетевыми и файловыми операциями без блокировки интерфейса.", level: "advanced", tags: ["async", "promise", "сервер"], concepts: ["ожидание", "параллельность", "ошибки"], lang: "ts", snippet: "const [module, comments] = await Promise.all([getModule(), getComments()]);" },
  { slug: "html-and-semantic-layout", title: "HTML и семантическая разметка", summary: "Строим структуру страницы так, чтобы она была понятна и человеку, и поисковику.", level: "base", tags: ["html", "семантика", "frontend"], concepts: ["article", "section", "headings"], lang: "html", snippet: "<article><header><h1>Функции</h1></header><section><h2>Теория</h2></section></article>" },
  { slug: "css-and-layout", title: "CSS и современная раскладка", summary: "Собираем чистые сетки, адаптивность и визуальную иерархию.", level: "base", tags: ["css", "layout", "frontend"], concepts: ["grid", "flex", "адаптивность"], lang: "css", snippet: ".grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }" },
  { slug: "javascript-fundamentals", title: "JavaScript как язык поведения", summary: "Применяем базовые конструкции языка к фильтрам, формам и состоянию.", level: "base", tags: ["javascript", "frontend", "основы"], concepts: ["условия", "циклы", "функции"], lang: "ts", snippet: "const filtered = modules.filter((item) => item.title.includes(query));" },
  { slug: "dom-and-browser", title: "DOM и поведение в браузере", summary: "Управляем элементами страницы после рендера и связываем их с событиями.", level: "base", tags: ["dom", "browser", "frontend"], concepts: ["элемент", "событие", "обновление"], lang: "ts", snippet: "const button = document.createElement('button');\npreElement.prepend(button);" },
  { slug: "react-fundamentals", title: "React и компоненты", summary: "Разделяем интерфейс на переиспользуемые блоки с props и локальным состоянием.", level: "core", tags: ["react", "компоненты", "frontend"], concepts: ["component", "props", "state"], lang: "tsx", snippet: "export function ModuleCard({ title }: { title: string }) {\n  return <article>{title}</article>;\n}" },
  { slug: "nextjs-fundamentals", title: "Next.js и рендеринг под SEO", summary: "Собираем маршруты, metadata и быстрые публичные страницы на App Router.", level: "core", tags: ["nextjs", "ssr", "seo"], concepts: ["route", "metadata", "server"], lang: "tsx", snippet: "export default async function Page({ params }: { params: Promise<{ slug: string }> }) {\n  return <main>{(await params).slug}</main>;\n}" },
  { slug: "web-security", title: "Безопасность веб-приложений", summary: "Защищаем комментарии и ввод пользователя от XSS, флуда и ботов.", level: "advanced", tags: ["безопасность", "xss", "rate-limit"], concepts: ["sanitization", "captcha", "ограничения"], lang: "ts", snippet: "const clean = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }).trim();" },
  { slug: "deploy-and-monitoring", title: "Деплой, кэш и наблюдаемость", summary: "Публикуем приложение на сервере и следим за его здоровьем после релиза.", level: "advanced", tags: ["деплой", "кэш", "мониторинг"], concepts: ["nginx", "cdn", "метрики"], lang: "nginx", snippet: "location / {\n  proxy_pass http://127.0.0.1:3000;\n}" }
];

function theoryMarkdown(item: Blueprint) {
  return [
    "### Что важно понять",
    item.summary,
    "",
    `- ${item.concepts[0]}`,
    `- ${item.concepts[1]}`,
    `- ${item.concepts[2]}`,
    "",
    "Этот блок сделан как короткая методичка: сначала идея, затем компактный пример и затем практическое закрепление."
  ].join("\n");
}

function exampleMarkdown(item: Blueprint) {
  return [
    "### Разбираем пример",
    "Берем минимальный фрагмент, который показывает суть подхода без лишнего шума.",
    "",
    `\`\`\`${item.lang}`,
    item.snippet,
    "```",
    "",
    "После чтения стоит ответить себе на два вопроса: какие данные входят и что считается правильным результатом."
  ].join("\n");
}

function practiceMarkdown(item: Blueprint) {
  return [
    "### Практический блок",
    `1. Применить тему «${item.title}» к своей небольшой задаче.`,
    `2. Проверить граничный случай, связанный с понятием «${item.concepts[0]}».`,
    `3. Переписать решение так, чтобы лучше читались «${item.concepts[1]}» и «${item.concepts[2]}».`,
    "",
    "Если модуль идет в курсе подряд, полезно зафиксировать свой вариант решения в отдельной заметке или файле."
  ].join("\n");
}

function summaryMarkdown(item: Blueprint) {
  return [
    "### Мини-конспект",
    `- Тема модуля: ${item.title}.`,
    `- Три опоры: ${item.concepts.join(", ")}.`,
    `- Продуктовый контекст: ${item.tags.join(", ")}.`,
    "",
    "Если вы можете объяснить тему своими словами и привести пример без подсказки, модуль можно считать закрепленным."
  ].join("\n");
}

function buildAssets(slug: string, title: string) {
  const items: Array<{
    fileType: ModuleFileType;
    sizeBytes: number;
    mimeType: string;
    name: string;
    note: string;
    cta: string;
  }> = [
    { fileType: "pdf", sizeBytes: 248320, mimeType: "application/pdf", name: `Конспект: ${title}`, note: "PDF для повторения теории.", cta: "Открыть PDF" },
    { fileType: "csv", sizeBytes: 18432, mimeType: "text/csv", name: `Практика: ${title}`, note: "CSV с демонстрационным набором данных.", cta: "Открыть CSV" },
    { fileType: "txt", sizeBytes: 4096, mimeType: "text/plain", name: `Шпаргалка: ${title}`, note: "TXT с тезисами и краткими заметками.", cta: "Открыть TXT" }
  ];

  return items.map((item) => {
    const fileName = item.fileType === "pdf" ? "handout.pdf" : item.fileType === "csv" ? "practice.csv" : "cheatsheet.txt";
    const storageKey = `modules/${slug}/${fileName}`;

    return {
      title: item.name,
      fileType: item.fileType,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      storageKey,
      checksum: createHash("sha256").update(`${slug}:${item.fileType}`).digest("hex"),
      publicUrl: resolvePublicAssetUrl(storageKey, item.fileType),
      previewJson: {
        excerpt: `Файл сопровождает модуль «${title}» и открывается публично без авторизации.`,
        formatNote: item.note,
        ctaLabel: item.cta
      }
    };
  });
}

function seedFromBlueprint(item: Blueprint, index: number): ModuleSeedInput {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    order: index + 1,
    level: item.level,
    tags: item.tags,
    readingTime: 8 + (index % 5) * 2,
    publishedAt: new Date(Date.UTC(2026, 0, 6 + index, 9, 0, 0)).toISOString(),
    seoTitle: `${item.title} | Обучение от тети Аннушки`,
    seoDescription: item.summary,
    sections: [
      { kind: "theory", heading: "Теория", sortOrder: 1, markdownSource: theoryMarkdown(item) },
      { kind: "example", heading: "Разбор примера", sortOrder: 2, markdownSource: exampleMarkdown(item) },
      { kind: "practice", heading: "Практика", sortOrder: 3, markdownSource: practiceMarkdown(item) },
      { kind: "summary", heading: "Чеклист", sortOrder: 4, markdownSource: summaryMarkdown(item) }
    ],
    assets: buildAssets(item.slug, item.title)
  };
}

export function createModuleSeedInputs() {
  return blueprints.map(seedFromBlueprint);
}

export function buildSearchText(module: ModuleSeedInput) {
  return [
    module.title,
    module.summary,
    module.tags.join(" "),
    module.sections.map((section) => section.markdownSource).join(" ")
  ].join(" ");
}

async function compileModule(module: ModuleSeedInput): Promise<ModuleDetailView> {
  const sections = await Promise.all(
    module.sections.map(async (section) => ({
      ...section,
      htmlCached: await compileMarkdown(section.markdownSource),
      anchorId: buildSectionAnchor(section.sortOrder)
    }))
  );

  return {
    ...module,
    sections,
    assets: module.assets,
    assetCount: module.assets.length,
    commentCount: 0,
    sectionCount: sections.length
  };
}

let compiledSeedPromise: Promise<ModuleDetailView[]> | null = null;

export async function getCompiledSeedModules() {
  if (!compiledSeedPromise) {
    compiledSeedPromise = Promise.all(createModuleSeedInputs().map(compileModule));
  }

  return compiledSeedPromise;
}

export async function getCompiledSeedModuleSummaries(): Promise<ModuleSummaryView[]> {
  return createModuleSeedInputs().map((module) => ({
    slug: module.slug,
    title: module.title,
    summary: module.summary,
    order: module.order,
    level: module.level,
    tags: module.tags,
    readingTime: module.readingTime,
    publishedAt: module.publishedAt,
    seoTitle: module.seoTitle,
    seoDescription: module.seoDescription,
    assetCount: module.assets.length,
    commentCount: 0,
    sectionCount: module.sections.length
  }));
}
