import { useRouter } from 'next/router';
import Link from '@components/Link';

const Header = () => {
  const { pathname } = useRouter();
  const isIndex = () => pathname === '/';

  return (
    <header>
      {isIndex() ? (
        <h1 className="logo">Нуриль Барадусов</h1>
      ) : (
        <p className="logo">
          <Link className="logo" href="/">
            Нуриль Барадусов
          </Link>
        </p>
      )}
    </header>
  );
};

export default Header;
