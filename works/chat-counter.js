let counter = 0;
const btn = document.querySelector('[data-react="123.123123.123"]');
const div = document.querySelector('.counter');

btn.addEventListener('click', () => {
  counter += 1;
  div.innerHTML = counter;
});
