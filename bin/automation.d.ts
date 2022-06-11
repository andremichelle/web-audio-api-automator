import { ObservableImpl, ObservableValue, ObservableValueImpl } from "./lib/common.js";
export interface Format {
    name: string;
    start: number;
    end: number;
    duration: number;
    min: number;
    max: number;
    exponential: boolean;
    code: string;
}
export declare class SignalRenderer {
    readonly renderer: ObservableImpl<AudioBuffer>;
    readonly error: ObservableImpl<string>;
    readonly duration: ObservableValueImpl<number>;
    private func;
    private rendering;
    private hasChanges;
    constructor();
    update(func: Function): void;
    render(): Promise<AudioBuffer>;
}
export declare class Preview {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    readonly start: ObservableValue<number>;
    readonly end: ObservableValue<number>;
    readonly min: ObservableValue<number>;
    readonly max: ObservableValue<number>;
    readonly exponential: ObservableValue<boolean>;
    private buffer;
    private width;
    private height;
    constructor(canvas: HTMLCanvasElement);
    redraw: () => void;
    resize(): void;
    setBuffer(buffer: AudioBuffer): void;
    plot(values: Float32Array, x0: number, x1: number, y0: number, y1: number, s0: number, s1: number, minValue: number, maxValue: number): void;
}
export declare class UserInterface {
    readonly element: HTMLElement;
    readonly preview: Preview;
    readonly codeEditor: CodeEditor;
    readonly signalRenderer: SignalRenderer;
    constructor(element: HTMLElement, preview: Preview, codeEditor: CodeEditor, signalRenderer: SignalRenderer);
    setFormat(format: Format): void;
}
export declare class CodeEditor {
    readonly element: HTMLTextAreaElement;
    readonly errorField: HTMLElement;
    readonly compiler: ObservableImpl<Function>;
    constructor(element: HTMLTextAreaElement, errorField: HTMLElement);
    setCode(code: string): void;
    compile(): void;
    showMessage(message: string | ''): void;
}
