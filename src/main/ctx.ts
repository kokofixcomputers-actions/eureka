import { version } from '../../package.json';

export const eureka: EurekaContext = {
    declaredIds: [],
    idToURLMapping: new Map<string, string>(),
    version
};
