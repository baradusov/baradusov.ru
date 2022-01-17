import styles from './index.module.css';

const MessageBox = () => {
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

      <form id="message-box">
        <input
          id="message-box-contact"
          className={styles.input}
          type="text"
          placeholder="Куда ответить (необязательно)"
        />
        <textarea
          id="message-box-body"
          className={styles.textarea}
          maxLength="3000"
          placeholder="Комментарий"
        />
        <button
          id="message-box-button"
          style={{ padding: '10px 20px' }}
          disabled
        >
          Отправить
        </button>
      </form>
      <p id="message-box-info"></p>
    </section>
  );
};

export default MessageBox;
