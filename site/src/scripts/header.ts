// ヘッダーの開閉: PCの「記事を読む」メニューと、スマホの引き出し(drawer)。
// 外側クリック・Escで閉じる。

function bindToggle(button: HTMLElement, panel: HTMLElement, onChange?: (open: boolean) => void) {
  const set = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    onChange?.(open);
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    set(button.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target as Node)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      set(false);
      button.focus();
    }
  });
}

document.querySelectorAll<HTMLElement>('[data-menu]').forEach((menu) => {
  const button = menu.querySelector<HTMLElement>('button[aria-controls]')!;
  const panel = document.getElementById(button.getAttribute('aria-controls')!)!;
  bindToggle(button, panel);
});

const drawerButton = document.querySelector<HTMLElement>('[data-drawer-toggle]');
const drawer = document.getElementById('site-drawer');
if (drawerButton && drawer) {
  bindToggle(drawerButton, drawer, (open) => document.documentElement.classList.toggle('drawer-open', open));
}
