// Таймер
let countdown;
// let isRunning = false;

const buttonStart = document.querySelector('.start');
const audio = document.querySelector('audio');
const minutes = document.querySelector('.minutes');
const seconds = document.querySelector('.seconds');
let minutesValue = minutes.textContent;
let secondsValue = seconds.textContent;

// const buttonPause = document.querySelector('.pause');

const pomodoro = (customSeconds) => {
  const start = Date.now();
  const p = document.querySelector('p');

  clearInterval(countdown);

  countdown = setInterval(() => {
    const secondsPassed = Math.floor((Date.now() - start) / 1000);
    const secondsLeft = customSeconds - secondsPassed;
    const remainderSeconds = secondsLeft % 60;
    const minutesLeft = Math.floor(secondsLeft / 60);
    minutes.textContent = `${minutesLeft}`;
    seconds.textContent = `${remainderSeconds < 10 ? 0 : ''}${remainderSeconds}`;
    //p.textContent = timer;
    //document.title = timer;

    if (secondsLeft < 0) {
      clearInterval(countdown);
      minutes.textContent = minutesValue;
      seconds.textContent = secondsValue;
      document.title = '0:00';
      audio.play();
    }
  }, 1000);
};

minutes.addEventListener('input', () => {
  minutesValue = minutes.textContent;
});

seconds.addEventListener('input', () => {
  secondsValue = seconds.textContent;
});

buttonStart.addEventListener('click', () => {
  // isRunning = true;
  pomodoro((Number(minutesValue) * 60) + Number(secondsValue));
});


// Список задач
const input = document.querySelector('.todo-input');
const button = document.querySelector('.todo-add');
const list = document.querySelector('.todo-container');

const addItem = () => {
  if (input.value.length > 0) {
    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";

    const label = document.createElement('label');
    label.append(checkbox);

    label.append(input.value);
    list.append(label);
    input.value = '';
  }
};

button.addEventListener('click', addItem);
input.addEventListener('keyup', e => {
  if (e.keyCode === 13) {
    addItem();
  }
});

