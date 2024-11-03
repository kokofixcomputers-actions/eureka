import formatMessage from 'format-message';
import en from '../../../locales/en.json';

export function setLocale (locale = 'en') {
    formatMessage.setup({
        translations: {
            en
        },
        locale
    });
}

export default formatMessage.setup({
    translations: {
        en
    },
    locale: 'en'
});
