function consoleOutput (prefix: string) {
    const style = {
        left: 'background-color: #479CFF; border-radius: 0.5rem 0 0 0.5rem; padding-left: 0.5rem; color: white;',
        right: 'background-color: #FED64A; border-radius: 0 0.5rem 0.5rem 0; padding-right: 0.5rem; padding-left: 0.25rem; margin-right: 0.25rem; color: white;',
        text: '',
    };
    return [`%c💡 %c${prefix}%c`, style.left, style.right, style.text];
}

export function createConsole (prefix: string) {
    return {
        ...console,
        log: console.log.bind(console, ...consoleOutput(prefix)),
        info: console.info.bind(console, ...consoleOutput(prefix)),
        warn: console.warn.bind(console, ...consoleOutput(prefix)),
        error: console.error.bind(console, ...consoleOutput(prefix))
    };
}

export default createConsole('Eureka');
