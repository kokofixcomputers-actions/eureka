import formatMessage from 'format-message';
import en from '../../../locales/en.json';
import zhCn from '../../../locales/zh-cn.json';

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
