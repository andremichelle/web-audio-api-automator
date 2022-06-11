import {ObservableImpl, Option, Options} from "./lib/common.js"

export class SignalRenderer {
    readonly renderer: ObservableImpl<AudioBuffer> = new ObservableImpl<AudioBuffer>()
    readonly error: ObservableImpl<string> = new ObservableImpl<string>()

    private func: Option<Function> = Options.None
    private rendering: boolean = false

    update(func: Function): void {
        if (this.rendering) {
            this.func = Options.valueOf(func)
            return
        }
        this.rendering = true
        this.func = Options.None
        this.render(func)
            .then((buffer: AudioBuffer) => {
                this.rendering = false
                if (this.func.nonEmpty()) {
                    const func = this.func.get()
                    this.func = Options.None
                    this.update(func)
                } else {
                    console.debug('successfully rendered.')
                    this.renderer.notify(buffer)
                }
            }).catch(e => {
            this.rendering = false
            if (e instanceof Error) {
                this.error.notify(e.message)
            } else {
                throw e
            }
        })
    }

    async render(func: Function): Promise<AudioBuffer> {
        console.debug('start rendering...')
        const sampleRate = 10000
        const seconds = 1.0
        const length = Math.ceil(sampleRate * seconds)
        const context = new OfflineAudioContext(1, length, sampleRate)
        const constantSource = context.createConstantSource()
        constantSource.offset.value = 0.0
        try {
            func(constantSource.offset)
        } catch (e) {
            return Promise.reject(e)
        }
        constantSource.start()
        constantSource.connect(context.destination)
        return context.startRendering()
    }
}

export class Preview {
    readonly context: CanvasRenderingContext2D = this.canvas.getContext('2d')

    // TODO
    // time [from, to]
    // value [from, to]
    // mapping [linear, exponential]

    private buffer: Option<AudioBuffer> = Options.None

    private width: number
    private height: number

    constructor(readonly canvas: HTMLCanvasElement) {
    }

    redraw() {
        this.buffer.ifPresent(buffer => {
            const values = buffer.getChannelData(0)
            this.context.clearRect(0, 0, this.width, this.height)
            this.context.fillStyle = 'white'
            this.plot(values, 0, this.width, 0.0, this.height, values.length * 0.2, values.length * 0.7, 1.0, 0.0)
        })
    }

    resize(): void {
        this.width = this.canvas.clientWidth | 0
        this.height = this.canvas.clientHeight | 0
        this.canvas.width = this.width
        this.canvas.height = this.height
        this.redraw()
    }

    setBuffer(buffer: AudioBuffer) {
        this.buffer = Options.valueOf(buffer)
        this.buffer.ifPresent(() => this.redraw())
    }

    plot(values: Float32Array,
         x0: number, x1: number,
         y0: number, y1: number,
         s0: number, s1: number,
         minValue: number, maxValue: number) {
        const samplesEachPixel = (s1 - s0) / (x1 - x0)
        const scale = (y1 - y0 - 1) / (maxValue - minValue)
        const pixelOverFlow = x0 - Math.floor(x0)
        let from = s0 - pixelOverFlow * samplesEachPixel
        let indexFrom = from | 0
        let min = Number.MAX_VALUE
        let max = -Number.MAX_VALUE
        for (let x = x0 | 0; x < x1; ++x) {
            const to = from + samplesEachPixel
            const indexTo = to | 0
            while (indexFrom < indexTo) {
                const value = values[indexFrom++]
                min = Math.max(min, value)
                max = Math.min(max, value)
            }
            const yMin = y0 + Math.floor((min - minValue) * scale)
            const yMax = y0 + Math.floor((max - minValue) * scale)
            this.context.fillRect(x, yMin, 1, yMin === yMax ? 1 : yMax - yMin)
            const tmp = max
            max = min
            min = tmp
            from = to
            indexFrom = indexTo
        }
    }
}

export class CodeEditor {
    readonly compiler: ObservableImpl<Function> = new ObservableImpl<Function>()

    constructor(readonly element: HTMLTextAreaElement, readonly errorField: HTMLElement) {
        this.element.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.altKey && event.key === 'Enter') {
                this.compile()
            }
        })
    }

    compile(): void {
        console.debug('compile')
        this.errorField.textContent = ''
        let f = null
        try {
            f = Function('param', this.element.value)
        } catch (e) {
            if (e instanceof Error) {
                this.showMessage(e.name)
            } else {
                throw new e
            }
        }
        if (f !== null) {
            this.compiler.notify(f)
        }
    }

    showMessage(message: string | ''): void {
        this.errorField.textContent = message
    }
}