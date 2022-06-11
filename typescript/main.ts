import {CodeEditor, Format, Preview, SignalRenderer, UserInterface} from "./automation.js"
import {examples} from "./examples.js"
import {Boot, preloadImagesOfCssFile} from "./lib/boot.js"
import {HTML} from "./lib/dom.js"

const showProgress = (() => {
    const progress: SVGSVGElement = document.querySelector("svg.preloader")
    window.onerror = () => progress.classList.add("error")
    window.onunhandledrejection = () => progress.classList.add("error")
    return (percentage: number) => progress.style.setProperty("--percentage", percentage.toFixed(2))
})();

(async () => {
    console.debug("booting...")

    // --- BOOT STARTS ---

    const boot = new Boot()
    boot.addObserver(boot => showProgress(boot.normalizedPercentage()))
    boot.registerProcess(preloadImagesOfCssFile("./bin/main.css"))
    await boot.waitForCompletion()

    // --- BOOT ENDS ---

    const signalRenderer = new SignalRenderer()
    const codeEditor = new CodeEditor(HTML.query('textarea'), HTML.query('.error-message'))
    const preview = new Preview(HTML.query('canvas'))
    const userInterface = new UserInterface(HTML.query('.settings'), preview, codeEditor, signalRenderer)
    signalRenderer.renderer.addObserver(buffer => preview.setBuffer(buffer))
    signalRenderer.error.addObserver(message => codeEditor.showMessage(message))
    codeEditor.compiler.addObserver(func => signalRenderer.update(func))
    codeEditor.compile()

    const exampleButtons = HTML.query('.examples')
    examples.forEach((example: Format, index: number) => {
        const button = HTML.create('button', {textContent: example.name})
        button.addEventListener('click', () => userInterface.setFormat(example))
        exampleButtons.appendChild(button)
    })

    // prevent dragging entire document on mobile
    document.addEventListener('touchmove', (event: TouchEvent) => event.preventDefault(), {passive: false})
    document.addEventListener('dblclick', (event: Event) => event.preventDefault(), {passive: false})
    const resize = () => {
        document.body.style.height = `${window.innerHeight}px`
        preview.resize()
    }
    window.addEventListener("resize", resize)
    resize()
    requestAnimationFrame(() => {
        document.querySelectorAll("body svg.preloader").forEach(element => element.remove())
        document.querySelectorAll("body main").forEach(element => element.classList.remove("invisible"))
    })
    console.debug("boot complete.")
})()