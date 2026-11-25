<div align="center">
  <h1>Vox Shift</h1>
  <p>A minimal real-time voice changer for Windows.</p>
  <p>
    <a href="#русский">Русский</a> ·
    <a href="#english">English</a> ·
    <a href="https://github.com/NoNamegerg/vox-shift/releases/latest">Download for Windows</a>
  </p>
</div>

---

## Русский

Vox Shift — компактное приложение для изменения голоса в реальном времени. Без аккаунта и облачной обработки: звук обрабатывается локально на компьютере.

### Возможности

- 10 голосовых пресетов: от низкого и мягкого до радио и робота.
- Настройки высоты голоса (**Pitch**), тембра (**Formant**) и роботизации (**Robot**).
- Выбор микрофона и устройства вывода.
- Минималистичный тёмный интерфейс.

### Скачать и запустить

1. Скачайте [VoxShift-Windows-x64.zip из последнего релиза](https://github.com/NoNamegerg/vox-shift/releases/latest).
2. Распакуйте архив в отдельную папку.
3. Запустите `VoxShift.exe`.

Для запуска из исходников установите Node.js и выполните:

```powershell
npm install
npm start
```

### Использование в Discord и играх

Для передачи обработанного звука в другое приложение установите виртуальный аудиокабель, например VB-CABLE. Выберите его вход как устройство вывода в Vox Shift, а соответствующий выход кабеля — как микрофон в Discord или игре. Наушники помогут избежать акустической обратной связи.

Пресеты используют обычную цифровую обработку звука, а не нейросетевое клонирование голоса.

## English

Vox Shift is a compact app for changing your voice in real time. No account or cloud processing is required; audio is processed locally on your computer.

### Features

- 10 voice presets, from low and warm to radio and robot effects.
- Adjust voice pitch (**Pitch**), tone (**Formant**), and robot effect (**Robot**).
- Choose your microphone and output device.
- Minimal dark interface.

### Download and run

1. Download [VoxShift-Windows-x64.zip from the latest release](https://github.com/NoNamegerg/vox-shift/releases/latest).
2. Extract the archive to a folder.
3. Run `VoxShift.exe`.

To run from source, install Node.js and run:

```powershell
npm install
npm start
```

### Using it with Discord and games

To send processed audio to another app, install a virtual audio cable such as VB-CABLE. Select its input as the output device in Vox Shift, then select the cable's corresponding output as the microphone in Discord or your game. Headphones help prevent acoustic feedback.

Presets use standard digital audio processing, not AI voice cloning.
