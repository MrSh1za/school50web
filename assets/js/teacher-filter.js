(() => {
  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[’'`ʼ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function initTeacherFilter(panel) {
    const root = document.getElementById(panel.dataset.teacherFilter);
    if (!root) return;

    const sections = Array.from(root.querySelectorAll('[data-team-group]'));
    const textField = panel.querySelector('[data-filter-field="text"]');
    const groupField = panel.querySelector('[data-filter-field="group"]');
    const resetButton = panel.querySelector('[data-filter-reset]');
    const status = panel.querySelector('[role="status"]');
    const total = root.querySelectorAll('tr[data-name]').length;

    function update() {
      const text = normalize(textField.value);
      const group = groupField.value;
      const isActive = Boolean(text || group);
      let shown = 0;

      sections.forEach((section) => {
        const isInGroup = !group || section.dataset.teamGroup === group;
        let visible = 0;
        section.querySelectorAll('tr[data-name]').forEach((row) => {
          const matches = isInGroup && (!text || normalize(row.dataset.name).includes(text));
          row.hidden = !matches;
          if (matches) visible += 1;
        });
        section.hidden = visible === 0;
        shown += visible;
      });

      resetButton.hidden = !isActive;
      status.textContent = isActive
        ? `Знайдено: ${shown} з ${total}`
        : `Усього в таблицях: ${total}`;
    }

    textField.addEventListener('input', update);
    groupField.addEventListener('change', update);
    resetButton.addEventListener('click', () => {
      textField.value = '';
      groupField.value = '';
      update();
      textField.focus();
    });

    panel.hidden = false;
  }

  document.querySelectorAll('[data-teacher-filter]').forEach(initTeacherFilter);
})();
