const voices = [
  { id: 'studio', name: 'Studio', pitch: 0, formant: 0, robot: 0, a: '#727d91', b: '#343946', icon: 'S' },
  { id: 'deep', name: 'Deep Male', pitch: -7, formant: -5, robot: 0, a: '#6d76a8', b: '#303653', icon: 'D' },
  { id: 'warm', name: 'Warm Male', pitch: -3, formant: -2, robot: 0, a: '#a48363', b: '#584233', icon: 'W' },
  { id: 'bright', name: 'Bright Female', pitch: 5, formant: 4, robot: 0, a: '#bb718d', b: '#654052', icon: 'B' },
  { id: 'soft', name: 'Soft Female', pitch: 3, formant: 2, robot: 0, a: '#c392b1', b: '#664b60', icon: 'F' },
  { id: 'boy', name: 'Young Boy', pitch: 8, formant: 7, robot: 0, a: '#6fa4b8', b: '#36535f', icon: 'Y' },
  { id: 'elder', name: 'Elder', pitch: -5, formant: 5, robot: 5, a: '#a59b78', b: '#5b573f', icon: 'E' },
  { id: 'robot', name: 'Robot', pitch: 0, formant: 0, robot: 72, a: '#4eae88', b: '#315c50', icon: 'R' },
  { id: 'alien', name: 'Alien', pitch: 9, formant: -7, robot: 35, a: '#7f76b7', b: '#493c70', icon: 'A' },
  { id: 'radio', name: 'Radio', pitch: -2, formant: -4, robot: 18, a: '#a66d50', b: '#5e3d31', icon: 'Q' }
];

const state = {
  stream: null,
  context: null,
  source: null,
  analyser: null,
  processor: null,
  gain: null,
  oscillator: null,
  robotGain: null,
  dryGain: null,
  wetGain: null,
  filters: [],
  animation: null,
  activeVoice: voices[0],
  running: false
};

const els = {
  grid: document.querySelector('#voiceGrid'),
  input: document.querySelector('#inputDevice'),
  output: document.querySelector('#outputDevice'),
  power: document.querySelector('#powerButton'),
  powerLabel: document.querySelector('#powerLabel'),
  status: document.querySelector('#status'),
  statusText: document.querySelector('#statusText'),
  levelFill: document.querySelector('#levelFill'),
  dbLevel: document.querySelector('#dbLevel'),
  pitch: document.querySelector('#pitch'),
  formant: document.querySelector('#formant'),
  robot: document.querySelector('#robot'),
  pitchValue: document.querySelector('#pitchValue'),
  formantValue: document.querySelector('#formantValue'),
  robotValue: document.querySelector('#robotValue'),
  reset: document.querySelector('#resetButton')
};

function renderVoices() {
  els.grid.innerHTML = '';
  for (const voice of voices) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `voice-card${voice.id === state.activeVoice.id ? ' active' : ''}`;
    card.style.setProperty('--card-a', voice.a);
    card.style.setProperty('--card-b', voice.b);
    card.innerHTML = `<span>${voice.name}</span>`;
    card.addEventListener('click', () => selectVoice(voice));
    els.grid.appendChild(card);
  }
}

function selectVoice(voice) {
  state.activeVoice = voice;
  els.pitch.value = voice.pitch;
  els.formant.value = voice.formant;
  els.robot.value = voice.robot;
  updateLabels();
  applyProcessing();
  renderVoices();
}

function updateLabels() {
  els.pitchValue.textContent = signed(Number(els.pitch.value));
  els.formantValue.textContent = signed(Number(els.formant.value));
  els.robotValue.textContent = `${els.robot.value}%`;
}

function signed(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function createPitchProcessor(context) {
  const processor = context.createScriptProcessor(2048, 1, 1);
  const buffer = new Float32Array(context.sampleRate * 2);
  let writeIndex = 0;
  let readIndex = 0;
  let ratio = 1;

  processor.setRatio = value => {
    ratio = Math.max(0.55, Math.min(1.8, 2 ** (value / 12)));
  };

  processor.onaudioprocess = event => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);

    for (let i = 0; i < input.length; i++) {
      buffer[writeIndex] = input[i];
      output[i] = buffer[Math.floor(readIndex) % buffer.length];
      writeIndex = (writeIndex + 1) % buffer.length;
      readIndex = (readIndex + ratio) % buffer.length;
    }
  };

  return processor;
}

async function refreshDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(device => device.kind === 'audioinput');
  const outputs = devices.filter(device => device.kind === 'audiooutput');
  const previousInput = els.input.value;
  const previousOutput = els.output.value;

  els.input.innerHTML = inputs.map(device =>
    `<option value="${device.deviceId}">${device.label || `Микрофон ${device.deviceId.slice(0, 5)}`}</option>`
  ).join('');
  els.output.innerHTML = outputs.map(device =>
    `<option value="${device.deviceId}">${device.label || `Устройство ${device.deviceId.slice(0, 5)}`}</option>`
  ).join('');

  if ([...els.input.options].some(option => option.value === previousInput)) els.input.value = previousInput;
  if ([...els.output.options].some(option => option.value === previousOutput)) els.output.value = previousOutput;
}

async function startVoice() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: els.input.value ? { exact: els.input.value } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;

    const pitchProcessor = createPitchProcessor(context);
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const robotGain = context.createGain();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();

    const frequencies = [180, 420, 720, 980];
    const filters = frequencies.map((frequency, index) => {
      const filter = context.createBiquadFilter();
      filter.type = index === 0 ? 'highpass' : 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = index === 0 ? 0.7 : 2.2;
      return filter;
    });

    oscillator.type = 'sine';
    oscillator.frequency.value = 55;
    oscillatorGain.gain.value = 0;

    source.connect(pitchProcessor);
    pitchProcessor.connect(dryGain);
    pitchProcessor.connect(filters[0]);
    filters.forEach((filter, index) => {
      if (index < filters.length - 1) filter.connect(filters[index + 1]);
    });
    filters[filters.length - 1].connect(wetGain);
    dryGain.connect(gain);
    wetGain.connect(gain);

    oscillator.connect(oscillatorGain);
      oscillatorGain.connect(gain);
    pitchProcessor.connect(analyser);
    analyser.connect(analyser.destination || context.destination);

    oscillator.start();

    state.stream = stream;
    state.context = context;
    state.source = source;
    state.analyser = analyser;
    state.processor = pitchProcessor;
    state.gain = gain;
    state.oscillator = oscillator;
    state.oscillatorGain = oscillatorGain;
    state.robotGain = robotGain;
    state.dryGain = dryGain;
    state.wetGain = wetGain;
    state.filters = filters;
    state.running = true;

    await configureOutput(context);
    applyProcessing();
    monitorLevel();

    els.power.classList.add('active');
    els.powerLabel.textContent = 'Выключить голос';
    els.status.classList.add('live');
    els.statusText.textContent = 'Активен';
  } catch (error) {
    els.statusText.textContent = 'Нет доступа';
    console.error(error);
  }
}

async function configureOutput(context) {
  const destination = els.output.value;
  if (destination && context.setSinkId) {
    try {
      await context.setSinkId(destination);
    } catch (_) {
      // Output sink switching is optional in Electron/WebView versions.
    }
  }
  await context.resume();
  state.gain.connect(context.destination);
}

function applyProcessing() {
  if (!state.running) return;
  const pitch = Number(els.pitch.value);
  const formant = Number(els.formant.value);
  const robot = Number(els.robot.value);

  state.processor.setRatio(pitch);

  const formantFactor = 2 ** (formant / 12);
  [180, 420, 720, 980].forEach((frequency, index) => {
    state.filters[index].frequency.setTargetAtTime(frequency * formantFactor, state.context.currentTime, 0.03);
  });

  const amount = robot / 100;
  state.dryGain.gain.setTargetAtTime(1 - amount * 0.42, state.context.currentTime, 0.03);
  state.wetGain.gain.setTargetAtTime(1 - amount * 0.2, state.context.currentTime, 0.03);
  state.oscillator.frequency.setTargetAtTime(35 + amount * 95, state.context.currentTime, 0.03);
  state.oscillatorGain.gain.setTargetAtTime(amount * 0.65, state.context.currentTime, 0.03);
  state.gain.gain.setTargetAtTime(0.9, state.context.currentTime, 0.03);

  // Ring modulation is mixed in through the processor destination.
  if (amount > 0) {
    if (!state.robotConnected) {
      state.robotConnected = true;
    }
  } else if (state.robotConnected) {
    state.robotConnected = false;
  }
}

async function stopVoice() {
  if (state.animation) cancelAnimationFrame(state.animation);
  if (state.stream) state.stream.getTracks().forEach(track => track.stop());
  if (state.context) await state.context.close();
  state.running = false;
  els.power.classList.remove('active');
  els.powerLabel.textContent = 'Включить голос';
  els.status.classList.remove('live');
  els.statusText.textContent = 'Готов';
  els.levelFill.style.width = '0%';
  els.dbLevel.textContent = '-60 dB';
}

function monitorLevel() {
  const data = new Uint8Array(state.analyser.frequencyBinCount);
  const tick = () => {
    if (!state.running) return;
    state.analyser.getByteFrequencyData(data);
    let sum = 0;
    for (const value of data) sum += value * value;
    const rms = Math.sqrt(sum / data.length) / 255;
    const db = Math.max(-60, 20 * Math.log10(rms || 0.0001));
    const percent = Math.max(0, Math.min(100, (db + 60) * 1.7));
    els.levelFill.style.width = `${percent}%`;
    els.dbLevel.textContent = `${Math.round(db)} dB`;
    state.animation = requestAnimationFrame(tick);
  };
  tick();
}

els.power.addEventListener('click', () => {
  if (state.running) stopVoice();
  else startVoice();
});

els.input.addEventListener('change', () => {
  if (state.running) {
    stopVoice().then(startVoice);
  }
});

[els.pitch, els.formant, els.robot].forEach(input => {
  input.addEventListener('input', () => {
    updateLabels();
    applyProcessing();
  });
});

els.output.addEventListener('change', () => {
  if (state.running) configureOutput(state.context);
});

els.reset.addEventListener('click', () => selectVoice(voices[0]));

navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices);

renderVoices();
updateLabels();
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(async stream => {
    stream.getTracks().forEach(track => track.stop());
    await refreshDevices();
  })
  .catch(() => refreshDevices());
