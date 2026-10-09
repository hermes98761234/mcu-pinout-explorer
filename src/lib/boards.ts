export type Tag = 'adc' | 'dac' | 'touch' | 'pwm' | 'i2c' | 'spi' | 'uart' | 'warn' | 'power'
export const TAGS: Tag[] = ['adc', 'dac', 'touch', 'pwm', 'i2c', 'spi', 'uart', 'warn', 'power']
export type Kind = 'io' | 'power' | 'gnd' | 'reset'
export type BoardId = 'esp32' | 'pico' | 'bluepill'

export interface Warning {
  level: 'warn' | 'info'
  text: string
}

export interface Pin {
  /** Silkscreen label, e.g. "GPIO25", "GP4", "PA9". */
  label: string
  kind: Kind
  side: 'L' | 'R'
  /** Row from the top of the board, 0-based. */
  row: number
  /** Physical pin number where the board has one (Pico). */
  num?: number
  /** Peripheral signals this pin can carry, e.g. "I2C0 SDA", "ADC1_CH6". */
  signals: string[]
  warnings: Warning[]
}

export interface Board {
  id: BoardId
  name: string
  mcu: string
  rows: number
  pins: Pin[]
  /** Short notes about the board shown under the drawing. */
  notes: string[]
}

/** Classifies a signal name into a filter tag. */
export function categorize(signal: string): Tag | null {
  if (/^ADC/.test(signal)) return 'adc'
  if (/^DAC/.test(signal)) return 'dac'
  if (/^TOUCH/.test(signal)) return 'touch'
  if (/PWM|^TIM\d+_CH|^LEDC/.test(signal)) return 'pwm'
  if (/^I2C/.test(signal)) return 'i2c'
  if (/^(SPI|VSPI|HSPI)/.test(signal)) return 'spi'
  if (/^(UART|USART)/.test(signal)) return 'uart'
  return null
}

/** The set of filter tags a pin matches. */
export function pinTags(p: Pin): Set<Tag> {
  const s = new Set<Tag>()
  for (const sig of p.signals) {
    const t = categorize(sig)
    if (t) s.add(t)
  }
  if (p.warnings.some((w) => w.level === 'warn')) s.add('warn')
  if (p.kind !== 'io') s.add('power')
  return s
}

/** True when the pin matches any selected tag (or none are selected) and the search text. */
export function matchPin(p: Pin, tags: ReadonlySet<Tag>, query: string): boolean {
  if (tags.size > 0) {
    const pt = pinTags(p)
    if (![...tags].some((t) => pt.has(t))) return false
  }
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [p.label, p.num ? `pin${p.num}` : '', ...p.signals, ...p.warnings.map((w) => w.text)].join(' ').toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w))
}

export const W = {
  input: 'Input only: no output driver and no internal pull-up or pull-down.',
  adc2: 'ADC2 channel: unusable while Wi-Fi is active.',
  s0: 'Strapping pin: held LOW at reset it enters serial download mode. Keep it HIGH (or floating) for a normal boot.',
  s2: 'Strapping pin: must be LOW or floating to enter download mode. Often wired to the on-board LED.',
  s5: 'Strapping pin (SDIO timing); emits a PWM signal at boot.',
  s12: 'Strapping pin (MTDI) selecting the flash voltage: HIGH at reset can stop 3.3 V flash modules from booting.',
  s15: 'Strapping pin (MTDO): LOW at reset silences the boot log; emits a PWM signal at boot.',
  usb0: 'Wired to the USB-serial chip (UART0). Avoid using it for other things; it also prints the boot log.',
  flash: 'Connected to the on-board SPI flash: do not use as GPIO.',
  psram: 'Used by PSRAM on WROVER modules: do not use there.',
  jtag: 'Also a JTAG debug pin.',
  en: 'Chip enable / reset. Pull LOW to reset the chip.',
  rpAdc: 'ADC input, 0 to 3.3 V (12-bit). Not 5 V tolerant.',
  led: 'On-board LED on most boards.',
  rpBoot: 'No strapping pins on RP2040. Hold BOOTSEL while powering on to enter USB mass-storage boot mode.',
  run: 'RUN: pull LOW to reset the RP2040.',
  gp25: 'On-board LED (Pico). On Pico W the LED is on the wireless chip instead.',
  gp23: 'Pico: power-mode select (internal). Pico W: wireless chip power. Not on the header.',
  gp29: 'Reads VSYS/3 on the Pico board (also ADC3).',
  adcVref: 'ADC reference. Add a clean reference here for better ADC accuracy.',
  v3en: '3V3_EN: pull LOW to switch off the 3.3 V regulator.',
  vsys: 'System input 1.8 to 5.5 V; also the output of the power-path from VBUS.',
  vbus: 'USB 5 V when connected.',
  pc13: 'On-board LED, active LOW. Weak output drive (max 3 mA, 2 MHz).',
  pc1415: 'Connected to the 32.768 kHz RTC crystal footprint. Weak output drive (max 3 mA, 2 MHz); not 5 V tolerant.',
  swd: 'SWDIO debug pin. Reconfiguring it locks you out of the debugger.',
  swo: 'JTAG pin (JTDO/SWO). Free for GPIO only after disabling JTAG in AFIO_MAPR.',
  jtdi: 'JTAG pin (JTDI). Free for GPIO only after disabling JTAG in AFIO_MAPR.',
  jtrst: 'JTAG pin (NJTRST). Free for GPIO only after disabling JTAG in AFIO_MAPR.',
  usbdm: 'USB D- when USB is used. Blue Pill boards often have a wrong pull-up resistor on D+.',
  usbdp: 'USB D+ when USB is used.',
  ft: '5 V tolerant input.',
  nft: 'Not 5 V tolerant: do not apply more than 3.3 V.',
  boot0: 'BOOT0 jumper (not on the header): HIGH at reset boots the system bootloader (serial flashing).',
  boot1: 'BOOT1 = PB2 (jumper, not on the header): together with BOOT0 selects SRAM boot.',
  nrst: 'NRST: pull LOW to reset the MCU.',
  vbat: 'RTC backup battery input (1.8 to 3.6 V).',
  v5: '5 V from USB or external supply (also a 5 V output).',
  v33: '3.3 V regulator output (about 300 mA max on most boards).',
  gnd: 'Ground.',
  vin: 'Board supply input (about 5 to 12 V) before the regulator.',
} as const

const nonIo = (label: string, kind: Kind, side: 'L' | 'R', row: number, w: string, num?: number): Pin => ({
  label, kind, side, row, num, signals: [], warnings: [{ level: 'info', text: w }],
})

// ---------------------------------------------------------------- ESP32 DevKit (30-pin)
const ESP_ADC: Record<number, string> = {
  36: 'ADC1_CH0', 37: 'ADC1_CH1', 38: 'ADC1_CH2', 39: 'ADC1_CH3', 32: 'ADC1_CH4', 33: 'ADC1_CH5', 34: 'ADC1_CH6', 35: 'ADC1_CH7',
  4: 'ADC2_CH0', 0: 'ADC2_CH1', 2: 'ADC2_CH2', 15: 'ADC2_CH3', 13: 'ADC2_CH4', 12: 'ADC2_CH5', 14: 'ADC2_CH6', 27: 'ADC2_CH7', 25: 'ADC2_CH8', 26: 'ADC2_CH9',
}
const ESP_TOUCH: Record<number, number> = { 4: 0, 0: 1, 2: 2, 15: 3, 13: 4, 12: 5, 14: 6, 27: 7, 33: 8, 32: 9 }
const ESP_INPUT_ONLY = new Set([34, 35, 36, 39])
const ESP_SPI: Record<number, string> = {
  23: 'VSPI MOSI', 19: 'VSPI MISO', 18: 'VSPI SCK', 5: 'VSPI CS', 13: 'HSPI MOSI', 12: 'HSPI MISO', 14: 'HSPI SCK', 15: 'HSPI CS',
}
const ESP_UART: Record<number, string> = { 1: 'UART0 TX', 3: 'UART0 RX', 17: 'UART2 TX', 16: 'UART2 RX' }
const ESP_I2C: Record<number, string> = { 21: 'I2C0 SDA (default)', 22: 'I2C0 SCL (default)' }

function espPin(gpio: number, label: string, side: 'L' | 'R', row: number): Pin {
  const signals: string[] = []
  const warnings: Warning[] = []
  if (ESP_ADC[gpio]) signals.push(ESP_ADC[gpio])
  if (gpio === 25) signals.push('DAC1')
  if (gpio === 26) signals.push('DAC2')
  if (gpio in ESP_TOUCH) signals.push(`TOUCH${ESP_TOUCH[gpio]}`)
  if (!ESP_INPUT_ONLY.has(gpio)) signals.push('LEDC PWM')
  if (ESP_I2C[gpio]) signals.push(ESP_I2C[gpio])
  if (ESP_SPI[gpio]) signals.push(ESP_SPI[gpio])
  if (ESP_UART[gpio]) signals.push(ESP_UART[gpio])
  if (ESP_INPUT_ONLY.has(gpio)) warnings.push({ level: 'info', text: W.input })
  if (gpio >= 6 && gpio <= 11) return { label, kind: 'io', side, row, signals: [], warnings: [{ level: 'warn', text: W.flash }] }
  const s: Record<number, string> = { 0: W.s0, 2: W.s2, 5: W.s5, 12: W.s12, 15: W.s15 }
  if (s[gpio]) warnings.push({ level: 'warn', text: s[gpio] })
  if (gpio === 1 || gpio === 3) warnings.push({ level: 'warn', text: W.usb0 })
  if (gpio === 16 || gpio === 17) warnings.push({ level: 'info', text: W.psram })
  if ([12, 13, 14, 15].includes(gpio)) warnings.push({ level: 'info', text: W.jtag })
  if (ESP_ADC[gpio]?.startsWith('ADC2')) warnings.push({ level: 'info', text: W.adc2 })
  if (gpio === 2) warnings.push({ level: 'info', text: W.led })
  return { label, kind: 'io', side, row, signals, warnings }
}

function esp32(): Board {
  const left: [string, number | string][] = [
    ['3V3', 'v33'], ['EN', 'en'], ['VP (GPIO36)', 36], ['VN (GPIO39)', 39], ['GPIO34', 34], ['GPIO35', 35], ['GPIO32', 32], ['GPIO33', 33], ['GPIO25', 25],
    ['GPIO26', 26], ['GPIO27', 27], ['GPIO14', 14], ['GPIO12', 12], ['GND', 'gnd'], ['GPIO13', 13], ['D2 (GPIO9)', 9], ['D3 (GPIO10)', 10], ['CMD (GPIO11)', 11], ['5V', 'v5'],
  ]
  const right: [string, number | string][] = [
    ['GND', 'gnd'], ['GPIO23', 23], ['GPIO22', 22], ['TX (GPIO1)', 1], ['RX (GPIO3)', 3], ['GPIO21', 21], ['GND', 'gnd'], ['GPIO19', 19], ['GPIO18', 18], ['GPIO5', 5],
    ['GPIO17', 17], ['GPIO16', 16], ['GPIO4', 4], ['GPIO0', 0], ['GPIO2', 2], ['GPIO15', 15], ['D1 (GPIO8)', 8], ['D0 (GPIO7)', 7], ['CLK (GPIO6)', 6],
  ]
  const mk = (arr: [string, number | string][], side: 'L' | 'R'): Pin[] =>
    arr.map(([label, g], row) => {
      if (typeof g === 'number') return espPin(g, label, side, row)
      if (g === 'en') return nonIo(label, 'reset', side, row, W.en)
      if (g === 'gnd') return nonIo(label, 'gnd', side, row, W.gnd)
      if (g === 'v5') return nonIo(label, 'power', side, row, W.v5)
      return nonIo(label, 'power', side, row, W.v33)
    })
  return {
    id: 'esp32', name: 'ESP32 DevKitC (38-pin)', mcu: 'ESP32', rows: 19, pins: [...mk(left, 'L'), ...mk(right, 'R')],
    notes: ['GPIO6 to GPIO11 are connected to the SPI flash and must not be used.', 'Almost any peripheral can be routed to any output-capable GPIO through the GPIO matrix; the listed signals are the defaults.'],
  }
}

// ---------------------------------------------------------------- Raspberry Pi Pico (RP2040)
function picoGpio(n: number, num: number, side: 'L' | 'R', row: number): Pin {
  const signals: string[] = []
  const warnings: Warning[] = []
  const spi = Math.floor(n / 8) % 2
  signals.push(`SPI${spi} ${['RX', 'CSn', 'SCK', 'TX'][n % 4]}`)
  const uart = (Math.floor(n / 4) + 1 >> 1) % 2
  signals.push(`UART${uart} ${['TX', 'RX', 'CTS', 'RTS'][n % 4]}`)
  signals.push(`I2C${Math.floor(n / 2) % 2} ${n % 2 === 0 ? 'SDA' : 'SCL'}`)
  signals.push(`PWM${Math.floor(n / 2) % 8} ${n % 2 === 0 ? 'A' : 'B'}`)
  if (n >= 26 && n <= 29) signals.push(`ADC${n - 26}`)
  if (n === 25) warnings.push({ level: 'info', text: W.gp25 })
  if (n === 29) warnings.push({ level: 'info', text: W.gp29 })
  if (n === 28 || n === 27 || n === 26) warnings.push({ level: 'info', text: W.rpAdc })
  return { label: `GP${n}`, kind: 'io', side, row, num, signals, warnings }
}

function pico(): Board {
  const names = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15',
    'GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND', 'GP22', 'RUN', 'GP26', 'GP27', 'AGND', 'GP28', 'ADC_VREF', '3V3', '3V3_EN', 'GND', 'VSYS', 'VBUS']
  const pins: Pin[] = names.map((nm, i) => {
    const num = i + 1
    const side: 'L' | 'R' = num <= 20 ? 'L' : 'R'
    const row = num <= 20 ? i : 40 - num
    if (nm.startsWith('GP')) return picoGpio(+nm.slice(2), num, side, row)
    if (nm.endsWith('GND')) return nonIo(nm, 'gnd', side, row, W.gnd, num)
    if (nm === 'RUN') return nonIo(nm, 'reset', side, row, W.run, num)
    if (nm === 'ADC_VREF') return nonIo(nm, 'power', side, row, W.adcVref, num)
    if (nm === '3V3') return nonIo(nm, 'power', side, row, W.v33, num)
    if (nm === '3V3_EN') return nonIo(nm, 'power', side, row, W.v3en, num)
    if (nm === 'VSYS') return nonIo(nm, 'power', side, row, W.vsys, num)
    return nonIo(nm, 'power', side, row, W.vbus, num)
  })
  return {
    id: 'pico', name: 'Raspberry Pi Pico', mcu: 'RP2040', rows: 20, pins,
    notes: [W.rpBoot, 'Every GPIO can carry any of the four function groups shown by the SDK pin mux; pick one function per pin. The internal temperature sensor is ADC4.', 'GP23 (power mode) and GP24 (VBUS sense) are not on the header; GP25 drives the on-board LED.'],
  }
}

// ---------------------------------------------------------------- STM32 Blue Pill (F103C8)
const BP: Record<string, string[]> = {
  PA0: ['ADC1_IN0', 'TIM2_CH1', 'USART2_CTS'], PA1: ['ADC1_IN1', 'TIM2_CH2', 'USART2_RTS'], PA2: ['ADC1_IN2', 'TIM2_CH3', 'USART2_TX'],
  PA3: ['ADC1_IN3', 'TIM2_CH4', 'USART2_RX'], PA4: ['ADC1_IN4', 'SPI1_NSS', 'USART2_CK'], PA5: ['ADC1_IN5', 'SPI1_SCK'],
  PA6: ['ADC1_IN6', 'TIM3_CH1', 'SPI1_MISO'], PA7: ['ADC1_IN7', 'TIM3_CH2', 'SPI1_MOSI'],
  PA8: ['TIM1_CH1', 'USART1_CK'], PA9: ['TIM1_CH2', 'USART1_TX'], PA10: ['TIM1_CH3', 'USART1_RX'], PA11: ['TIM1_CH4', 'USART1_CTS'],
  PA12: ['USART1_RTS'], PA15: ['SPI1_NSS (remap)', 'TIM2_CH1 (remap)'],
  PB0: ['ADC1_IN8', 'TIM3_CH3'], PB1: ['ADC1_IN9', 'TIM3_CH4'],
  PB3: ['SPI1_SCK (remap)', 'TIM2_CH2 (remap)'], PB4: ['SPI1_MISO (remap)', 'TIM3_CH1 (remap)'], PB5: ['SPI1_MOSI (remap)', 'TIM3_CH2 (remap)', 'I2C1_SMBA'],
  PB6: ['I2C1_SCL', 'TIM4_CH1', 'USART1_TX (remap)'], PB7: ['I2C1_SDA', 'TIM4_CH2', 'USART1_RX (remap)'],
  PB8: ['TIM4_CH3', 'I2C1_SCL (remap)'], PB9: ['TIM4_CH4', 'I2C1_SDA (remap)'],
  PB10: ['I2C2_SCL', 'USART3_TX', 'TIM2_CH3 (remap)'], PB11: ['I2C2_SDA', 'USART3_RX', 'TIM2_CH4 (remap)'],
  PB12: ['SPI2_NSS', 'I2C2_SMBA', 'USART3_CK'], PB13: ['SPI2_SCK', 'USART3_CTS', 'TIM1_CH1N'],
  PB14: ['SPI2_MISO', 'USART3_RTS', 'TIM1_CH2N'], PB15: ['SPI2_MOSI', 'TIM1_CH3N'],
  PC13: [], PC14: [], PC15: [], PA13: [],
}

function bpPin(name: string, side: 'L' | 'R', row: number): Pin {
  const warnings: Warning[] = []
  const w = (level: Warning['level'], text: string) => warnings.push({ level, text })
  if (name === 'PC13') w('warn', W.pc13)
  if (name === 'PC14' || name === 'PC15') w('warn', W.pc1415)
  if (name === 'PA11') w('info', W.usbdm)
  if (name === 'PA12') w('info', W.usbdp)
  if (name === 'PA15') w('warn', W.jtdi)
  if (name === 'PB3') w('warn', W.swo)
  if (name === 'PB4') w('warn', W.jtrst)
  const num = +name.slice(2)
  const ft = (name[1] === 'A' && num >= 8) || (name[1] === 'B' && num >= 2)
  if (name[1] !== 'C') w('info', ft ? W.ft : W.nft)
  return { label: name, kind: 'io', side, row, signals: BP[name] ?? [], warnings }
}

function bluepill(): Board {
  const left = ['PB12', 'PB13', 'PB14', 'PB15', 'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7', 'PB8', 'PB9', '5V', 'GND', '3V3']
  const right = ['GND', 'GND', '3V3', 'NRST', 'PB11', 'PB10', 'PB1', 'PB0', 'PA7', 'PA6', 'PA5', 'PA4', 'PA3', 'PA2', 'PA1', 'PA0', 'PC15', 'PC14', 'PC13', 'VBAT']
  const mk = (arr: string[], side: 'L' | 'R'): Pin[] =>
    arr.map((nm, row) => {
      if (nm === 'GND') return nonIo(nm, 'gnd', side, row, W.gnd)
      if (nm === '3V3') return nonIo(nm, 'power', side, row, W.v33)
      if (nm === '5V') return nonIo(nm, 'power', side, row, W.v5)
      if (nm === 'VBAT') return nonIo(nm, 'power', side, row, W.vbat)
      if (nm === 'NRST') return nonIo(nm, 'reset', side, row, W.nrst)
      return bpPin(nm, side, row)
    })
  return {
    id: 'bluepill', name: 'STM32 Blue Pill', mcu: 'STM32F103C8T6', rows: 20, pins: [...mk(left, 'L'), ...mk(right, 'R')],
    notes: [W.boot0, W.boot1, 'PA13 (SWDIO) and PA14 (SWCLK) are on the 4-pin SWD header, not on the main rows. Signals marked (remap) need the AFIO remap setting.'],
  }
}

export const BOARDS: Record<BoardId, Board> = { esp32: esp32(), pico: pico(), bluepill: bluepill() }
export const BOARD_IDS: BoardId[] = ['esp32', 'pico', 'bluepill']
