(() => {
  document.documentElement.classList.add('js');
  if (location.protocol !== 'file:') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = document.currentScript.src.replace('js/head.js', 'css/fonts-offline.css');
  document.head.append(link);
})();
