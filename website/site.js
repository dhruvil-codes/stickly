const base = '/stickly/';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stage = document.querySelector('#sample-desk');
const reset = document.querySelector('#reset-note');
const help = document.querySelector('#demo-help');

function openSample(resetSample = false) {
  if (!stage) return;
  if (!resetSample && stage.querySelector('iframe')) return;
  const iframe = document.createElement('iframe');
  iframe.title = 'Try a sample Stickly note: write, make a checklist, or drag the lower-left corner to peel';
  iframe.src = `${base}play/${resetSample ? '?reset=1' : ''}`;
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  stage.replaceChildren(iframe);
  reset.hidden = false;
  help.textContent = 'Write, or drag the lower-left corner to peel. Click to place. This sample stays in your browser.';
  iframe.addEventListener('load', () => {
    // Keep the sample controls visible after keyboard users open it.
    iframe.focus({ preventScroll: true });
  }, { once: true });
}
document.querySelector('#try-note')?.addEventListener('click', () => openSample());
reset?.addEventListener('click', () => openSample(true));
document.querySelector('#try-peel')?.addEventListener('click', () => openSample());

const peelVideo = document.querySelector('#peel-video');
const peelToggle = document.querySelector('#peel-toggle');
if (peelVideo && peelToggle) {
  const syncLabel = () => {
    const playing = !peelVideo.paused;
    peelToggle.textContent = playing ? 'Pause peel' : 'Play peel';
    peelToggle.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} peel demonstration`);
  };
  peelVideo.addEventListener('play', syncLabel);
  peelVideo.addEventListener('pause', syncLabel);
  let inView = false;
  let userPaused = false;
  peelToggle.addEventListener('click', () => {
    userPaused = !peelVideo.paused;
    if (peelVideo.paused) peelVideo.play().catch(syncLabel);
    else peelVideo.pause();
  });
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView && !reduced.matches && !userPaused && !document.hidden) peelVideo.play().catch(syncLabel);
    else peelVideo.pause();
  }, { threshold: .2 });
  observer.observe(peelVideo);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) peelVideo.pause();
    else if (inView && !reduced.matches && !userPaused) peelVideo.play().catch(syncLabel);
  });
  reduced.addEventListener('change', () => { if (reduced.matches) peelVideo.pause(); });
}

const player = document.querySelector('#product-video');
const caption = document.querySelector('#video-caption');
document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => {
  if (!player || button.getAttribute('aria-pressed') === 'true') return;
  player.pause();
  const desktop = button.dataset.video === 'desktop';
  const name = desktop ? 'native-desktop-demo.mp4' : 'stickly-launch.mp4';
  player.querySelector('source').src = `${base}assets/${name}`;
  player.poster = `${base}assets/${desktop ? 'native-demo-poster.png' : 'launch-poster.png'}`;
  player.setAttribute('aria-label', desktop ? 'Real Stickly Windows app demonstration' : 'Stickly 30-second launch film');
  player.querySelector('track')?.remove();
  if (!desktop) {
    const track = document.createElement('track');
    Object.assign(track, { kind: 'captions', src: `${base}assets/launch-captions.vtt`, srclang: 'en', label: 'English', default: true });
    player.append(track);
  }
  caption.replaceChildren(document.createTextNode(desktop ? 'The real Windows app, over a sample work document. Instrumental audio; no spoken narration. ' : 'A quick introduction, with sound and captions. '));
  const link = document.createElement('a');
  link.href = `${base}assets/${name}`;
  link.textContent = 'Open the video.';
  caption.append(link);
  document.querySelectorAll('[data-video]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  player.load();
}));

if (!reduced.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const media = element.matches('figure,.peel-media,.video-screen,.install-slip');
      element.classList.add(media ? 'arriving-paper' : 'arriving-ink');
      element.addEventListener('animationend', () => element.classList.remove('arriving-paper', 'arriving-ink'), { once: true });
      observer.unobserve(element);
    });
  }, { threshold: .12 });
  document.querySelectorAll('[data-enter]').forEach((element, index) => {
    element.style.setProperty('--arrival-delay', `${index % 3 * 65}ms`);
    observer.observe(element);
  });
}
