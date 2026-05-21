const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function startDev() {
  console.log('🚀 Starting Vite dev server...');
  const dev = spawn('npm', ['run', 'dev'], { cwd: __dirname, detached: true, stdio: 'ignore' });
  dev.unref();
  await new Promise(r => setTimeout(r, 5000)); // wait for server
  return dev;
}

async function captureScreenshots() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const shots = [];
  async function snap(name) {
    const file = `screenshot_${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
    console.log('📸', file);
  }
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await snap('online_home');
  // navigate to core pages (adjust selectors if needed)
  const navs = [
    { href: '/ccrops', name: 'online_crops' },
    { href: '/soil', name: 'online_soil' },
    { href: '/fertilizer', name: 'online_fertilizer' },
    { href: '/scan', name: 'online_scan' },
  ];
  for (const { href, name } of navs) {
    await page.goto(`http://localhost:5173${href}`, { waitUntil: 'networkidle2' });
    await snap(name);
  }
  // switch to offline
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  console.log('🌐 Offline mode enabled');
  await page.reload({ waitUntil: 'networkidle2' });
  await snap('offline_home');
  for (const { href, name } of navs) {
    await page.goto(`http://localhost:5173${href}`, { waitUntil: 'networkidle2' });
    await snap(name.replace('online', 'offline'));
  }
  await browser.close();
  return shots;
}

async function makeVideo(frames) {
  const listFile = 'ffmpeg_list.txt';
  fs.writeFileSync(listFile, frames.map(f => `file '${f}'`).join('\n'));
  console.log('▶️ Creating video...');
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-r', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'offline_demo.mp4'], { cwd: __dirname, stdio: 'inherit' });
    ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg failed'))));
  });
  console.log('✅ Video generated: offline_demo.mp4');
}

(async () => {
  const dev = await startDev();
  const frames = await captureScreenshots();
  await makeVideo(frames);
  // stop dev server
  process.kill(-dev.pid, 'SIGTERM');
})();
