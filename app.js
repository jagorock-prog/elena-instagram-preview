'use strict';

function selectPosts(posts, tab, savedIds) {
  if (tab === 'reels') return posts.filter(post => post.type === 'reel');
  if (tab === 'saved') return posts.filter(post => savedIds.has(post.id));
  return posts;
}

function adjacentIndex(count, current, delta) {
  return Math.max(0, Math.min(count - 1, current + delta));
}

function parseSavedIds(value) {
  try {
    const parsed = JSON.parse(value);
    return new Set(Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

if (typeof module !== 'undefined') module.exports = { selectPosts, adjacentIndex, parseSavedIds };

if (typeof document !== 'undefined') (() => {
  const data = globalThis.ELENA_DATA;
  const byId = id => document.getElementById(id);
  const grid = byId('post-grid');
  const dialog = byId('post-dialog');
  const info = byId('info-dialog');
  const image = byId('post-image');
  const video = byId('post-video');
  byId('publication-count').textContent = String(data.posts.length);
  const storageKey = 'elena-profile-saved-month-2026-11-20';
  let saved = new Set();
  try { saved = parseSavedIds(localStorage.getItem(storageKey)); } catch { /* Private browsing may deny storage. */ }
  const liked = new Set();
  let tab = 'posts';
  let activePost = null;
  let slide = 0;
  let returnFocus = null;
  let ownsHistoryEntry = false;
  let pointerStart = null;
  let toastTimer;

  function icon(name, className = '') {
    const img = document.createElement('img');
    img.src = `assets/icons/${name}.svg`;
    img.alt = '';
    if (className) img.className = className;
    return img;
  }

  function notify(text) {
    clearTimeout(toastTimer);
    byId('toast').textContent = text;
    byId('toast').hidden = false;
    toastTimer = setTimeout(() => { byId('toast').hidden = true; }, 3200);
  }

  function showInfo(title, text) {
    byId('info-title').textContent = title;
    byId('info-text').textContent = text;
    if (!info.open) info.showModal();
  }

  function renderGrid() {
    grid.replaceChildren();
    const visible = selectPosts(data.posts, tab, saved);
    for (const post of visible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'post-tile';
      button.dataset.postId = post.id;
      button.setAttribute('aria-label', `Открыть публикацию: ${post.title}`);
      const img = document.createElement('img');
      img.src = post.thumbnail || post.cover;
      img.alt = post.alt;
      img.width = 1080;
      img.height = 1440;
      img.loading = grid.children.length < 3 ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (post.type === 'reel') img.style.objectPosition = 'center top';
      button.append(img);
      const marks = document.createElement('span');
      marks.className = 'tile-marks';
      marks.setAttribute('aria-hidden', 'true');
      if (post.pinned) marks.append(icon('pin'));
      if (post.type === 'carousel') marks.append(icon('copy'));
      if (post.type === 'reel') marks.append(icon('movie'));
      button.append(marks);
      button.addEventListener('click', () => openPost(post.id));
      grid.append(button);
    }
    byId('empty-state').hidden = visible.length !== 0;
    grid.hidden = visible.length === 0;
    byId('empty-title').textContent = tab === 'saved' ? 'Сохраните то, что нравится' : 'Здесь пока нет публикаций';
    byId('empty-text').textContent = tab === 'saved'
      ? 'Нажмите на закладку под публикацией — она появится здесь.'
      : 'Новые материалы появятся после подготовки контента.';
  }

  function setTab(nextTab, focus = false) {
    tab = nextTab;
    document.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === tab;
      button.classList.toggle('active', selected);
      if (button.getAttribute('role') === 'tab') {
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        if (focus && selected) button.focus();
      }
    });
    grid.setAttribute('aria-labelledby', `tab-${tab}`);
    renderGrid();
  }

  function renderMedia() {
    const focusedControl = document.activeElement;
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.hidden = true;
    image.hidden = true;
    const media = activePost.media[slide];
    byId('media-notice').textContent = activePost.notice || '';
    byId('media-notice').hidden = !activePost.notice;
    if (media.type === 'video') {
      video.poster = media.poster || activePost.cover;
      video.src = media.src;
      video.setAttribute('aria-label', media.alt || activePost.title);
      video.hidden = false;
    } else {
      image.alt = media.alt || activePost.alt;
      image.src = media.src;
      image.hidden = false;
    }
    const count = activePost.media.length;
    byId('prev-slide').hidden = count < 2 || slide === 0;
    byId('next-slide').hidden = count < 2 || slide === count - 1;
    byId('slide-counter').hidden = count < 2;
    byId('slide-counter').textContent = `${slide + 1} / ${count}`;
    const dots = byId('slide-dots');
    dots.hidden = count < 2;
    if (count < 2 || dots.children.length !== count) {
      dots.replaceChildren();
      if (count > 1) activePost.media.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Слайд ${index + 1} из ${count}`);
        button.addEventListener('click', () => { slide = index; renderMedia(); });
        dots.append(button);
      });
    }
    [...dots.children].forEach((button, index) => {
      button.setAttribute('aria-current', String(index === slide));
    });
    if (count > 1 && ((focusedControl === byId('prev-slide') && byId('prev-slide').hidden)
      || (focusedControl === byId('next-slide') && byId('next-slide').hidden))) {
      dots.children[slide].focus({ preventScroll: true });
    }
  }

  function renderPost() {
    const visible = selectPosts(data.posts, tab, saved);
    const current = visible.findIndex(post => post.id === activePost.id);
    byId('post-title').textContent = activePost.title;
    byId('post-caption').textContent = activePost.caption || '';
    const format = ({ image: 'Публикация', carousel: 'Карусель', reel: 'Reels' })[activePost.type];
    byId('post-format').textContent = activePost.day ? `${format} · День ${activePost.day} из 30` : format;
    byId('prev-post').disabled = current <= 0;
    byId('next-post').disabled = current < 0 || current >= visible.length - 1;
    byId('save-button').setAttribute('aria-pressed', String(saved.has(activePost.id)));
    byId('save-button').setAttribute('aria-label', saved.has(activePost.id) ? 'Убрать из сохранённого' : 'Сохранить публикацию');
    byId('like-button').setAttribute('aria-pressed', String(liked.has(activePost.id)));
    renderMedia();
  }

  function openPost(id, fromHistory = false) {
    const post = data.posts.find(item => item.id === id);
    if (!post) return;
    const alreadyOpen = dialog.open;
    if (!alreadyOpen) returnFocus = document.activeElement;
    activePost = post;
    slide = 0;
    renderPost();
    if (!dialog.open) dialog.showModal();
    if (!fromHistory) {
      if (alreadyOpen || ownsHistoryEntry) history.replaceState(null, '', `#${id}`);
      else {
        history.pushState(null, '', `#${id}`);
        ownsHistoryEntry = true;
      }
    }
  }

  function closePost(fromHistory = false) {
    if (!dialog.open) return;
    video.pause();
    dialog.close();
    if (!fromHistory) {
      if (ownsHistoryEntry) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    ownsHistoryEntry = false;
    const fallback = document.querySelector(`[data-post-id="${activePost.id}"]`) || byId(`tab-${tab}`);
    (returnFocus?.isConnected ? returnFocus : fallback).focus({ preventScroll: true });
  }

  function changePost(delta) {
    const visible = selectPosts(data.posts, tab, saved);
    const current = visible.findIndex(post => post.id === activePost.id);
    const index = adjacentIndex(visible.length, current, delta);
    if (visible[index]) openPost(visible[index].id);
  }

  function changeSlide(delta) {
    slide = adjacentIndex(activePost.media.length, slide, delta);
    renderMedia();
  }

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
    if (button.getAttribute('role') === 'tab') button.addEventListener('keydown', event => {
      const tabs = ['posts', 'reels', 'saved'];
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      setTab(tabs[index], true);
    });
  });

  for (const highlight of data.highlights) {
    const button = document.createElement('button');
    button.className = 'highlight';
    button.type = 'button';
    button.setAttribute('aria-label', `Актуальное: ${highlight.title}`);
    const cover = document.createElement('span');
    cover.className = 'highlight-cover';
    cover.style.setProperty('--highlight-bg', highlight.background);
    cover.style.setProperty('--highlight-color', highlight.color);
    const initial = document.createElement('span');
    initial.textContent = highlight.letter;
    initial.setAttribute('aria-hidden', 'true');
    cover.append(initial);
    const label = document.createElement('span');
    label.className = 'highlight-label';
    label.textContent = highlight.title;
    button.append(cover, label);
    button.addEventListener('click', () => showInfo(highlight.title, 'Этот раздел пока оформлен как обложка. Истории добавим на этапе подготовки контента.'));
    byId('highlights').append(button);
  }

  byId('close-post').addEventListener('click', () => closePost());
  byId('close-info').addEventListener('click', () => info.close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePost(); });
  for (const modal of [dialog, info]) modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      if (modal === dialog) closePost(); else info.close();
    }
  });
  byId('prev-post').addEventListener('click', () => changePost(-1));
  byId('next-post').addEventListener('click', () => changePost(1));
  byId('prev-slide').addEventListener('click', () => changeSlide(-1));
  byId('next-slide').addEventListener('click', () => changeSlide(1));
  dialog.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target === video) return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    if (activePost.media.length > 1) changeSlide(delta); else changePost(delta);
  });
  const mediaArea = document.querySelector('.post-media');
  mediaArea.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('button, video')) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  mediaArea.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5 && activePost.media.length > 1) changeSlide(dx < 0 ? 1 : -1);
  });
  mediaArea.addEventListener('pointercancel', () => { pointerStart = null; });

  byId('save-button').addEventListener('click', () => {
    const id = activePost.id;
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...saved])); } catch { notify('Сохранено до закрытия страницы. Браузер ограничил постоянное хранение.'); }
    renderGrid();
    byId('save-button').setAttribute('aria-pressed', String(saved.has(id)));
    byId('save-button').setAttribute('aria-label', saved.has(id) ? 'Убрать из сохранённого' : 'Сохранить публикацию');
    const visible = selectPosts(data.posts, tab, saved);
    const index = visible.findIndex(post => post.id === id);
    byId('prev-post').disabled = index <= 0;
    byId('next-post').disabled = index < 0 || index >= visible.length - 1;
  });
  byId('like-button').addEventListener('click', () => {
    const id = activePost.id;
    if (liked.has(id)) liked.delete(id); else liked.add(id);
    byId('like-button').setAttribute('aria-pressed', String(liked.has(id)));
  });
  byId('follow-button').addEventListener('click', event => {
    const followed = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(followed));
    event.currentTarget.textContent = followed ? 'Вы подписаны' : 'Подписаться';
    notify('Отметка действует только в этом макете профиля.');
  });
  byId('message-button').addEventListener('click', () => showInfo('Сообщения', 'Сейчас здесь можно посмотреть профиль и публикации. Переписка в этом макете не подключена.'));
  document.querySelectorAll('[data-info]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.info === 'about-elena') showInfo('Елена Зайцева', 'Хозяйка мебельной фабрики. Мебель, дизайн и интерьеры. Петербург · работаем по России.');
    else showInfo('Предпросмотр профиля', 'Здесь собран месяц публикаций Елены: фотографии, карусели и Reels. Сетка показывает профиль к концу месяца — новые публикации сверху.\n\nМатериалы для обсуждения. Пометки внутри карточек показывают, что ещё предстоит снять. Счётчики подписчиков и подписок демонстрационные. Лайки действуют до обновления страницы. Сохранения остаются в этом браузере.');
  }));
  for (const element of [image, video]) element.addEventListener('error', () => {
    byId('media-notice').textContent = 'Не удалось загрузить материал. Закройте публикацию и попробуйте открыть её снова.';
    byId('media-notice').hidden = false;
  });
  window.addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (data.posts.some(post => post.id === id)) openPost(id, true);
    else closePost(true);
  });
  renderGrid();
  const initialId = location.hash.slice(1);
  if (data.posts.some(post => post.id === initialId)) openPost(initialId, true);
})();
