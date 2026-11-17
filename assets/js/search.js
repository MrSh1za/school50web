(() => {
  const RESULT_FORMS = ['результат', 'результати', 'результатів'];
  const MAX_RESULTS = 60;
  const TYPING_PAUSE = 400;
  const LATIN_TO_CYRILLIC = {
    q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з', '[': 'х',
    ']': 'ї', a: 'ф', s: 'і', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж',
    "'": 'є', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю',
  };

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

  function fromLatinLayout(query) {
    return query
      .toLowerCase()
      .split('')
      .map((letter) => LATIN_TO_CYRILLIC[letter] || letter)
      .join('');
  }

  function withinOneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i += 1;
        j += 1;
      } else {
        edits += 1;
        if (edits > 1) return false;
        if (a.length > b.length) i += 1;
        else if (a.length < b.length) j += 1;
        else {
          i += 1;
          j += 1;
        }
      }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }

  function nearlyStartsWith(word, wordStem) {
    if (wordStem.length < 4 || word.length < wordStem.length - 1) return false;
    for (let size = wordStem.length - 1; size <= wordStem.length + 1; size += 1) {
      if (withinOneEdit(word.slice(0, size), wordStem)) return true;
    }
    return false;
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

  function wordScore(item, wordStem) {
    const exact = (words) => words.some((word) => word.startsWith(wordStem));
    const near = (words) => words.some((word) => nearlyStartsWith(word, wordStem));
    if (exact(item.titleWords)) return 10;
    if (exact(item.keywordWords)) return 5;
    if (exact(item.otherWords)) return 2;
    if (near(item.titleWords)) return 4;
    if (near(item.keywordWords)) return 2;
    if (near(item.otherWords)) return 1;
    return 0;
  }

  function rank(prepared, query, limit) {
    const stems = queryStems(query);
    if (!stems.length) return [];

    const normalizedQuery = normalize(query);
    const scored = [];

    prepared.forEach((item) => {
      let score = 0;
      const matchesAll = stems.every((wordStem) => {
        const points = wordScore(item, wordStem);
        score += points;
        return points > 0;
      });
      if (!matchesAll) return;
      if (item.title.includes(normalizedQuery)) score += 8;
      if (!item.entry.isDocument) score += 3;
      scored.push({ entry: item.entry, score });
    });

    return scored
      .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
      .slice(0, limit || MAX_RESULTS)
      .map((item) => item.entry);
  }

  function find(prepared, query, limit) {
    const results = rank(prepared, query, limit);
    if (results.length || !/[a-z]/i.test(query)) return { query, results };
    const converted = fromLatinLayout(query);
    return { query: converted, results: rank(prepared, converted, limit) };
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

    item.append(link);
    if (entry.section || isExternal) {
      const meta = document.createElement('p');
      meta.className = 'result__meta';
      meta.textContent = entry.section ? `Розділ: ${entry.section}` : '';
      if (isExternal) {
        const arrow = document.createElement('span');
        arrow.textContent = entry.section ? ' · на іншому сайті ↗' : 'На іншому сайті ↗';
        meta.append(arrow);
      }
      item.append(meta);
    }
    if (entry.description) {
      const description = document.createElement('p');
      description.className = 'result__text';
      description.textContent = entry.description;
      item.append(description);
    }
    return item;
  }

  function resultGroup(title, entries, query) {
    const group = document.createElement('section');
    group.className = 'results__group';
    const heading = document.createElement('h2');
    heading.className = 'results__title';
    heading.textContent = `${title} (${entries.length})`;
    const list = document.createElement('ol');
    list.className = 'results__list';
    list.setAttribute('role', 'list');
    entries.forEach((entry) => list.append(resultItem(entry, query)));
    group.append(heading, list);
    return group;
  }

  function statusText(count, query, typedQuery) {
    if (!count) {
      return `За запитом «${typedQuery}» нічого не знайдено. Спробуйте інше слово або перегляньте сторінку «Від А до Я».`;
    }
    const found = `Знайдено ${count} ${plural(count, RESULT_FORMS)} за запитом «${query}».`;
    return query === typedQuery ? found : `${found} Ви ввели «${typedQuery}» в англійській розкладці.`;
  }

  function initSearch(root) {
    const form = root.querySelector('form');
    const field = root.querySelector('input[type="search"]');
    const status = root.querySelector('[role="status"]');
    const output = root.querySelector('.results');
    const prepared = prepareIndex(window.SEARCH_INDEX || []);

    let last = { query: '', results: [] };
    let pauseTimer = 0;

    function render() {
      const typed = field.value.trim();
      last = find(prepared, typed);
      output.textContent = '';
      const pages = last.results.filter((entry) => !entry.isDocument);
      const documents = last.results.filter((entry) => entry.isDocument);
      if (pages.length) output.append(resultGroup('Сторінки', pages, last.query));
      if (documents.length) output.append(resultGroup('Документи', documents, last.query));
      output.hidden = !last.results.length;
    }

    function announce() {
      const typed = field.value.trim();
      status.textContent = typed ? statusText(last.results.length, last.query, typed) : '';
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

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearTimeout(pauseTimer);
      announce();
      rememberQuery();
    });
    field.addEventListener('input', () => {
      render();
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => {
        announce();
        rememberQuery();
      }, TYPING_PAUSE);
    });

    field.value = new URLSearchParams(location.search).get('q') || '';
    if (field.value) {
      render();
      announce();
    }
  }

  window.SchoolSearch = { prepare: prepareIndex, find, highlighted };
  document.querySelectorAll('[data-search]').forEach(initSearch);
})();
