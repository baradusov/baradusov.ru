// Получаем элементы
const player = document.querySelector('.player');
const video = document.querySelector('.viewer');
const progress = document.querySelector('.progress');
const progressBar = document.querySelector('.progress__filled');
const toggle = document.querySelector('.toggle');
const skipButtons = document.querySelectorAll('[data-skip]');
const ranges = document.querySelectorAll('.player__slider');
const fullscreenButton = document.querySelector('.player__fullscreen');


// Определяем функции
togglePlay = () => {
  const method = video.paused ? 'play' : 'pause';
  video[method]();
}

const updateButton = (e) => {
  const icon = e.target.paused ? '►' : '❚❚';
  toggle.textContent = icon;
}

const skip = (e) => {
  video.currentTime += parseFloat(e.target.dataset.skip)
}

const handleRangeUpdate = (e) => {
  video[e.target.name] = e.target.value;
}

const handleProgress = () => {
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.style.flexBasis = `${percent}%`;
}

const scrub = (e) => {
  const scrubTime = (e.offsetX / progress.offsetWidth) * video.duration;
  video.currentTime = scrubTime;
}

const toggleFullscreen = () => {
  if (!video.fullscreenElement && !video.mozFullScreenElement && !video.webkitFullscreenElement) {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.mozRequestFullScreen) {
      video.mozRequestFullScreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (video.cancelFullScreen) {
      video.cancelFullScreen();
    } else if (video.mozCancelFullScreen) {
      video.mozCancelFullScreen();
    } else if (video.webkitCancelFullScreen) {
      video.webkitCancelFullScreen();
    }
  }
}

// Слушаем события
video.addEventListener('click', togglePlay);
video.addEventListener('play', updateButton);
video.addEventListener('pause', updateButton);
video.addEventListener('timeupdate', handleProgress);

toggle.addEventListener('click', togglePlay);
skipButtons.forEach(button =>  button.addEventListener('click', skip));
ranges.forEach(range =>  range.addEventListener('change', handleRangeUpdate));
ranges.forEach(range =>  range.addEventListener('mousemove', handleRangeUpdate));

let mousedown = false;
progress.addEventListener('click', scrub);
progress.addEventListener('mousemove', (e) => mousedown && scrub(e));
progress.addEventListener('mousedown', () => mousedown = true);
progress.addEventListener('mouseup', () => mousedown = false);

fullscreenButton.addEventListener('click', toggleFullscreen);
video.addEventListener('dblclick', toggleFullscreen);
