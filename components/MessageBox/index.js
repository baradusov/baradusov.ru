import { useState } from 'react';

import styles from './index.module.css';

const MessageBox = () => {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const sendMessage = (e) => {
    e.preventDefault();

    fetch('/api/anon', {
      method: 'POST',
      body: JSON.stringify({
        contact: contact,
        message: message,
        url: window.location.href,
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
    <section className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Анонимный комментарий</h2>
        <p className={styles.description}>
          Если в тексте ошибки или вы просто хотите что-то мне сказать по поводу
          написанного, можете отправить комментарий. А если хотите, чтобы я
          ответил, то оставьте свои контакты.
        </p>
        <p className={styles.description}>Сообщение придёт мне в телеграм.</p>
      </div>

      <form onSubmit={sendMessage}>
        <input
          className={styles.input}
          type="text"
          value={contact}
          placeholder="Куда ответить (необязательно)"
          onChange={(e) => setContact(e.target.value)}
        />
        <textarea
          className={styles.textarea}
          maxLength="3000"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Комментарий"
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
      {success && <p>Сообщение отправлено.</p>}
    </section>
  );
};

export default MessageBox;
