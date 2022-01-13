import { useRouter } from 'next/router';
import Link from '@components/Link';

const Header = () => {
  const { pathname } = useRouter();
  const isIndex = () => pathname === '/';

  return (
    <header>
      {isIndex() ? (
        <h1 className="logo">● Нуриль Барадусов</h1>
      ) : (
        <Link className="logo logo-link" href="/">
          <span>← Нуриль Барадусов</span>
        </Link>
      )}
    </header>
  );
};

export default Header;
