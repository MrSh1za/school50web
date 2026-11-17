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
    const dialog = document.getElementById('mobilenav');
    if (!opener || !dialog || typeof dialog.showModal !== 'function') return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = opener.className;
    button.append(...opener.childNodes);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', dialog.id);
    opener.replaceWith(button);

    button.addEventListener('click', () => {
      dialog.showModal();
      button.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-open');
    });

    dialog.addEventListener('close', () => {
      button.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('menu-open');
    });

    dialog.querySelector('[data-menu-close]').addEventListener('click', () => dialog.close());

    dialog.querySelectorAll('[data-submenu]').forEach((toggle) => {
      const submenu = document.getElementById(toggle.getAttribute('aria-controls'));
      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        submenu.hidden = isOpen;
      });
    });

    onMediaChange(desktopQuery, () => {
      if (desktopQuery.matches && dialog.open) dialog.close();
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

    function createElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    }

    function createButton(className, text, step) {
      const button = createElement('button', className, text);
      button.type = 'button';
      if (step) button.dataset.step = step;
      return button;
    }

    const dialog = createElement('dialog', 'lightbox');
    dialog.setAttribute('aria-label', 'Перегляд зображення');
    const frame = createElement('div', 'lightbox__frame');
    const picture = createElement('picture');
    const source = createElement('source');
    source.type = 'image/webp';
    const image = createElement('img');
    image.alt = '';
    const caption = createElement('p', 'lightbox__caption');
    const bar = createElement('div', 'lightbox__bar');
    const counter = createElement('span', 'lightbox__count');
    counter.setAttribute('aria-live', 'polite');
    const stepButtons = [
      createButton('lightbox__btn', '‹ Попереднє', '-1'),
      createButton('lightbox__btn', 'Наступне ›', '1'),
    ];
    const closeButton = createButton('lightbox__btn lightbox__close', 'Закрити');

    picture.append(source, image);
    frame.append(picture, caption);
    bar.append(stepButtons[0], counter, stepButtons[1], closeButton);
    dialog.append(frame, bar);
    document.body.append(dialog);
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
      if (target === dialog || target === closeButton) dialog.close();
      const stepButton = target.closest('[data-step]');
      if (stepButton) show(index + Number(stepButton.dataset.step));
    });

    dialog.addEventListener('keydown', (event) => {
      if (group.length < 2) return;
      if (event.key === 'ArrowRight') show(index + 1);
      if (event.key === 'ArrowLeft') show(index - 1);
    });
  }

  function initQuickSearch() {
    const forms = Array.from(document.querySelectorAll('[data-quick-search]'));
    const mainScript = document.querySelector('script[src$="assets/js/main.js"]');
    if (!forms.length || !mainScript || typeof Promise !== 'function') return;

    const LIMIT = 6;
    const base = mainScript.getAttribute('src').replace('assets/js/main.js', '');
    const files = ['search-index.js', 'search.js'].map((name) => `${base}assets/js/${name}`);
    let policy = null;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      policy = window.trustedTypes.createPolicy('quick-search', {
        createScriptURL: (url) => {
          if (files.indexOf(url) === -1) throw new TypeError('Script is not allowed');
          return url;
        },
      });
    }
    let loading = null;
    let prepared = null;

    function loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.onload = resolve;
        script.onerror = reject;
        script.src = policy ? policy.createScriptURL(url) : url;
        document.head.append(script);
      });
    }

    function loadEngine() {
      if (!loading) {
        const index = window.SEARCH_INDEX ? Promise.resolve() : loadScript(files[0]);
        loading = index
          .then(() => (window.SchoolSearch ? null : loadScript(files[1])))
          .then(() => {
            prepared = window.SchoolSearch.prepare(window.SEARCH_INDEX || []);
          });
      }
      return loading;
    }

    function resolveUrl(url) {
      return /^https?:/.test(url) ? url : base + url;
    }

    forms.forEach((form, number) => {
      const field = form.querySelector('input[type="search"]');
      const panel = document.createElement('div');
      panel.className = 'qsearch__panel';
      panel.id = `qsearch-panel-${number + 1}`;
      panel.hidden = true;
      const list = document.createElement('ul');
      list.className = 'qsearch__list';
      list.setAttribute('aria-label', 'Підказки пошуку');
      const allLink = document.createElement('a');
      allLink.className = 'qsearch__all';
      allLink.href = `${base}poshuk.html`;
      const status = document.createElement('p');
      status.className = 'visually-hidden';
      status.setAttribute('role', 'status');
      panel.append(list, allLink);
      form.append(panel, status);
      field.setAttribute('aria-controls', panel.id);
      let statusTimer = 0;

      function links() {
        return Array.from(panel.querySelectorAll('a'));
      }

      function close() {
        panel.hidden = true;
      }

      function suggestion(entry, query) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'qsearch__link';
        link.href = resolveUrl(entry.url);
        const title = document.createElement('span');
        title.className = 'qsearch__title';
        title.append(window.SchoolSearch.highlighted(entry.title, query));
        const meta = document.createElement('span');
        meta.className = 'qsearch__meta';
        const kind = entry.isDocument ? 'Документ' : 'Сторінка';
        meta.textContent = entry.section ? `${kind} · ${entry.section}` : kind;
        link.append(title, meta);
        item.append(link);
        return item;
      }

      function render() {
        const typed = field.value.trim();
        clearTimeout(statusTimer);
        if (typed.length < 2 || !prepared) {
          close();
          status.textContent = '';
          return;
        }
        const found = window.SchoolSearch.find(prepared, typed, LIMIT);
        const pages = found.results.filter((entry) => !entry.isDocument);
        const documents = found.results.filter((entry) => entry.isDocument);
        list.textContent = '';
        pages.concat(documents).forEach((entry) => list.append(suggestion(entry, found.query)));
        list.hidden = !found.results.length;
        allLink.href = `${base}poshuk.html?q=${encodeURIComponent(typed)}`;
        allLink.textContent = found.results.length
          ? `Усі результати за запитом «${typed}» →`
          : `Нічого не знайдено. Відкрити пошук «${typed}» →`;
        panel.hidden = false;
        statusTimer = setTimeout(() => {
          status.textContent = found.results.length
            ? `Підказок: ${found.results.length}. Стрілка вниз — перейти до них.`
            : 'Підказок немає. Натисніть Enter, щоб відкрити сторінку пошуку.';
        }, 500);
      }

      field.addEventListener('focus', () => {
        loadEngine().catch(() => {
          loading = null;
        });
      });
      field.addEventListener('input', () => {
        if (prepared) render();
        else loadEngine().then(render, () => {
          loading = null;
        });
      });
      field.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' && !panel.hidden) {
          event.preventDefault();
          links()[0].focus();
        }
        if (event.key === 'Escape') close();
      });
      panel.addEventListener('keydown', (event) => {
        const items = links();
        const position = items.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' && position < items.length - 1) {
          event.preventDefault();
          items[position + 1].focus();
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (position > 0) items[position - 1].focus();
          else field.focus();
        }
        if (event.key === 'Escape') {
          close();
          field.focus();
        }
      });
      form.addEventListener('focusout', (event) => {
        if (event.relatedTarget && !form.contains(event.relatedTarget)) close();
      });
      document.addEventListener('click', (event) => {
        if (!form.contains(event.target)) close();
      });
    });
  }

  function initBackToTop() {
    const main = document.getElementById('zmist');
    if (!main) return;

    const link = document.createElement('a');
    link.className = 'totop';
    link.href = '#zmist';
    link.hidden = true;
    const icon = document.createElement('span');
    icon.className = 'icon icon-arrow-right icon-medium';
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon, 'Вгору');
    main.append(link);

    let waiting = false;
    function update() {
      waiting = false;
      const isLong = document.documentElement.scrollHeight > window.innerHeight * 3;
      link.hidden = !isLong || window.pageYOffset < window.innerHeight * 2;
    }
    window.addEventListener(
      'scroll',
      () => {
        if (waiting) return;
        waiting = true;
        window.requestAnimationFrame(update);
      },
      { passive: true },
    );
    update();
  }

  initMegaMenu();
  initMobileMenu();
  initAlertBar();
  initLightbox();
  initQuickSearch();
  initBackToTop();
})();
