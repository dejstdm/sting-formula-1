import '@fontsource/anton/400.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './style.css';
import { concepts } from './concepts.js';

const root = document.querySelector('#cards');

for (const c of concepts) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <a class="phone" href="/${c.id}/">
      <img src="${c.shot}" width="390" height="844" alt="${c.name} during a Perfect Boost" />
    </a>
    <h2>${c.name}</h2>
    <p class="pitch">${c.pitch}</p>
    <h3>How it’s made</h3>
    <p>${c.how}</p>
    <h3>What it uses</h3>
    <p>${c.uses}</p>
    <p class="meta"><b>${c.size}</b> over the wire. ${c.status}</p>
    <p class="actions">
      <a class="play" href="/${c.id}/">Play</a>
      <a class="as" href="/${c.id}/?name=MAX">Play as MAX</a>
    </p>
  `;
  root.append(card);
}
