(() => {
  const DOCUMENT_FORMS = ['документ', 'документи', 'документів'];

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
      .replace(/\s+/g, ' ')
      .trim();
  }

  function initDocumentFilter(panel) {
    const list = document.getElementById(panel.dataset.documentFilter);
    if (!list) return;

    const rows = Array.from(list.querySelectorAll('li.doc'));
    const rowTexts = rows.map((row) => normalize(row.textContent));
    const groups = Array.from(list.querySelectorAll('[data-doc-group]'));
    const textField = panel.querySelector('[data-filter-field="text"]');
    const yearField = panel.querySelector('[data-filter-field="year"]');
    const typeField = panel.querySelector('[data-filter-field="type"]');
    const resetButton = panel.querySelector('[data-filter-reset]');
    const status = panel.querySelector('[role="status"]');
    const totalText = `${rows.length} ${plural(rows.length, DOCUMENT_FORMS)}`;

    groups.forEach((group) => {
      const counter = group.querySelector('.doc-group__count');
      if (counter) counter.dataset.total = counter.textContent;
    });

    function update() {
      const text = normalize(textField.value);
      const year = yearField ? yearField.value : '';
      const type = typeField ? typeField.value : '';
      const isActive = Boolean(text || year || type);
      let shown = 0;

      rows.forEach((row, index) => {
        const matches =
          (!year || row.dataset.year === year) &&
          (!type || row.dataset.type === type) &&
          (!text || rowTexts[index].includes(text));
        row.hidden = !matches;
        if (matches) shown += 1;
      });

      groups.forEach((group) => {
        const groupRows = group.querySelectorAll('li.doc');
        const visible = group.querySelectorAll('li.doc:not([hidden])').length;
        const counter = group.querySelector('.doc-group__count');
        group.hidden = visible === 0;
        if (!counter) return;
        counter.textContent =
          isActive && visible !== groupRows.length
            ? `показано ${visible} з ${groupRows.length}`
            : counter.dataset.total;
      });

      resetButton.hidden = !isActive;
      status.textContent = isActive ? `Показано ${shown} з ${totalText}` : `Усього ${totalText}`;
    }

    textField.addEventListener('input', update);
    if (yearField) yearField.addEventListener('change', update);
    if (typeField) typeField.addEventListener('change', update);
    resetButton.addEventListener('click', () => {
      textField.value = '';
      if (yearField) yearField.value = '';
      if (typeField) typeField.value = '';
      update();
      textField.focus();
    });

    panel.hidden = false;
  }

  document.querySelectorAll('[data-document-filter]').forEach(initDocumentFilter);
})();
