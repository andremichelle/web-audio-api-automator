import {
    NumericStepper,
    ObservableImpl,
    ObservableValue,
    ObservableValueImpl,
    Option,
    Options,
    PrintMapping
} from "./lib/common.js"
import {UIControllerLayout} from "./lib/controls.js"
import {HTML} from "./lib/dom.js"
import {Exp, Linear} from "./lib/mapping.js"

export class SignalRenderer {
    readonly renderer: ObservableImpl<AudioBuffer> = new ObservableImpl<AudioBuffer>()
    readonly error: ObservableImpl<string> = new ObservableImpl<string>()
    readonly duration: ObservableValueImpl<number> = new ObservableValueImpl<number>(1000.0)

    private func: Option<Function> = Options.None
    private rendering: boolean = false
    private hasChanges: boolean = false

    constructor() {
        this.duration.addObserver(() => this.func.ifPresent(func => this.update(func)), false)
    }

    update(func: Function): void {
        this.func = Options.valueOf(func)
        if (this.rendering) {
            this.hasChanges = true
            return
        }
        this.rendering = true
        this.hasChanges = false
        this.render(func)
            .then((buffer: AudioBuffer) => {
                this.rendering = false
                if (this.hasChanges) {
                    this.hasChanges = false
                    this.update(this.func.get())
                } else {
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
        const sampleRate = 10000
        const seconds = this.duration.get() / 1000.0
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

    readonly start: ObservableValue<number> = new ObservableValueImpl<number>(0.0)
    readonly end: ObservableValue<number> = new ObservableValueImpl<number>(1000.0)
    readonly min: ObservableValue<number> = new ObservableValueImpl<number>(0.0)
    readonly max: ObservableValue<number> = new ObservableValueImpl<number>(1.0)
    readonly exponential: ObservableValue<boolean> = new ObservableValueImpl<boolean>(false)

    private buffer: Option<AudioBuffer> = Options.None

    private width: number
    private height: number

    constructor(readonly canvas: HTMLCanvasElement) {
        this.start.addObserver(this.redraw, false)
        this.end.addObserver(this.redraw, false)
        this.min.addObserver(this.redraw, false)
        this.max.addObserver(this.redraw, false)
        this.exponential.addObserver(this.redraw, false)
    }

    redraw = () => {
        this.buffer.ifPresent(buffer => {
            const values = buffer.getChannelData(0)
            this.context.clearRect(0, 0, this.width, this.height)
            this.context.fillStyle = 'white'
            const s0 = this.start.get() / 1000.0 * buffer.sampleRate
            const s1 = this.end.get() / 1000.0 * buffer.sampleRate
            const mapping = this.exponential.get()
                ? new Exp(this.min.get(), this.max.get())
                : new Linear(this.min.get(), this.max.get())
            this.plot(values.map(x => mapping.x(x)), 0, this.width, this.height - 1, 1, s0, s1, 0.0, 1.0)
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

export class UserInterface {
    constructor(readonly element: HTMLElement, preview: Preview, codeEditor: CodeEditor, signalRenderer: SignalRenderer) {
        const PrintMappingTime = PrintMapping.float(0, '', 'ms')
        const PrintMappingValue = PrintMapping.float(2, '', '')
        const layout = new UIControllerLayout()
        layout.createTitle('Time Range')
        layout.createNumericStepper('start', PrintMappingTime, NumericStepper.Integer).with(preview.start)
        layout.createNumericStepper('end', PrintMappingTime, NumericStepper.Integer).with(preview.end)
        layout.createNumericStepper('duration', PrintMappingTime, NumericStepper.Integer).with(signalRenderer.duration)
        layout.createTitle('Value Range')
        layout.createNumericStepper('min', PrintMappingValue, NumericStepper.Hundredth).with(preview.min)
        layout.createNumericStepper('max', PrintMappingValue, NumericStepper.Hundredth).with(preview.max)
        layout.createCheckbox('linear・exp').with(preview.exponential)
        const compileButton = HTML.create('button', {textContent: 'compile (alt+enter)'})
        compileButton.addEventListener('click', () => codeEditor.compile())
        element.appendChild(layout.element())
        element.appendChild(compileButton)
    }
}

export class CodeEditor {
    readonly compiler: ObservableImpl<Function> = new ObservableImpl<Function>()

    constructor(readonly element: HTMLTextAreaElement, readonly errorField: HTMLElement) {
        window.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.altKey && event.key === 'Enter') {
                event.preventDefault()
                this.compile()
            }
        })
    }

    compile(): void {
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