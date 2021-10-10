import Link from '@components/Link';

const About = () => {
  return (
    <section className="h-card">
      <a className="p-name u-url hidden" href="https://baradusov.ru">
        Нуриль Барадусов
      </a>
      <p className="p-note">
        Фронтендер из <s>Самары</s> → Санкт-Петербурга.
      </p>
      <p>
        Я есть в{' '}
        <Link href="https://twitter.com/baradusov" rel="me">
          твиттере
        </Link>
        ,{' '}
        <Link href="https://www.instagram.com/baradusov/" rel="me">
          инстаграме
        </Link>{' '}
        и{' '}
        <Link href="https://github.com/baradusov" rel="me">
          гитхабе
        </Link>
        .
      </p>
      <p>
        Связь — 
        <Link href="https://t.me/baradusov">телеграм</Link> и почта{' '}
        <Link href="mailto:baradusovnh@gmail.com" className="u-email">
          baradusovnh@gmail.com
        </Link>
        .
      </p>
      <p>
        Веду список просмотренных <Link href="/movies">фильмов</Link> и
        прочитанных <Link href="/books">книг</Link>.
      </p>
      <p>
        Ещё можете посмотреть{' '}
        <Link href="/music">самые прослушиваемые мной треки</Link> на спотифай.
      </p>
      <p>
        И даже можно <a href="/userpic/index.html">нарисовать мне аватар</a> для
        твиттера.
      </p>
    </section>
  );
};

export default About;
