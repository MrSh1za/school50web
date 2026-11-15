(() => {
  const desktopQuery = window.matchMedia('(min-width: 64rem)');

  function onMediaChange(query, callback) {
    if (query.addEventListener) query.addEventListener('change', callback);
    else query.addListener(callback);
  }

  function todayIso() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function initMegaMenu() {
    const links = document.querySelectorAll('.mainnav__link[data-mega]');
    const buttons = [];

    function closePanel(button) {
      button.setAttribute('aria-expanded', 'false');
      document.getElementById(button.getAttribute('aria-controls')).hidden = true;
    }

    function closeAll(except) {
      buttons.forEach((button) => {
        if (button !== except) closePanel(button);
      });
    }

    links.forEach((link) => {
      const panel = document.getElementById(link.dataset.mega);
      if (!panel) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = link.className;
      button.textContent = link.textContent;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', panel.id);
      if (link.hasAttribute('aria-current')) button.setAttribute('aria-current', 'true');
      link.replaceWith(button);
      buttons.push(button);

      button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        closeAll(button);
        button.setAttribute('aria-expanded', String(!isOpen));
        panel.hidden = isOpen;
      });

      const item = button.parentElement;
      item.addEventListener('focusout', (event) => {
        if (event.relatedTarget && !item.contains(event.relatedTarget)) closePanel(button);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
          closePanel(button);
          button.focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.mainnav__item')) closeAll();
    });
    onMediaChange(desktopQuery, () => closeAll());
  }

  function initMobileMenu() {
    const opener = document.querySelector('[data-menu-open]');
    const panel = document.getElementById('mobilenav');
    if (!opener || !panel) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = opener.className;
    button.append(...opener.childNodes);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panel.id);
    opener.replaceWith(button);

    const closeButton = panel.querySelector('[data-menu-close]');

    function focusableItems() {
      return Array.from(panel.querySelectorAll('a[href], button, summary')).filter(
        (element) => element.offsetParent !== null,
      );
    }

    function open() {
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
      closeButton.focus();
    }

    function close(restoreFocus) {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-open');
      if (restoreFocus) button.focus();
    }

    button.addEventListener('click', open);
    closeButton.addEventListener('click', () => close(true));

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close(true);
      if (event.key !== 'Tab') return;

      const items = focusableItems();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    onMediaChange(desktopQuery, () => {
      if (desktopQuery.matches && !panel.hidden) close(false);
    });
  }

  function initAlertBar() {
    const bar = document.querySelector('[data-alert]');
    if (!bar) return;

    const storageKey = `alert-hidden:${bar.dataset.alert}`;
    const isExpired = bar.dataset.until && bar.dataset.until < todayIso();
    if (isExpired || readStorage(storageKey) === '1') {
      bar.remove();
      return;
    }

    const closeButton = bar.querySelector('[data-alert-close]');
    if (!closeButton) return;

    closeButton.hidden = false;
    closeButton.addEventListener('click', () => {
      writeStorage(storageKey, '1');
      bar.remove();
      document.getElementById('zmist').focus();
    });
  }

  function initLightbox() {
    const links = Array.from(document.querySelectorAll('a[data-lightbox]'));
    if (!links.length || typeof HTMLDialogElement !== 'function') return;

    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Перегляд зображення');
    dialog.innerHTML = `
      <div class="lightbox__frame">
        <picture>
          <source type="image/webp">
          <img alt="">
        </picture>
        <p class="lightbox__caption"></p>
      </div>
      <div class="lightbox__bar">
        <button type="button" class="lightbox__btn" data-step="-1">‹ Попереднє</button>
        <span class="lightbox__count" aria-live="polite"></span>
        <button type="button" class="lightbox__btn" data-step="1">Наступне ›</button>
        <button type="button" class="lightbox__btn lightbox__close">Закрити</button>
      </div>
    `;
    document.body.append(dialog);

    const source = dialog.querySelector('source');
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('.lightbox__caption');
    const counter = dialog.querySelector('.lightbox__count');
    const stepButtons = dialog.querySelectorAll('[data-step]');
    let group = [];
    let index = 0;

    function show(position) {
      index = (position + group.length) % group.length;
      const link = group[index];
      const preview = link.querySelector('img');
      source.srcset = link.dataset.webp || '';
      image.src = link.href;
      image.alt = preview ? preview.alt : '';
      caption.textContent = link.dataset.caption || '';
      counter.textContent = group.length > 1 ? `${index + 1} з ${group.length}` : '';
      stepButtons.forEach((stepButton) => {
        stepButton.hidden = group.length < 2;
      });
    }

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        const name = link.dataset.lightbox;
        group = name ? links.filter((item) => item.dataset.lightbox === name) : [link];
        show(group.indexOf(link));
        dialog.showModal();
      });
    });

    dialog.addEventListener('click', (event) => {
      const target = event.target;
      if (target === dialog || target.classList.contains('lightbox__close')) dialog.close();
      const stepButton = target.closest('[data-step]');
      if (stepButton) show(index + Number(stepButton.dataset.step));
    });

    dialog.addEventListener('keydown', (event) => {
      if (group.length < 2) return;
      if (event.key === 'ArrowRight') show(index + 1);
      if (event.key === 'ArrowLeft') show(index - 1);
    });
  }

  initMegaMenu();
  initMobileMenu();
  initAlertBar();
  initLightbox();
})();
