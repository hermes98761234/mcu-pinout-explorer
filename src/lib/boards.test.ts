import { describe, expect, it } from 'vitest'
import { BOARDS, matchPin, pinTags, type Pin, type Tag } from './boards'

const find = (b: keyof typeof BOARDS, label: string): Pin => {
  const p = BOARDS[b].pins.find((x) => x.label === label)
  if (!p) throw new Error(label)
  return p
}

describe('boards', () => {
  it('has the expected pin counts', () => {
    expect(BOARDS.esp32.pins).toHaveLength(38)
    expect(BOARDS.pico.pins).toHaveLength(40)
    expect(BOARDS.bluepill.pins).toHaveLength(40)
  })
  it('has unique (side,row) slots', () => {
    for (const b of Object.values(BOARDS)) {
      expect(new Set(b.pins.map((p) => `${p.side}${p.row}`)).size).toBe(b.pins.length)
    }
  })
})

describe('ESP32', () => {
  it('flags the strapping GPIOs, UART0 and flash pins as warnings', () => {
    const warn = BOARDS.esp32.pins.filter((p) => p.warnings.some((w) => w.level === 'warn')).map((p) => p.label.replace(/.*\((GPIO\d+)\)/, '$1'))
    expect(warn.sort()).toEqual(['GPIO0', 'GPIO1', 'GPIO10', 'GPIO11', 'GPIO12', 'GPIO15', 'GPIO2', 'GPIO3', 'GPIO5', 'GPIO6', 'GPIO7', 'GPIO8', 'GPIO9'].sort())
  })
  it('knows ADC1/ADC2, DAC, touch and input-only pins', () => {
    expect(find('esp32', 'GPIO34').signals).toContain('ADC1_CH6')
    expect(find('esp32', 'GPIO34').signals).not.toContain('LEDC PWM')
    expect(find('esp32', 'GPIO25').signals).toEqual(expect.arrayContaining(['DAC1', 'ADC2_CH8']))
    expect(find('esp32', 'GPIO27').signals).toContain('TOUCH7')
    expect(find('esp32', 'GPIO21').signals).toContain('I2C0 SDA (default)')
    expect(find('esp32', 'GPIO23').signals).toContain('VSPI MOSI')
  })
})

describe('RP2040 Pico', () => {
  it('derives the function mux from the GPIO number', () => {
    const gp4 = find('pico', 'GP4')
    expect(gp4.signals).toEqual(expect.arrayContaining(['SPI0 RX', 'UART1 TX', 'I2C0 SDA', 'PWM2 A']))
    const gp9 = find('pico', 'GP9')
    expect(gp9.signals).toEqual(expect.arrayContaining(['SPI1 CSn', 'UART1 RX', 'I2C0 SCL', 'PWM4 B']))
    const gp16 = find('pico', 'GP16')
    expect(gp16.signals).toEqual(expect.arrayContaining(['SPI0 RX', 'UART0 TX', 'I2C0 SDA', 'PWM0 A']))
  })
  it('puts ADC on GP26-GP28 and numbers physical pins like the datasheet', () => {
    expect(find('pico', 'GP26').signals).toContain('ADC0')
    expect(find('pico', 'GP28').signals).toContain('ADC2')
    expect(find('pico', 'GP15').signals.some((s) => s.startsWith('ADC'))).toBe(false)
    expect(find('pico', 'GP0').num).toBe(1)
    expect(find('pico', 'GP22').num).toBe(29)
    expect(find('pico', 'VBUS').num).toBe(40)
    expect(find('pico', 'VBUS')).toMatchObject({ side: 'R', row: 0 })
    expect(find('pico', 'VSYS')).toMatchObject({ side: 'R', row: 1 })
  })
})

describe('Blue Pill', () => {
  it('maps the classic peripherals', () => {
    expect(find('bluepill', 'PA9').signals).toEqual(expect.arrayContaining(['USART1_TX', 'TIM1_CH2']))
    expect(find('bluepill', 'PB6').signals).toContain('I2C1_SCL')
    expect(find('bluepill', 'PB15').signals).toContain('SPI2_MOSI')
    expect(find('bluepill', 'PA0').signals).toContain('ADC1_IN0')
  })
  it('warns about debug-port and LED pins', () => {
    for (const l of ['PA15', 'PB3', 'PB4', 'PC13']) expect(pinTags(find('bluepill', l)).has('warn')).toBe(true)
    expect(pinTags(find('bluepill', 'PA5')).has('warn')).toBe(false)
  })
})

describe('matchPin', () => {
  const none = new Set<Tag>()
  it('matches by tag (any-of) and by free text', () => {
    const adc = BOARDS.esp32.pins.filter((p) => matchPin(p, new Set<Tag>(['adc']), ''))
    expect(adc).toHaveLength(16)
    expect(adc.every((p) => p.signals.some((s) => s.startsWith('ADC')))).toBe(true)
    expect(matchPin(find('pico', 'GP4'), none, 'i2c0 sda')).toBe(true)
    expect(matchPin(find('pico', 'GP4'), none, 'uart0')).toBe(false)
    expect(matchPin(find('pico', 'GP4'), new Set<Tag>(['spi', 'adc']), '')).toBe(true)
    expect(matchPin(find('pico', 'GP4'), new Set<Tag>(['adc']), '')).toBe(false)
  })
  it('finds pins by physical number', () => {
    expect(matchPin(find('pico', 'GP22'), none, 'pin29')).toBe(true)
  })
})
