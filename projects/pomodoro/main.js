let countdown;
// let isRunning = false;

const buttonStart = document.querySelector('.start');
const audio = document.querySelector('audio');
const minutes = document.querySelector('.minutes');
let minutesValue = minutes.textContent;
const seconds = document.querySelector('.seconds');
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
    const timer = `${minutesLeft}:${remainderSeconds < 10 ? 0 : ''}${remainderSeconds}`;

    p.textContent = timer;
    document.title = timer;

    if (secondsLeft < 0) {
      clearInterval(countdown);
      p.textContent = '0:00';
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
