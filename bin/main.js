var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { CodeEditor, Preview, SignalRenderer, UserInterface } from "./automation.js";
import { examples } from "./examples.js";
import { Boot, preloadImagesOfCssFile } from "./lib/boot.js";
import { HTML } from "./lib/dom.js";
const showProgress = (() => {
    const progress = document.querySelector("svg.preloader");
    window.onerror = () => progress.classList.add("error");
    window.onunhandledrejection = () => progress.classList.add("error");
    return (percentage) => progress.style.setProperty("--percentage", percentage.toFixed(2));
})();
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.debug("booting...");
    const boot = new Boot();
    boot.addObserver(boot => showProgress(boot.normalizedPercentage()));
    boot.registerProcess(preloadImagesOfCssFile("./bin/main.css"));
    yield boot.waitForCompletion();
    const signalRenderer = new SignalRenderer();
    const codeEditor = new CodeEditor(HTML.query('textarea'), HTML.query('.error-message'));
    const preview = new Preview(HTML.query('canvas'));
    const userInterface = new UserInterface(HTML.query('.settings'), preview, codeEditor, signalRenderer);
    signalRenderer.renderer.addObserver(buffer => preview.setBuffer(buffer));
    signalRenderer.error.addObserver(message => codeEditor.showMessage(message));
    codeEditor.compiler.addObserver(func => signalRenderer.update(func));
    codeEditor.compile();
    const exampleButtons = HTML.query('.examples');
    examples.forEach((example, index) => {
        const button = HTML.create('button', { textContent: example.name });
        button.addEventListener('click', () => userInterface.setFormat(example));
        exampleButtons.appendChild(button);
    });
    userInterface.setFormat(examples[0]);
    document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
    document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
    const resize = () => {
        document.body.style.height = `${window.innerHeight}px`;
        preview.resize();
    };
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(() => {
        document.querySelectorAll("body svg.preloader").forEach(element => element.remove());
        document.querySelectorAll("body main").forEach(element => element.classList.remove("invisible"));
    });
    console.debug("boot complete.");
}))();
//# sourceMappingURL=main.js.map