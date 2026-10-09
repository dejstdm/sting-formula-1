import qrcode from 'qrcode-generator';
import './style.css';
import { earlier } from './concepts.js';

// The QR code opens the device test on whatever site this page came from: the test
// deployment, or a local preview opened on the network address.
const qr = qrcode(0, 'M');
qr.addData(new URL('/concept-4/?debug', location.href).href);
qr.make();
document.querySelector('#qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });

const root = document.querySelector('#earlier');

for (const c of earlier) {
  const card = document.createElement('a');
  card.className = 'mini';
  card.href = `/${c.id}/`;
  card.innerHTML = `
    <img src="${c.shot}" width="390" height="844" alt="" loading="lazy" />
    <span class="mini__text">
      <b>${c.name}</b>
      <span>${c.pitch}</span>
      <small>${c.uses}</small>
    </span>
  `;
  root.append(card);
}
