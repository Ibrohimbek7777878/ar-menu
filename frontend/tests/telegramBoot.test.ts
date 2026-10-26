import test from 'node:test';
import assert from 'node:assert/strict';
import { initTelegramWebApp, triggerHaptic } from '../src/utils/telegramBoot.ts';


test('Telegram WebApp mavjud bo\'lmaganda (brauzerda) xatosiz ishlaydi', () => {
  // @ts-ignore
  global.window = {};
  assert.doesNotThrow(() => {
    initTelegramWebApp();
    triggerHaptic('light');
  });
});

test('Telegram WebApp mavjud bo\'lganda ready() va expand() chaqiriladi', () => {
  let readyCalled = false;
  let expandCalled = false;
  let headerColor = '';
  let bgColor = '';
  let hapticStyle = '';

  // @ts-ignore
  global.window = {
    location: { pathname: '/restaurant/', replace: () => {} },
    addEventListener: () => {},
    Telegram: {
      WebApp: {
        ready: () => { readyCalled = true; },
        expand: () => { expandCalled = true; },
        setHeaderColor: (c: string) => { headerColor = c; },
        setBackgroundColor: (c: string) => { bgColor = c; },
        BackButton: {
          isVisible: false,
          show: () => {},
          hide: () => {},
          onClick: () => {},
          offClick: () => {},
        },
        HapticFeedback: {
          impactOccurred: (style: any) => { hapticStyle = style; },
          notificationOccurred: () => {},
          selectionChanged: () => {},
        },
      },
    },
  };

  initTelegramWebApp();
  triggerHaptic('medium');

  assert.equal(readyCalled, true);
  assert.equal(expandCalled, true);
  assert.equal(headerColor, '#FFFFFF');
  assert.equal(bgColor, '#FAF7F2');
  assert.equal(hapticStyle, 'medium');
});
