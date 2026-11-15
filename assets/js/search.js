(() => {
  const RESULT_FORMS = ['результат', 'результати', 'результатів'];
  const MAX_RESULTS = 60;

  function plural(count, forms) {
    const lastTwo = count % 100;
    const last = lastTwo % 10;
    if (lastTwo > 10 && lastTwo < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[’'`ʼ]/g, '')
      .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ')
      .trim();
  }

  function stem(word) {
    if (word.length > 5) return word.slice(0, -2);
    if (word.length > 3) return word.slice(0, -1);
    return word;
  }

  function queryStems(query) {
    return normalize(query)
      .split(' ')
      .filter((word) => word.length >= 2)
      .map(stem);
  }

  function prepareIndex(entries) {
    return entries.map((entry) => ({
      entry,
      title: normalize(entry.title),
      titleWords: normalize(entry.title).split(' '),
      keywordWords: normalize(entry.keywords || '').split(' '),
      otherWords: normalize(`${entry.section || ''} ${entry.description || ''}`).split(' '),
    }));
  }

  function search(prepared, query) {
    const stems = queryStems(query);
    if (!stems.length) return [];

    const normalizedQuery = normalize(query);
    const startsWithStem = (words, wordStem) => words.some((word) => word.startsWith(wordStem));
    const scored = [];

    prepared.forEach((item) => {
      let score = 0;
      const matchesAll = stems.every((wordStem) => {
        if (startsWithStem(item.titleWords, wordStem)) score += 10;
        else if (startsWithStem(item.keywordWords, wordStem)) score += 5;
        else if (startsWithStem(item.otherWords, wordStem)) score += 2;
        else return false;
        return true;
      });
      if (!matchesAll) return;
      if (item.title.includes(normalizedQuery)) score += 8;
      if (!item.entry.isDocument) score += 3;
      scored.push({ entry: item.entry, score });
    });

    return scored
      .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
      .slice(0, MAX_RESULTS)
      .map((item) => item.entry);
  }

  function highlighted(text, query) {
    const stems = queryStems(query);
    const fragment = document.createDocumentFragment();
    text.split(/(\s+)/).forEach((part) => {
      const word = normalize(part);
      const isMatch = word && stems.some((wordStem) => word.startsWith(wordStem));
      if (isMatch) {
        const mark = document.createElement('mark');
        mark.textContent = part;
        fragment.append(mark);
      } else {
        fragment.append(part);
      }
    });
    return fragment;
  }

  function resultItem(entry, query) {
    const isExternal = /^https?:/.test(entry.url);
    const item = document.createElement('li');
    item.className = 'result';

    const link = document.createElement('a');
    link.className = 'result__link';
    link.href = entry.url;
    link.append(highlighted(entry.title, query));
    if (isExternal) {
      const note = document.createElement('span');
      note.className = 'visually-hidden';
      note.textContent = ' (інший сайт)';
      link.append(note);
    }

    const meta = document.createElement('p');
    meta.className = 'result__meta';
    meta.textContent = `${entry.isDocument ? 'Документ' : 'Сторінка'}${entry.section ? ` · ${entry.section}` : ''}`;
    if (isExternal) {
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = ' ↗';
      meta.append(arrow);
    }

    item.append(link, meta);
    if (entry.description) {
      const description = document.createElement('p');
      description.className = 'result__text';
      description.textContent = entry.description;
      item.append(description);
    }
    return item;
  }

  function statusText(count, query) {
    if (!count) {
      return `За запитом «${query}» нічого не знайдено. Спробуйте інше слово або перегляньте сторінку «Від А до Я».`;
    }
    return `Знайдено ${count} ${plural(count, RESULT_FORMS)} за запитом «${query}».`;
  }

  function initSearch(root) {
    const form = root.querySelector('form');
    const field = root.querySelector('input[type="search"]');
    const status = root.querySelector('[role="status"]');
    const list = root.querySelector('.results');
    const prepared = prepareIndex(window.SEARCH_INDEX || []);

    function render() {
      const query = field.value.trim();
      const results = search(prepared, query);
      status.textContent = query ? statusText(results.length, query) : '';
      list.textContent = '';
      results.forEach((entry) => list.append(resultItem(entry, query)));
      list.hidden = !results.length;
    }

    function rememberQuery() {
      const query = field.value.trim();
      const url = query ? `?q=${encodeURIComponent(query)}` : location.pathname;
      try {
        history.replaceState(null, '', url);
      } catch (error) {
        return;
      }
    }

    form.addEventListener('submit', (event) => event.preventDefault());
    field.addEventListener('input', () => {
      render();
      rememberQuery();
    });

    field.value = new URLSearchParams(location.search).get('q') || '';
    if (field.value) render();
  }

  document.querySelectorAll('[data-search]').forEach(initSearch);
})();
