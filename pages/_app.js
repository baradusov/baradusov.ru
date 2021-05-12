import Header from '@components/Header';
import Footer from '@components/Footer';
import '../styles/globals.css';

const MyApp = ({ Component, pageProps }) => {
  return (
    <div className="container">
      <div className="content">
        <Header />
        <Component {...pageProps} />
      </div>
      <Footer />
    </div>
  );
};

export default MyApp;
