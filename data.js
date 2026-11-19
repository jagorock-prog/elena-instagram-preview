/* Initial materials restored from the approved profile concept.
   Add real carousel slides and MP4 files to media[] when content is ready. */
globalThis.ELENA_DATA = {
  username: '__elena_zaitseva___',
  avatar: 'assets/avatar.png',
  highlights: [
    { title: 'Проекты', letter: 'П', background: '#f2eadf', color: '#4b3328' },
    { title: 'Цех', letter: 'Ц', background: '#c29258', color: '#4b3328' },
    { title: 'Процесс', letter: 'П', background: '#31506f', color: '#f2eadf' },
    { title: 'Материалы', letter: 'М', background: '#4b3328', color: '#f2eadf' },
    { title: 'Обо мне', letter: 'Е', background: '#d3a6a3', color: '#4b3328' },
    { title: 'Отзывы', letter: 'О', background: '#f2eadf', color: '#4b3328' }
  ],
  posts: [
    { id: 'post-01', type: 'image', pinned: true, title: 'Как мебель собирает пространство', alt: 'Интерьер ресторана с деревянными столами и мягкой мебелью' },
    { id: 'post-02', type: 'carousel', pinned: true, title: 'Что учесть в мебели для ресторана', alt: 'Обложка со стулом: проверки мебели для ресторана' },
    { id: 'post-03', type: 'reel', pinned: true, title: 'Почему я считаю цену после чертежей', alt: 'Елена Зайцева: обложка Reels о расчёте мебели' },
    { id: 'post-04', type: 'image', title: 'Ресепшен: рабочий узел, а не декор', alt: 'Ресепшен в коммерческом интерьере' },
    { id: 'post-05', type: 'image', title: 'Мебель должна работать каждый день', alt: 'Типографическая карточка о мебели' },
    { id: 'post-06', type: 'carousel', title: 'Один проект — сотни деталей', alt: 'Обложка карусели с деталями интерьерного проекта' },
    { id: 'post-07', type: 'image', title: 'Интерьер начинается с планировки', alt: 'Светлый интерьер с обеденными столами' },
    { id: 'post-08', type: 'carousel', title: 'Мягкая мебель в интерьере', alt: 'Подборка кресел и модульного дивана' },
    { id: 'post-09', type: 'image', title: 'Дерево и камень: как сочетать материалы', alt: 'Дерево и зелёный камень в интерьере' }
  ].map(post => ({
    cover: post.cover || `assets/${post.id}.png`,
    thumbnail: post.thumbnail || post.cover || `assets/thumbs/${post.id}.webp`,
    media: [{ type: 'image', src: post.cover || `assets/${post.id}.png`, alt: post.alt }],
    caption: 'Сохранённый макет публикации. Подпись добавим на этапе подготовки контента.',
    notice: post.type === 'reel'
      ? 'Пока готова обложка. Видео появится после подготовки контента.'
      : post.type === 'carousel'
        ? 'Пока готова обложка. Остальные слайды добавим при подготовке карусели.'
        : '',
    ...post
  }))
};
