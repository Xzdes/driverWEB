# Procedural FPS Engine

JSON-driven FPS движок на Babylon.js где всё генерируется процедурно без внешних ассетов.

## Особенности

- **100% процедурная генерация** - текстуры, звуки, персонажи
- **JSON-конфигурация** - комнаты, объекты, триггеры описываются в JSON
- **Модульная архитектура** - легко расширяемая система
- **Физика** - гравитация, толкание объектов, коллизии
- **AI персонажей** - патрулирование, блуждание, преследование
- **Система порталов** - плавные переходы между комнатами

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:5173 в браузере.

## Управление

- **WASD** - движение
- **Мышь** - обзор
- **Shift** - бег
- **Ctrl** - красться
- **Space** - прыжок
- **E** - взаимодействие

## Структура проекта

```
src/
├── core/           # Ядро движка
│   ├── Engine.js       # Главный движок
│   ├── GameState.js    # Глобальное состояние
│   └── EventBus.js     # Шина событий
├── loaders/        # Загрузчики
│   └── RoomLoader.js   # Загрузка комнат из JSON
├── player/         # Игрок
│   ├── PlayerController.js  # Движение и физика
│   └── InputManager.js      # Обработка ввода
├── physics/        # Физика
│   ├── CollisionSystem.js   # AABB коллизии
│   └── PhysicsBody.js       # Физические тела
├── geometry/       # Геометрия
│   └── PrimitiveFactory.js  # Box, Cylinder, Sphere...
├── textures/       # Процедурные текстуры
│   ├── TextureGenerator.js  # Генератор текстур
│   ├── NoiseGenerator.js    # Perlin noise
│   └── MaterialPresets.js   # Пресеты материалов
├── audio/          # Процедурный звук
│   ├── AudioEngine.js       # Web Audio API
│   ├── SoundSynthesizer.js  # Синтез звуков
│   └── SoundPresets.js      # Шаги, выстрелы, ambient
├── characters/     # Персонажи
│   ├── HumanoidBuilder.js   # Сборка из примитивов
│   ├── CharacterPresets.js  # soldier, robot, zombie
│   └── CharacterAI.js       # AI поведение
├── objects/        # Интерактивные объекты
│   ├── Door.js         # Двери
│   ├── Button.js       # Кнопки
│   ├── Pickup.js       # Предметы
│   └── Portal.js       # Порталы
├── events/         # События
│   ├── TriggerSystem.js    # Триггеры
│   └── EventActions.js     # Действия
└── utils/          # Утилиты
    ├── Logger.js       # Логирование
    └── Math.js         # Математика
```

## JSON-формат комнаты

```json
{
  "schemaVersion": 2,
  "id": "room_id",
  "bounds": { "center": [0, 3, 0], "size": [20, 6, 16] },

  "proceduralTextures": [
    { "id": "tex_brick", "type": "brick", "params": {...} }
  ],

  "materials": [
    { "id": "mat_wall", "diffuseTexture": "tex_brick" }
  ],

  "geometry": [
    { "id": "crate", "type": "box", "position": [0, 0.5, 0], "size": [1, 1, 1], "material": "mat_wall", "collision": true }
  ],

  "characters": [
    { "id": "guard", "preset": "soldier", "position": [5, 0, 5], "rotation": 0 }
  ],

  "interactives": [
    { "id": "door1", "type": "door", "position": [0, 0, 5] },
    { "id": "key1", "type": "pickup", "position": [2, 0.5, 0], "itemType": "key", "itemId": "blue_key" }
  ],

  "portals": [
    { "id": "exit", "wall": "east", "toRoom": "/rooms/room2.json", "exitPosition": [-5, 0, 0], "exitRotation": 90 }
  ],

  "triggers": [
    { "id": "t1", "type": "onEnter", "volume": {...}, "actions": [...] }
  ],

  "playerSpawn": { "enabled": true, "position": [0, 0, -5], "rotation": 0 }
}
```

## Процедурные текстуры

Типы: `brick`, `concrete`, `wood`, `metal`, `tiles`, `noise`, `checkerboard`, `gradient`, `camo`, `skin`

```json
{
  "id": "tex_brick",
  "type": "brick",
  "size": 512,
  "params": {
    "brickColor": [150, 75, 55],
    "mortarColor": [80, 80, 75],
    "brickWidth": 48,
    "brickHeight": 24
  }
}
```

## Физические объекты

Объекты с `"physics": true` можно толкать:

```json
{
  "id": "box",
  "type": "box",
  "position": [0, 0.3, 0],
  "size": [0.6, 0.6, 0.6],
  "physics": true,
  "mass": 1.5,
  "pushResistance": 0.2
}
```

## Порталы

Порталы - это переходы между комнатами на стенах:

```json
{
  "id": "portal_to_room2",
  "wall": "east",
  "rect": { "center": [0, 1.1], "size": [1.6, 2.2] },
  "toRoom": "/rooms/room2.json",
  "exitPosition": [-5, 0, 0],
  "exitRotation": 90,
  "locked": false
}
```

- `wall` - стена: north, south, east, west
- `rect.center` - [смещение вдоль стены, высота]
- `exitPosition` - точка появления в новой комнате
- `exitRotation` - угол поворота (0=север, 90=восток, 180=юг, -90=запад)

**Важно:** `exitPosition` должна быть минимум в 1.5м от обратного портала чтобы избежать петли телепортации.

## AI персонажей

Персонажи могут иметь AI поведение:

```json
{
  "id": "guard",
  "preset": "soldier",
  "position": [5, 0, 5],
  "ai": {
    "behavior": "wander",
    "speed": 1.2,
    "wanderRadius": 5,
    "minWait": 1,
    "maxWait": 3
  }
}
```

Поведения:
- `idle` - стоит на месте
- `wander` - случайно ходит в радиусе
- `patrol` - ходит по точкам
- `chase` - преследует игрока

## Пресеты персонажей

- `mannequin_red` - красный манекен (враг)
- `soldier` - солдат в камуфляже
- `robot` - металлический робот
- `zombie` - зомби

## Триггеры

```json
{
  "id": "welcome",
  "type": "onEnter",
  "volume": { "center": [0, 1.5, 0], "size": [4, 3, 4] },
  "once": true,
  "actions": [
    { "type": "showMessage", "params": { "text": "Welcome!", "duration": 3000 } }
  ]
}
```

Типы триггеров: `onEnter`, `onExit`, `onUse`, `onTimer`

Действия: `showMessage`, `playSound`, `openDoor`, `closeDoor`, `setFlag`, `spawnObject`, `destroyObject`, `loadRoom`

## Технологии

- **Babylon.js 8.x** - 3D движок
- **Vite 7.x** - сборка и dev-сервер
- **Web Audio API** - процедурный звук
- **Canvas API** - процедурные текстуры
