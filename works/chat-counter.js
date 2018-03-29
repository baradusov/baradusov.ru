let counter = 0;
const btn = document.querySelector('[data-react="123.123123.123"]');

btn.addEventListener('click', () => {
  counter += 1;
  btn.innerHTML = counter;
});
