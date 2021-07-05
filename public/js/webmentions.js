/**
 * Фетчит вебменшены
 * @returns {array} вебменшены
 */
const getWebmentions = async () => {
  const target = document.location.url;
  const response = await fetch(
    `https://webmention.io/api/mentions.jf2?target=https://baradusov.ru${target}`
  );
  const data = await response.json();

  return data.children;
};

/**
 * Создаёт элемент
 * @param {string} type тип элемента
 * @param {object|null} props атрибуты элемента
 * @param  {...string|HTMLElement} children текст или элемент
 * @returns {HTMLElement} элемент
 */
const e = (type, props = {}, ...children) => {
  const element = document.createElement(type);

  for (const prop in props) {
    element.setAttribute(prop, props[prop]);
  }

  for (const child of children) {
    if (typeof child === 'object') {
      element.appendChild(child);
    } else {
      const textNode = document.createTextNode(child);
      element.appendChild(textNode);
    }
  }

  return element;
};

/**
 * Рендерит приложение
 * @param {HTMLElement} container рут-элемент
 * @param {object} state всё состояние приложения
 * @param  {...function} components
 */
const render = (container, state, ...components) => {
  for (const component of components) {
    const node = component(state);
    if (node) {
      container.appendChild(node);
    }
  }
};

const app = async (root) => {
  const webmentions = await getWebmentions();
  const likesData = webmentions.filter((wm) => wm['wm-property'] === 'like-of');
  const repliesData = webmentions.filter(
    (wm) => wm['wm-property'] === 'in-reply-to'
  );

  let state = {
    likes: likesData,
    replies: repliesData,
  };

  const likesComponent = ({ likes }) => {
    if (likes.length === 0) return null;

    const likesElements = likes.map((like) => {
      return e(
        'li',
        { class: 'p-like h-cite' },
        e(
          'a',
          { class: 'p-author h-card', href: like.url },
          e('img', {
            class: 'u-photo',
            width: '36',
            height: 36,
            src: like.author.photo,
          })
        )
      );
    });

    return e(
      'div',
      { class: 'likes' },
      e('h2', null, 'Лайки'),
      e('ul', null, ...likesElements)
    );
  };

  const repliesComponent = ({ replies }) => {
    if (replies.length === 0) return null;

    const repliesElements = replies.map((reply) => {
      return e(
        'li',
        { class: 'p-comment h-cite' },
        e(
          reply.author.url ? 'a' : 'p',
          {
            class: 'p-author h-card p-name u-url',
            href: reply.author.url,
          },
          reply.author.name
        ),
        e('p', { class: 'e-content' }, reply.content.text),
        e(
          'a',
          { class: 'u-url', href: reply.url },
          e(
            'time',
            { class: 'dt-published', datetime: reply['wm-received'] },
            reply['wm-received']
          )
        )
      );
    });

    return e(
      'div',
      { class: 'replies' },
      e('h2', null, 'Ответы'),
      e('ul', null, ...repliesElements)
    );
  };

  render(root, state, likesComponent, repliesComponent);
};

const root = document.querySelector('#webmentions');
app(root);
