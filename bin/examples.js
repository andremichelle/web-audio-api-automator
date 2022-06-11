export const examples = [
    {
        name: 'w3.org',
        min: 0.0,
        max: 1.0,
        start: 0.0,
        end: 1000.0,
        duration: 1000.0,
        exponential: false,
        code: '// https://www.w3.org/TR/webaudio/#example1-AudioParam\n' +
            'const curveLength = 44100\n' +
            'const curve = new Float32Array(curveLength)\n' +
            'for (let i = 0; i < curveLength; ++i) {\n' +
            '    curve[i] = Math.sin(Math.PI * i / curveLength)\n' +
            '}\n' +
            'const t0 = 0\n' +
            'const t1 = 0.1\n' +
            'const t2 = 0.2\n' +
            'const t3 = 0.3\n' +
            'const t4 = 0.325\n' +
            'const t5 = 0.5\n' +
            'const t6 = 0.6\n' +
            'const t7 = 0.7\n' +
            'const t8 = 1.0\n' +
            'const timeConstant = 0.1\n' +
            'param.setValueAtTime(0.2, t0)\n' +
            'param.setValueAtTime(0.3, t1)\n' +
            'param.setValueAtTime(0.4, t2)\n' +
            'param.linearRampToValueAtTime(1, t3)\n' +
            'param.linearRampToValueAtTime(0.8, t4)\n' +
            'param.setTargetAtTime(.5, t4, timeConstant)\n' +
            'param.setValueAtTime(0.5 + (0.8 - 0.5) * Math.exp(-(t5 - t4) / timeConstant), t5)\n' +
            'param.exponentialRampToValueAtTime(0.75, t6)\n' +
            'param.exponentialRampToValueAtTime(0.01, t7)\n' +
            'param.setValueCurveAtTime(curve, t7, t8 - t7)\n' +
            'param.setValueAtTime(1.0, t0)'
    },
    {
        name: 'lfo',
        min: 0.0,
        max: 1.0,
        start: 0.0,
        end: 1000.0,
        duration: 1000.0,
        exponential: false,
        code: '// LFO\n' +
            'const resolution = 1000\n' +
            'const curve = new Float32Array(resolution)\n' +
            'for (let i = 0; i < resolution; ++i) {\n' +
            '    curve[i] = Math.sin(i / resolution * Math.PI * 2.0) * 0.5 + 0.5\n' +
            '}\n' +
            '// this need to be repeated infinitely\n' +
            'param.setValueCurveAtTime(curve, 0.0, 0.5)\n' +
            'param.setValueCurveAtTime(curve, 0.5, 0.5)'
    },
    {
        name: 'adsr (linear)',
        min: 0.0,
        max: 1.0,
        start: 0.0,
        end: 1000.0,
        duration: 1000.0,
        exponential: false,
        code: 'const sustain = 0.4\n' +
            'param.setValueAtTime(0.0, 0.0) // \n' +
            'param.linearRampToValueAtTime(1.0, 0.2) // attack\n' +
            'param.linearRampToValueAtTime(sustain, 0.4) // decay\n' +
            'param.setValueAtTime(sustain, 0.7) // sustain\n' +
            'param.linearRampToValueAtTime(0.0, 1.0) // release'
    },
    {
        name: 'adsr (timeConstant)',
        min: 0.0,
        max: 1.0,
        start: 0.0,
        end: 1000.0,
        duration: 1000.0,
        exponential: false,
        code: 'const setTargetWithin = ((param, startValue, targetValue, startTime, endTime, timeConstant) => {\n' +
            '    const solve = (v0, v, t0, t, tc) => {\n' +
            '        const tmp = Math.exp((t0 - t) / tc)\n' +
            '        return (tmp * v0 - v) / (tmp - 1.0)\n' +
            '    }\n' +
            '    return (param, startValue, targetValue, startTime, endTime, timeConstant) => {\n' +
            '        param.setTargetAtTime(solve(startValue, targetValue, startTime, endTime, timeConstant), startTime, timeConstant)\n' +
            '        param.setValueAtTime(targetValue, endTime)\n' +
            '    };\n' +
            '})()\n' +
            '\n' +
            'const a = 0.1\n' +
            'const d = 0.25\n' +
            'const s = 0.5\n' +
            'const r = 0.25\n' +
            'setTargetWithin(param, 0.0, 1.0, 0.0, a, 0.1)\n' +
            'setTargetWithin(param, 1.0, s, a, a + d, 0.1)\n' +
            'setTargetWithin(param, s, 0.0, 1.0 - r, 1.0, 0.1)'
    }
];
//# sourceMappingURL=examples.js.map