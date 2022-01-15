import Link from '@components/Link';
import Head from 'next/head';
import { useState } from 'react';

const Anon = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const sendMessage = (e) => {
    e.preventDefault();

    fetch('/api/anon', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage('');
          setSuccess(true);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  };

  return (
    <>
      <Head>
        <title>Анонимка | Нуриль Барадусов</title>
        <meta name="description" content="Анонимка" />
      </Head>

      <main>
        <h1>Анонимка</h1>

        <form onSubmit={sendMessage}>
          <textarea
            style={{
              width: '100%',
              height: 300,
              padding: 10,
              marginBottom: 10,
              fontSize: 18,
              resize: 'vertical',
            }}
            maxLength="3000"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Сообщение"
          />
          <button
            style={{ padding: '10px 20px' }}
            disabled={!Boolean(message.length)}
          >
            Отправить
          </button>
        </form>
        {error && (
          <p>Что-то случилось и сообщение не отправилось. Скоро починю...</p>
        )}
        {success && (
          <>
            <p>Сообщение отправлено.</p>
            <p>
              Можете ещё и{' '}
              <Link href="/userpic/index.html">аватарку нарисовать</Link>.
            </p>
          </>
        )}
      </main>
    </>
  );
};

export default Anon;
