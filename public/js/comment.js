(() => {
  const texts = {
    error: 'Что-то случилось и сообщение не отправилось. Скоро починю...',
    success: 'Сообщение отправлено.',
  };

  const formEl = document.querySelector('#message-box');
  const contactEl = document.querySelector('#message-box-contact');
  const messageEl = document.querySelector('#message-box-body');
  const submitButton = document.querySelector('#message-box-button');
  const infoEl = document.querySelector('#message-box-info');

  const state = {
    message: '',
    contact: '',
    error: false,
    success: false,
  };

  const setMessage = (value) => {
    state.message = value;
    messageEl.value = value;
  };

  const setContact = (value) => {
    state.contact = value;
    contactEl.value = value;
  };

  const showSuccess = (value) => {
    state.success = value;
    infoEl.textContent = texts.success;
  };

  const showError = () => {
    state.error = true;
    infoEl.textContent = texts.error;
  };

  const handleButtonState = () => {
    if (state.message.length > 0) {
      submitButton.removeAttribute('disabled');
    } else {
      submitButton.setAttribute('disabled', true);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();

    fetch('/api/anon', {
      method: 'POST',
      body: JSON.stringify({
        contact: state.contact,
        message: state.message,
        url: window.location.href,
      }),
    })
      .then((response) => {
        if (response.ok) {
          setMessage('');
          showSuccess();
          handleButtonState();
        } else {
          showError();
        }
      })
      .catch(() => showError());
  };

  const handleMessageChange = (e) => {
    setMessage(e.currentTarget.value);
    handleButtonState();
  };

  formEl.addEventListener('submit', sendMessage);
  contactEl.addEventListener('input', (e) => setContact(e.currentTarget.value));
  messageEl.addEventListener('input', handleMessageChange);
})();
