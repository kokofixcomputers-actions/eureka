import formatMessage from 'format-message';
import en from '../../../locales/en.json';
import zhCn from '../../../locales/zh-cn.json';

/**
 * Set the locale for the formatMessage
 * @param locale The locale to set
 */
export function setLocale (locale = 'en') {
    formatMessage.setup({
        translations: {
            en,
            'zh-cn': zhCn
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
