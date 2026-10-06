// Interactive terminal résumé — section 5 ("resume") of the spatial homepage.
// Loaded lazily by js/spatial.js (together with lib/jquery + lib/jquery.terminal) the first
// time the résumé window opens; exposes window.GELEUS.initResume(el) and .resumeResize().
// Content + commands carried over verbatim from the former geleus.io terminal, re-coloured to
// the charcoal/moss palette. startx/exit/hub go home; goodies/blog/journal open those sections.
(function () {
  'use strict';
  var $ = window.jQuery;
  if (!$ || !$.fn.terminal) return;
  var F0 = window.GELEUS = window.GELEUS || {};
  function rand(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ---------- palette for jquery.terminal's [[b;color;]text] markup ---------- */
  var H = '#a8c891',   // headings — moss bright
      K = '#9aa09a',   // keys / labels — dim
      S = '#7d96ad',   // dates, places, links — steel
      F = '#6c726c',   // faint
      M = '#8faf78';   // moss
  function h(t) { return '[[b;' + H + ';]' + t + ']'; }
  function k(t) { return '[[b;' + K + ';]' + t + ']'; }
  function s(t) { return '[[;' + S + ';]' + t + ']'; }
  function f(t) { return '[[;' + F + ';]' + t + ']'; }

  var commands = {
    help: 'shows help',
    demo: 'play the story (cinematic)',
    less: 'use less as output method',
    whois: 'list basic details',
    social: 'list social networks',
    work: 'list work experience',
    education: 'list education',
    skills: 'list core skills',
    softskills: 'list soft skills',
    languages: 'list spoken languages',
    projects: 'list projects',
    certifications: 'list certifications',
    about: 'about me',
    all: 'show all details',
    goodies: 'open the goodies section',
    blog: 'open the blog section',
    journal: 'open the weekly journal',
    startx: 'starts graphical environment (home)',
    clear: 'clear the screen',
    version: 'current version',
    exit: 'exit the terminal'
  };

  function progressBar(number) {
    var n = Math.round(number / 10), filled = '', blank = '', i;
    for (i = 0; i < n; i++) filled += '▋';
    for (i = 0; i < 10 - n; i++) blank += '░';
    return '[[;' + M + ';]' + filled + '][[;' + F + ';]' + blank + ']';
  }
  function padKey(key, length) { return key + ' '.repeat(Math.max(0, length - key.length)); }
  function commandsHelp() {
    var longest = Math.max.apply(null, Object.keys(commands).map(function (c) { return c.length; })), out = '';
    for (var c in commands) if (commands.hasOwnProperty(c)) out += ' ' + h(padKey(c, longest)) + '  ' + f(commands[c]) + '\n';
    return out;
  }
  function bar(label, pct) { return k(label + ':') + '\n' + progressBar(pct) + ' ' + f(pct + '%') + '\n\r'; }

  /* ---------- content (verbatim from the original résumé, restyled) ---------- */
  var help = '\n' + h('usage:') + '\n\n <command> - execute the command\n less <command> - use less to display the output\n\n' + h('available commands:') + '\n' + commandsHelp();

  var whois = [
    k('Name:') + '\t\t\tVadim Pidoshva\n' +
    k('Profession:') + '\t\tSoftware Engineer\n' +
    k('Location:') + '\t\tLehi, UT\n' +
    k('Email:') + '\t\t\tpidoshva.vadim@gmail.com\n' +
    k('Homepage:') + '\t\thttps://geleus.com/\n\n' +
    'Full-stack Software Engineer specializing in distributed microservices, e-commerce \nplatform integrations, and modern web applications. Building scalable systems with \nTypeScript, NestJS, Vue, and React across the entire stack.\n' +
    '\r'
  ];

  var socialMap = { github: 'https://github.com/pidoshva', instagram: 'https://www.instagram.com/vp.id/', geleus: 'https://geleus.com/' };
  function social() {
    var longest = Math.max.apply(null, Object.keys(socialMap).map(function (c) { return c.length; })), out = [];
    for (var key in socialMap) if (socialMap.hasOwnProperty(key)) out.push(k(padKey(key, longest)) + '\t' + socialMap[key]);
    return out;
  }

  var certifications = [
    f('---') + '\n' + h('Agile Project Management Certificate') + '\n' + s('Spring 2025') + '\nUdemy\n\r',
    f('---') + '\n' + h('Programmer Certificate') + '\n' + s('Fall 2022') + '\nUtah Valley University\n\r'
  ];

  var work = [
    f('---') + '\n' + h('Software Engineer') + '\nOrderProtection.com\n' + s('Lehi, UT') + '\n' + s('April 2025 - Present') + '\n\n' +
    '- Developed and maintained features across a 14+ NestJS microservices platform powered by GraphQL \n  Federation, Kafka, and BullMQ for e-commerce order protection at scale.\n' +
    '- Built multi-platform cart protection widgets using Web Components and React, shipping to Shopify \n  and Fluid storefronts via event-driven architecture.\n' +
    '- Engineered warranty management, claims categorization, and policy systems handling merchant \n  order protection workflows end-to-end.\n' +
    '- Contributed to customer-facing Vue 3/Nuxt 3 dashboards and Shopify Checkout Extensibility \n  integrations with dynamic configuration and A/B testing.\n\r',

    f('---') + '\n' + h('Full-stack Developer') + '\nUtah County Health Department\n' + s('Orem, UT') + '\n' + s('August 2024 - Present') + '\n\n' +
    '- Built a patient filtering and nurse assignment platform from the ground up, streamlining \n  workflows for county health staff across multiple departments.\n' +
    '- Architected full-stack solution with UI components and backend logic to manage 10,000+ patient \n  records with CSV data integration and real-time filtering.\n' +
    '- Drove iterative improvements through cross-functional collaboration, incorporating nurse feedback \n  to optimize system performance and usability.\n' +
    '- Owned debugging and troubleshooting efforts, ensuring production-ready stability and scalability.\n\r'
  ];

  var education = [
    f('---') + '\n' + h('Software Engineering B.S.') + '\nUtah Valley University\n' + s('August 2020 - May 2025') + '\n\r',
    f('---') + '\n' + h('Computer Science A.S.') + '\nUtah Valley University\n' + s('August 2020 - December 2024') + '\n\r'
  ];

  var projects = [
    f('---') + '\n' + h('Nurse Filter') + '\n' + s('Since 2024') + '\nhttps://geleus.com/projects/utah-county-health-department-project/\n' +
    '- Designed and implemented UI components and backend logic, improving accessibility \n  and management of 10,000+ patient records involving CSV data integration.\n' +
    '- Optimized software performance by incorporating user feedback to enhance efficiency.\n' +
    '- Led troubleshooting efforts and debugging, ensuring seamless implementation.\n\n\r',

    f('---') + '\n' + h('Facial Recognition') + '\n' + s('2022') + '\nhttps://geleus.com/projects/facial_recognition/\n' +
    '- Developed a live facial recognition algorithm that greets known users and adds unrecognized ones \n  to the dataset after notification.\n' +
    '- Used OpenCV and face_recognition library to process image frames and match facial encodings.\n\n\r',

    f('---') + '\n' + h('ML Simulator') + '\n' + s('2022') + '\nhttps://geleus.com/projects/uvsim/\n' +
    '- Developed a virtual machine simulator that executes simplified assembly instructions.\n' +
    '- Implemented memory storage and recursion handling to simulate real computer operations.\n\n\r'
  ];

  var skills = [
    bar('TypeScript', 90), bar('NestJS', 85), bar('Vue / Nuxt', 80), bar('React', 75),
    bar('GraphQL (Apollo Federation)', 80), bar('PostgreSQL / Prisma', 80), bar('Kafka / BullMQ / Redis', 75),
    bar('Nx Monorepo', 80), bar('Shopify APIs / Extensions', 75), bar('Web Components', 70),
    bar('Docker / GCP', 75), bar('Vite / Vitest', 75), bar('Git', 90)
  ];
  var softSkills = [bar('Problem-Solving', 100), bar('Communication', 100), bar('Team Collaboration', 100), bar('Time Management', 100)];
  var languages = [bar('English', 100), bar('Russian', 100), bar('Ukrainian', 100)];

  var misc = [
    h('about me') + '\n' +
    '- I love coding, skiing, and camping.\n- Used to be in the top 1% of Destiny 1 gamers.\n- Passionate about software development and automation.\n- Enjoy weight training and tracking fitness progress.\n- Geleus – my universal nickname.\n'
  ];

  var source =
    '⠀⠀⠀⠀⢀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣶⣶⡄⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⣿⣿⡿⣿⣿⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⠛⠉⢻⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⢹⣿⠀⠀⠀⠈⠻⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡾⠋⠀⠀⠀⠈⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⢸⣿⠀⠀⠀⠀⠀⠈⠻⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⡟⠀⠀⠀⠀⠀⠀⠹⣧⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⣸⡿⠀⠀⠀⠀⠀⠀⠀⠘⢿⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⡿⠀⠀⠀⠀⠀⠀⠀⠀⠻⣧⡀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⡀⠈⣿⣧⡀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣀⡀⢠⣿⣧⠀⠀⢀⣤⣤⣄⠀⠀⠀⢹⣧⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⢹⣇⠀⠀⠀⠀⠀⠀⢀⢱⠀⣽⣿⣧⣴⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⢿⣿⣿⣿⡇⠀⠀⢨⣿⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠈⣿⡄⠀⠀⠀⠀⢸⣿⡟⠰⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⢶⣺⡟⠀⠀⠀⣾⣿⡇⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⣿⡟⠆⠀⠀⠢⣿⣿⣿⢠⢇⣽⣿⣿⣿⣿⣿⡿⠉⠘⣿⣿⣿⣿⣿⣿⣿⣏⠙⢻⣦⣨⡟⣀⠀⠀⢠⣀⣿⠃⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠘⣷⡀⠀⠀⠀⠘⣿⣯⠋⣼⣿⣿⣿⣿⣿⡿⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⡆⠀⣹⣿⣞⣁⣀⣤⡶⠟⠁⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠈⠻⣶⣤⣄⣸⣿⣿⣸⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣧⣘⣿⣿⣿⡿⠟⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠻⣿⣿⣿⣿⡿⠿⠛⠻⣿⣿⣄⠀⠀⠰⣿⣿⠟⠛⢻⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⢿⣿⣶⣄⠀⣸⣿⣿⡆⠀⢶⣿⣿⠀⣠⣎⣥⣬⣙⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⣠⣶⣷⣿⡿⣶⡄⠀⠀⠈⣿⣿⣿⣿⣿⣎⢿⣿⣿⣿⡇⠀⠸⣿⣿⣿⣿⣿⣿⣿⣿⢻⡏⣿⠀⠀⠀⠀⠀⣀⣤⣶⣦⣀⡀⠀⠀\n' +
    '⠀⢰⣾⣿⠘⣿⡿⠀⢹⣿⣶⣄⠀⢸⢿⡻⠿⠟⢉⣽⣿⠟⠋⠁⠀⠀⠿⣿⣿⣿⣍⣛⣛⣡⡾⠀⣿⠀⠀⣠⣶⣶⣿⠋⢹⣿⣿⢿⣆⠀\n' +
    '⠀⢼⡙⣿⣶⣽⣿⣶⣿⡿⠋⣿⠀⠘⣎⢻⣿⣿⡿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣿⣿⡿⠁⢠⡏⠀⣰⣿⠉⣿⣿⣦⣼⡿⣃⣼⣿⣧\n' +
    '⢀⣈⣻⣿⣉⣀⣀⣀⣙⣷⣶⣟⣀⣀⣹⣦⣉⠉⠀⠀⠀⢀⣤⣤⣤⣤⣀⠀⠀⠀⠀⠈⠀⠀⣴⣿⣀⣀⣿⣿⣶⣿⣋⣉⣉⣻⣿⣟⣱⣇\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⡆⢀⠀⠀⣿⣧⢤⠤⣞⣿⠀⠀⠀⡄⠀⠀⣠⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢞⣄⠀⠙⠿⣼⡮⠽⠃⠀⣠⠞⠀⣠⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠷⣶⣂⡙⠙⠉⢉⣉⣀⡤⠞⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n';

  var all = [whois, social(), work, education, skills, softSkills, languages, projects, certifications, misc, source];

  var narrow = window.innerWidth <= 760; // the block-letter banner wraps on phones
  var banner = (narrow ? h('VADIM PIDOSHVA') + '  ' + f('v2') + '\n\n' :
    '[[b;' + H + ';]█░█ ▄▀█ █▀▄ █ █▀▄▀█   █▀█ █ █▀▄ █▀█ █▀ █░█ █░█ ▄▀█]\n' +
    '[[b;' + H + ';]▀▄▀ █▀█ █▄▀ █ █░▀░█   █▀▀ █ █▄▀ █▄█ ▄█ █▀█ ▀▄▀ █▀█]  ' + f('v2') + '\n\n') +
    'Welcome to Vadim\'s interactive resume.\n' + f('Type ') + h('help') + f(' for a list of commands, or ') + h('demo') + f(' to watch the story on the helix.') + '\n';

  function goSection(key) { if (F0.goSection) F0.goSection(key); }

  var term = null, animation = false, timer = null, savedPrompt = '', progressString = '';
  F0.initResume = function (el) {
    if (term) return term;
    term = $(el).terminal(function (command, t) {
      var useLess = false;
      function echoArray(array) {
        if (useLess) t.less(array);
        else for (var i = 0; i < array.length; i++) t.echo(array[i]);
      }
      function progress(percent, width) {
        var size = Math.round(width * percent / 100), left = '', taken = '', i;
        for (i = size; i--;) taken += '=';
        if (taken.length > 0) taken = taken.replace(/=$/, '>');
        for (i = width - size; i--;) left += ' ';
        return '[' + taken + left + '] ' + percent + '%';
      }
      function loading(done) {
        var i = 0, size = 30;
        savedPrompt = t.get_prompt(); animation = true;
        (function loop() {
          progressString = progress(i++, size); t.set_prompt(progressString);
          if (i < 100) timer = setTimeout(loop, 10);
          else { t.echo(progress(i, size) + ' [[b;' + M + ';]OK]').set_prompt(savedPrompt); animation = false; if (done) done(); }
        })();
      }
      var parts = command.split(/[ ]+/);
      if (parts[0] === 'less') { useLess = true; parts.shift(); }
      switch (parts[0]) {
        case 'whois': echoArray(whois); break;
        case 'social': echoArray(social()); break;
        case 'work': echoArray(work); break;
        case 'education': echoArray(education); break;
        case 'skills': echoArray(skills); break;
        case 'softskills': echoArray(softSkills); break;
        case 'languages': echoArray(languages); break;
        case 'projects': echoArray(projects); break;
        case 'certifications': echoArray(certifications); break;
        case 'about': echoArray(misc); break;
        case 'help': case '?': t.echo(help); break;
        case 'demo': t.echo(f('starting the story \u2026  ') + f('space: next \u00b7 \u2190 back \u00b7 p: pause \u00b7 esc: exit')); if (F0.startDemo) setTimeout(F0.startDemo, 350); break;
        case 'all': echoArray(all.flat(1)); break;
        case 'source': t.echo(source); break;
        case 'goodies': case 'blog': case 'journal': t.echo(f('opening ') + h(parts[0]) + f(' \u2026')); goSection(parts[0]); break;
        case 'hub': case 'home': t.echo(f('back to the cluster \u2026')); goSection('home'); break;
        case 'startx': t.echo('loading ...'); loading(function () { goSection('home'); }); break;
        case ':(){:|:&};:': t.echo('nice try'); break;
        case 'clear': t.clear(); break;
        case 'exit': t.echo('terminating ... '); loading(function () { goSection('home'); }); break;
        case 'version': t.echo('2.0.0'); break;
        case '': break;
        default:
          t.echo('\nunknown command: ' + command + '\n' + f("please type 'help' or '?' for a list of available commands") + '\n');
      }
    }, {
      prompt: '[[;' + F + ';][][[;' + H + ';]guest@geleus.com][[;' + F + ';]\\]][[;' + F + ';]-][[;' + F + ';][][[;' + S + ';]~/resume][[;' + F + ';]\\]][[;' + M + ';]: ]',
      greetings: banner,
      keydown: function (e, t) {
        if (animation) {
          if (e.which === 68 && e.ctrlKey) { clearTimeout(timer); animation = false; t.echo(progressString + ' [[b;#c98a7a;]FAIL]').set_prompt(savedPrompt); }
          return false;
        }
      },
      autocompleteMenu: true,
      completion: Object.keys(commands),
      checkArity: false
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (term) term.resize(); });
    return term;
  };
  F0.resumeResize = function () { if (term) term.resize(); };
  F0.resumeFocus = function () { if (term) term.focus(); };
  F0.resumeDisable = function () { if (term) term.disable(); };
  F0.resumeEnable = function () { if (term) term.enable(); };
  F0.resumeEcho = function (msg) { if (term) term.echo(f(msg)); };

  // The story the demo tells, bottom of the helix → top. Source: the résumé (Oct 2026).
  F0.resumeStory = [
    { eyebrow: 'enerhodar \u2192 utah', title: 'Origin',
      lines: ['Born in Enerhodar, Ukraine. Now in Lehi, Utah.', 'Geleus \u2014 the nickname that became the domain.', 'A builder who takes things from idea to production, end to end.'] },
    { eyebrow: '2020 \u2013 2025', title: 'Learning the craft',
      lines: ['Utah Valley University.', 'A.S. in Computer Science, then a B.S. in Software Engineering.', 'A Programmer Certificate along the way.'] },
    { eyebrow: '2024', title: 'First production code',
      lines: ['Utah County Health Department.', 'Built a patient filtering and nurse assignment platform from scratch.', '10,000+ patient records, CSV imports, real-time filtering.', 'Shaped by the nurses who used it every day.'] },
    { eyebrow: 'april 2025', title: 'OrderProtection',
      lines: ['Shipping protection and extended warranties for Shopify and BigCommerce stores.', 'A small \u201cadd protection\u201d control in the cart, backed by 15+ services and a claims AI.', 'Owned the installer, the implementation dashboard, widget releases and the editor merchants use.'] },
    { eyebrow: 'automation', title: '/imp \u2014 automating the chore',
      lines: ['Installing the widget meant an engineer hand-editing each store\u2019s theme.', 'Built a tool and an AI playbook: fetch the theme, apply a tested recipe, save to a draft, verify.', 'Several times faster, credentials locked down, a second platform added.', 'Now a one-click job run by an agent, with live progress and honest pass/fail.'] },
    { eyebrow: 'product', title: 'Whole product lines',
      lines: ['Extended warranties, from the data model to the selector shoppers tap.', 'Merchant-defined order tags that survive server restarts.', 'A widget editor merchants use without touching code.', 'Previews that match each store\u2019s real fonts and colours.'] },
    { eyebrow: 'production', title: 'Debugging from real data',
      lines: ['Shoppers refunded twice. $0 premiums on every warranty sold.', 'Wrong prices for international orders. Events dropped during pod evictions.', 'A checkout toggle that ignored taps on slow carts.', 'Each traced to its root cause and fixed in production.'] },
    { eyebrow: 'may 2025 \u2013 oct 2026', title: 'By the numbers',
      lines: ['240 merged pull requests in 17 months.', 'Six repositories: 13 backend services, two frontends, two widget codebases.', 'About 77,000 lines added, with unit and end-to-end tests alongside.', 'Every number from merged work. Nothing estimated.'] },
    { eyebrow: 'tools', title: 'The stack',
      lines: ['TypeScript \u00b7 NestJS \u00b7 Prisma + PostgreSQL \u00b7 Kafka \u00b7 BullMQ \u00b7 GraphQL federation', 'Nuxt 3 \u00b7 Vue 3 \u00b7 Web Components \u00b7 Shopify & BigCommerce APIs', 'MCP servers \u00b7 Claude agents \u00b7 draft-only autonomous workflows', 'Docker \u00b7 Kubernetes \u00b7 GCP \u00b7 Terraform \u00b7 GitHub Actions'] },
    { eyebrow: 'now', title: 'Still building',
      lines: ['Taking things end to end, and sharing what I learn along the way.', 'geleus.com \u00b7 github.com/pidoshva', 'Type help to explore the terminal.'] }
  ];
})();
