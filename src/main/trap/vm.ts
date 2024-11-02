import log from '../util/console';

const MAX_LISTENING_MS = 30 * 1000;

/**
 * Trap to get Virtual Machine instance.
 * @return Callback promise. After that you could use window.eureka.vm to get the virtual machine.
 */
export async function getVMInstance (): Promise<DucktypedVM> {
    log.info('Listening bind function...');
    const oldBind = Function.prototype.bind;
    
    const vm = await new Promise<DucktypedVM>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            log.info('Cannot find vm instance, stop listening.');
            Function.prototype.bind = oldBind;
            reject();
        }, MAX_LISTENING_MS);

        Function.prototype.bind = function (...args) {
            if (Function.prototype.bind === oldBind) {
                return oldBind.apply(this, args);
            } else if (
                args[0] &&
                Object.prototype.hasOwnProperty.call(args[0], 'editingTarget') &&
                Object.prototype.hasOwnProperty.call(args[0], 'runtime')
            ) {
                log.info('VM detected!');
                Function.prototype.bind = oldBind;
                clearTimeout(timeoutId);
                resolve(args[0]);
                return oldBind.apply(this, args);
            }
            return oldBind.apply(this, args);
        };
    });
    return vm;
}
