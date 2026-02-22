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

  // Active nav link
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('nav a[href]').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path) a.classList.add('active');
  });
});
