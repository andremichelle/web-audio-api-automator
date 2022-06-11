var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { NumericStepper, ObservableImpl, ObservableValueImpl, Options, PrintMapping, Waiting } from "./lib/common.js";
import { UIControllerLayout } from "./lib/controls.js";
import { HTML } from "./lib/dom.js";
import { Exp, Linear } from "./lib/mapping.js";
export class SignalRenderer {
    constructor() {
        this.renderer = new ObservableImpl();
        this.error = new ObservableImpl();
        this.duration = new ObservableValueImpl(1000.0);
        this.func = Options.None;
        this.rendering = false;
        this.hasChanges = false;
        this.duration.addObserver(() => this.func.ifPresent(func => this.update(func)), false);
    }
    update(func) {
        this.func = Options.valueOf(func);
        if (this.rendering) {
            this.hasChanges = true;
            return;
        }
        this.rendering = true;
        this.hasChanges = false;
        Waiting.forFrame().then(() => this.render()
            .then((buffer) => {
            this.rendering = false;
            if (this.hasChanges) {
                this.hasChanges = false;
                this.update(this.func.get());
            }
            else {
                this.renderer.notify(buffer);
            }
        }).catch(e => {
            this.rendering = false;
            if (e instanceof Error) {
                this.error.notify(e.message);
            }
            else {
                throw e;
            }
        }));
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.func.isEmpty()) {
                return Promise.reject(new Error('No valid code compiled'));
            }
            const func = this.func.get();
            const sampleRate = 10000;
            const seconds = this.duration.get() / 1000.0;
            const length = Math.ceil(sampleRate * seconds);
            const context = new OfflineAudioContext(1, length, sampleRate);
            const constantSource = context.createConstantSource();
            constantSource.offset.value = 0.0;
            try {
                func(constantSource.offset);
            }
            catch (e) {
                return Promise.reject(e);
            }
            constantSource.start();
            constantSource.connect(context.destination);
            return context.startRendering();
        });
    }
}
export class Preview {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.start = new ObservableValueImpl(0.0);
        this.end = new ObservableValueImpl(1000.0);
        this.min = new ObservableValueImpl(0.0);
        this.max = new ObservableValueImpl(1.0);
        this.exponential = new ObservableValueImpl(false);
        this.buffer = Options.None;
        this.redraw = () => {
            this.buffer.ifPresent(buffer => {
                const values = buffer.getChannelData(0);
                this.context.clearRect(0, 0, this.width, this.height);
                this.context.fillStyle = 'white';
                const s0 = this.start.get() / 1000.0 * buffer.sampleRate;
                const s1 = this.end.get() / 1000.0 * buffer.sampleRate;
                const mapping = this.exponential.get()
                    ? new Exp(this.min.get(), this.max.get())
                    : new Linear(this.min.get(), this.max.get());
                this.plot(values.map(x => mapping.x(x)), 0, this.width, this.height - 1, 1, s0, s1, 0.0, 1.0);
            });
        };
        this.start.addObserver(this.redraw, false);
        this.end.addObserver(this.redraw, false);
        this.min.addObserver(this.redraw, false);
        this.max.addObserver(this.redraw, false);
        this.exponential.addObserver(this.redraw, false);
    }
    resize() {
        this.width = this.canvas.clientWidth | 0;
        this.height = this.canvas.clientHeight | 0;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.redraw();
    }
    setBuffer(buffer) {
        this.buffer = Options.valueOf(buffer);
        this.buffer.ifPresent(() => this.redraw());
    }
    plot(values, x0, x1, y0, y1, s0, s1, minValue, maxValue) {
        const samplesEachPixel = (s1 - s0) / (x1 - x0);
        const scale = (y1 - y0 - 1) / (maxValue - minValue);
        const pixelOverFlow = x0 - Math.floor(x0);
        let from = s0 - pixelOverFlow * samplesEachPixel;
        let indexFrom = from | 0;
        let min = Number.MAX_VALUE;
        let max = -Number.MAX_VALUE;
        for (let x = x0 | 0; x < x1; ++x) {
            const to = from + samplesEachPixel;
            const indexTo = to | 0;
            while (indexFrom < indexTo) {
                const value = values[indexFrom++];
                min = Math.max(min, value);
                max = Math.min(max, value);
            }
            const yMin = y0 + Math.floor((min - minValue) * scale);
            const yMax = y0 + Math.floor((max - minValue) * scale);
            this.context.fillRect(x, yMin, 1, yMin === yMax ? 1 : yMax - yMin);
            const tmp = max;
            max = min;
            min = tmp;
            from = to;
            indexFrom = indexTo;
        }
    }
}
export class UserInterface {
    constructor(element, preview, codeEditor, signalRenderer) {
        this.element = element;
        this.preview = preview;
        this.codeEditor = codeEditor;
        this.signalRenderer = signalRenderer;
        const PrintMappingTime = PrintMapping.float(0, '', 'ms');
        const PrintMappingValue = PrintMapping.float(2, '', '');
        const layout = new UIControllerLayout();
        layout.createTitle('Time Range');
        layout.createNumericStepper('start', PrintMappingTime, NumericStepper.Integer).with(preview.start);
        layout.createNumericStepper('end', PrintMappingTime, NumericStepper.Integer).with(preview.end);
        layout.createNumericStepper('duration', PrintMappingTime, NumericStepper.Integer).with(signalRenderer.duration);
        layout.createTitle('Value Range');
        layout.createNumericStepper('min', PrintMappingValue, NumericStepper.Hundredth).with(preview.min);
        layout.createNumericStepper('max', PrintMappingValue, NumericStepper.Hundredth).with(preview.max);
        layout.createCheckbox('linear・exp').with(preview.exponential);
        const compileButton = HTML.create('button', { textContent: 'compile (alt+enter)' });
        compileButton.addEventListener('click', () => codeEditor.compile());
        element.appendChild(layout.element());
        element.appendChild(compileButton);
    }
    setFormat(format) {
        this.preview.min.set(format.min);
        this.preview.max.set(format.max);
        this.preview.exponential.set(format.exponential);
        this.preview.start.set(format.start);
        this.preview.end.set(format.end);
        this.signalRenderer.duration.set(format.duration);
        this.codeEditor.setCode(format.code);
    }
}
export class CodeEditor {
    constructor(element, errorField) {
        this.element = element;
        this.errorField = errorField;
        this.compiler = new ObservableImpl();
        window.addEventListener('keydown', (event) => {
            if (event.altKey && event.key === 'Enter') {
                event.preventDefault();
                this.compile();
            }
        });
    }
    setCode(code) {
        this.element.value = code;
        this.compile();
    }
    compile() {
        this.errorField.textContent = '';
        let f = null;
        try {
            f = Function('param', this.element.value);
        }
        catch (e) {
            if (e instanceof Error) {
                this.showMessage(e.name);
            }
            else {
                throw new e;
            }
        }
        if (f !== null) {
            this.compiler.notify(f);
        }
    }
    showMessage(message) {
        this.errorField.textContent = message;
    }
}
//# sourceMappingURL=automation.js.map