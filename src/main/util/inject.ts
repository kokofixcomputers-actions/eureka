import log from './console';

type MixinMethodWrapper<T extends ((...args: any) => any)> =
    (originalMethod: T, ...args: Parameters<T>) => ReturnType<T>;

type MixinDescriptor<T> = {
    [K in keyof T]?:
    T[K] extends ((...args: any) => any)
    ? MixinMethodWrapper<T[K]>
    : T[K];
} & {
    [key: string]: any;
};

class MixinApplicator {
    /**
     * Apply mixins to an existing instance with type-safe method wrapping
     * @param instance The target instance to apply mixins to
     * @param mixinDescriptor Methods and properties to mix in
     * @returns The modified instance
     */
    static applyTo<T extends object> (
        instance: T,
        mixinDescriptor: MixinDescriptor<T>
    ): T {
        // Store original methods and properties
        const originalDescriptors: Record<string, string> = {};

        Object.keys(mixinDescriptor).forEach(key => {
            // Check if the key exists on the original object
            if (key in instance) {
                // Store the original property/method descriptor
                originalDescriptors[key] = key;

                // If it's a method, wrap it
                if (typeof (instance as any)[key] === 'function') {
                    const originalMethod = (instance as any)[key];

                    // Replace with wrapped method
                    (instance as any)[key] = function (
                        ...args: any[]
                    ) {
                        // Call the mixin method, passing original method
                        return (mixinDescriptor[key] as (...args: any[]) => any).call(
                            this,
                            originalMethod.bind(this),
                            ...args
                        );
                    };
                } else {
                    // For non-method properties, simply replace
                    (instance as any)[key] = mixinDescriptor[key];
                }
            } else {
                // For completely new properties/methods
                Object.defineProperty(instance, key, {
                    value: mixinDescriptor[key],
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
            }
        });

        // Add revert method
        Object.defineProperty(instance, 'revertMixins', {
            value: function () {
                Object.keys(originalDescriptors).forEach(key => {
                    Object.defineProperty(this, key, originalDescriptors[key]);
                });
                delete this.revertMixins;
            },
            writable: true,
            configurable: true,
            enumerable: false
        });

        return instance;
    }
}


export { MixinApplicator };
