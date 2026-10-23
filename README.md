# Онлайн Переводчик

Современное PWA и Android-приложение для перевода текста и речи между русским, английским, немецким, французским и испанским языками.

## Возможности

- Перевод текста с мгновенным результатом
- Автоопределение языка текста и языка говорящего
- Выбор исходного и целевого языка, обмен языками и текстом
- Копирование, очистка, озвучивание (TTS)
- Голосовой перевод в реальном времени (Web Speech API)
- История и избранное (IndexedDB / localStorage)
- Светлая и тёмная тема
- Устанавливаемое PWA с офлайн-кэшем интерфейса
- Готовность к сборке Android через Capacitor

## Стек

- React 19 + TypeScript + Vite
- vite-plugin-pwa (manifest + service worker)
- MyMemory Translation API (+ LibreTranslate fallback)
- Web Speech API (распознавание и синтез речи)
- Capacitor (Android-упаковка)

## Запуск

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
npm run preview
```

## Android (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/filesystem
npx cap init "Онлайн Переводчик" com.online.translator --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Или после первичной настройки:

```bash
npm run android
```

В Android Studio соберите APK/AAB. Разрешение на микрофон уже указано в шаблоне `AndroidManifest` через Capacitor.

## Онлайн-версия

- GitHub: https://github.com/lashkinalex2025-cmd/online-translator
- GitHub Pages: https://lashkinalex2025-cmd.github.io/online-translator/

Папка `docs/` — собранный билд для Pages. После изменений UI:

```bash
npm run build
# скопируйте dist → docs и закоммитьте
```

## Структура

```
src/
  components/   # UI-компоненты
  constants/    # языки
  hooks/        # тема
  services/     # перевод, речь, TTS, хранилище
  types/        # типы
public/         # иконки PWA
```
