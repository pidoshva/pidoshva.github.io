// Hamburger toggle
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.hamburger');
  const menu = document.querySelector('nav ul');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', menu.classList.contains('open'));
    });
  }

  // Active nav link (prefix match for sub-pages like /blog/post.html)
  const path = location.pathname;
  document.querySelectorAll('nav a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (href.startsWith('http')) return; // skip external links
    const hrefClean = href.replace(/\/$/, '') || '/';
    const pathClean = path.replace(/\/$/, '') || '/';
    if (hrefClean === pathClean || (hrefClean !== '/' && pathClean.startsWith(hrefClean))) {
      a.classList.add('active');
    }
  });
});
