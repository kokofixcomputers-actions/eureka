/* eslint-disable */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import globalCss from './style.css';
import styles, { stylesheet } from './style.module.css';

function Counter () {
    const [getCount, setCount] = createSignal(0);
    const handleAmazing = () => {
        setCount((count) => count + 1);
    };
    return (
        <div />
    );
}

// Render(Counter, panel.body);
