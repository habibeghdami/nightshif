import { VEHICLES } from '../vehicles/data.js';
import { GARAGES, districtAt } from '../world/data.js';
export const money = (v) => Math.round(v).toLocaleString('en-US');
export const time = (v) =>
  `${Math.floor(v / 60)
    .toString()
    .padStart(2, '0')}:${(v % 60).toFixed(2).padStart(5, '0')}`;
const tunes = [
  ['engine', 'Engine output', 'Power · torque · acceleration', 0, 100],
  ['brakes', 'Brake pressure', 'Stopping force', 0, 100],
  ['tires', 'Tire compound', 'Slide ← → grip', 0, 100],
  ['height', 'Ride height', 'Low ← → raised', -35, 40],
  ['stiffness', 'Spring rate', 'Soft ← → firm', 0, 100],
  ['damping', 'Damper rate', 'Weight transfer control', 0, 100],
  ['steering', 'Steering response', 'Angle · turn-in response', 0, 100],
];
export class GameUI {
  constructor(game) {
    this.game = game;
    this.tab = 'fleet';
    this.root = document.querySelector('#interface');
    this.root.innerHTML = `
 <div class="vignette"></div><header class="topbar"><a class="brand" href="#" aria-label="Pause Nightshift"><span class="brand-icon">N</span><span>NIGHTSHIFT<small>MERIDIAN / AFTER HOURS</small></span></a><div class="session"><i></i><span id="session-label">FREE ROAM</span><b>19:42</b></div><div class="wallet"><span class="tiny">STREET CREDITS</span><strong><em>₡</em> <span id="credits">18,000</span></strong><button data-action="pause" class="icon-button" aria-label="Pause">Ⅱ</button></div></header>
 <section id="drive-hud"><div class="objective"><span class="eyebrow">THE CITY IS YOURS</span><h2 id="objective-title">Find your next rush.</h2><p id="objective-detail">Explore Meridian. Make a name for yourself.</p><button data-action="map" class="text-button"><kbd>M</kbd> OPEN WORLD MAP <span>↗</span></button></div><div class="location"><span class="compass">N</span><div><span class="tiny">MERIDIAN CITY</span><b id="district">HARBOR DISTRICT</b></div></div>
 <div id="race-hud" hidden></div><div id="countdown"></div><div id="interaction"></div><div class="minimap-wrap"><div class="map-top"><span>◈ &nbsp; LIVE MAP</span><button data-action="map" aria-label="Expand map">↗</button></div><canvas id="minimap" width="260" height="210"></canvas><div class="map-bottom"><i></i><span id="map-caption">HARBOR DISTRICT</span><span>1:2400</span></div></div>
 <div class="car-label"><span class="class-badge" id="car-class">A</span><div><span id="car-brand" class="tiny">KASAI / 2026</span><b id="car-name">VANTA GT</b></div></div><div class="speedometer"><div class="rpm-strip" id="rpm-strip">${'<i></i>'.repeat(24)}</div><div class="speed-line"><span class="gear" id="gear">1</span><span id="speed">000</span><span class="speed-unit">KM/H<span id="rpm">900 RPM</span></span></div><div class="meter-row"><span>N₂O</span><div class="meter"><i id="nitro-fill"></i></div><kbd>SHIFT</kbd></div><div class="meter-row condition"><span>◇</span><div class="meter"><i id="health-fill"></i></div><b id="health">100%</b></div></div><footer class="drive-controls"><span><kbd>W A S D</kbd> DRIVE</span><span><kbd>SPACE</kbd> HANDBRAKE</span><span><kbd>C</kbd> CAMERA</span><span><kbd>ESC</kbd> PAUSE</span></footer></section>
 <section id="panel" hidden></section><div id="toast" role="status"></div><pre id="debug" hidden></pre><div id="touch-controls"><button data-touch="left">◀</button><button data-touch="right">▶</button><button data-touch="brake">BRAKE</button><button data-touch="throttle">GAS</button></div>`;
    this.$ = (id) => document.getElementById(id);
    this.panel = this.$('panel');
    this.rpmBars = [...this.$('rpm-strip').children];
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b) {
        game.audio?.ui();
        this.action(b.dataset.action, b.dataset.value);
      }
    });
    this.root.querySelector('.brand').addEventListener('click', (e) => {
      e.preventDefault();
      game.setMode('pause');
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.tune) {
        game.tune(el.dataset.tune, Number(el.value));
        el.parentElement.querySelector('output').value = el.value;
        this.updateStats();
      }
      if (el.dataset.style)
        game.customize(el.dataset.style, el.type === 'checkbox' ? el.checked : el.value);
      if (el.dataset.setting)
        game.setting(
          el.dataset.setting,
          el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value,
        );
    });
    for (const b of this.root.querySelectorAll('[data-touch]')) {
      b.addEventListener('pointerdown', (e) => {
        b.setPointerCapture(e.pointerId);
        game.input.touch[b.dataset.touch] = true;
      });
      for (const event of ['pointerup', 'pointercancel'])
        b.addEventListener(event, () => (game.input.touch[b.dataset.touch] = false));
    }
  }
  action(a, value) {
    const g = this.game;
    if (a === 'interact') {
      if (g.mode === 'drive') g.interact();
    } else if (a === 'drive') {
      g.audio?.start();
      g.setMode('drive');
    } else if (a === 'pause') g.setMode(g.mode === 'pause' ? 'drive' : 'pause');
    else if (a === 'map') g.setMode('map');
    else if (a === 'close') g.setMode('drive');
    else if (a === 'repair') {
      g.repair();
      this.garage();
    } else if (a === 'recover') g.recover();
    else if (a === 'tab') {
      this.tab = value;
      this.garage();
    } else if (a === 'vehicle') {
      g.switchVehicle(value);
      this.garage();
    } else if (a === 'paint') {
      g.customize('paint', value);
      this.garage();
    } else if (a === 'wheels') {
      g.customize('wheels', Number(value));
      this.garage();
    } else if (a === 'abandon') {
      g.races?.cancel();
      g.setMode('drive');
      g.notify('Event abandoned. Explore at your own pace.');
    } else if (a === 'restart') g.restartRace();
    else if (a === 'navigate') g.navigateTo(value);
    else if (a === 'clear-route') {
      g.navigation?.clear();
      g.notify('Route cleared');
    } else if (a === 'zoom-in') g.mapView?.zoom(1.25);
    else if (a === 'zoom-out') g.mapView?.zoom(0.8);
    else if (a === 'center-map') g.mapView?.center();
  }
  show(mode) {
    this.$('drive-hud').hidden = mode !== 'drive';
    this.panel.hidden = mode === 'drive';
    this.$('touch-controls').classList.toggle('active', mode === 'drive');
    this.$('session-label').textContent =
      mode === 'garage'
        ? 'IN THE WORKSHOP'
        : mode === 'drive'
          ? 'FREE ROAM'
          : mode === 'map'
            ? 'WORLD MAP'
            : 'MERIDIAN ONLINE';
    if (mode === 'title') this.title();
    if (mode === 'garage') this.garage();
    if (mode === 'pause') this.pause();
    if (mode === 'map') this.map();
    if (mode === 'results') this.results();
  }
  title() {
    this.panel.className = 'title-panel';
    this.panel.innerHTML = `<div class="title-copy"><span class="eyebrow"><i class="status-dot"></i> AN OPEN CITY. AN OPEN INVITATION.</span><h1>OWN THE<br><em>AFTER</em><br>HOURS<span>®</span></h1><p>No finish line in sight.<br>Just you, the streets, and what comes next.</p><button class="primary start-button" data-action="drive">ENTER MERIDIAN <span>↗</span></button><div class="title-meta"><span>01 / FREE ROAM</span><span>3 CARS · 5 EVENTS · ONE CITY</span></div></div><div class="title-side"><span>AVAILABLE NOW</span><b>${this.game.vehicle.data.name}</b><small>BUILT FOR THE LONG WAY HOME.</small></div><div class="title-bottom"><span>WASD / DRIVE &nbsp; · &nbsp; SPACE / DRIFT &nbsp; · &nbsp; SHIFT / NITROUS</span><span>HEADPHONES RECOMMENDED &nbsp; ◖◗</span></div>`;
  }
  garage() {
    const g = this.game,
      v = g.vehicle,
      c = v.custom;
    this.panel.className = 'garage-panel';
    this.panel.innerHTML = `<div class="panel-heading"><div><span class="eyebrow">${g.activeGarage?.name || 'HARBOR WORKS'} / SERVICE BAY 01</span><h1>MAKE IT YOURS.</h1></div><button data-action="close" class="close">BACK TO STREETS ↗</button></div><div class="garage-layout"><div class="garage-sidebar"><div class="garage-condition"><span>VEHICLE CONDITION</span><b>${Math.round(v.damage.health)}<small>%</small></b><div class="health-track"><i style="width:${v.damage.health}%"></i></div><button data-action="repair" class="secondary">↻ &nbsp; REPAIR VEHICLE <span>COMPLIMENTARY</span></button></div><nav class="tabs">${['fleet', 'tune', 'style'].map((t) => `<button data-action="tab" data-value="${t}" class="${this.tab === t ? 'selected' : ''}">${t === 'fleet' ? 'MY RIDES' : t === 'tune' ? 'PERFORMANCE' : 'APPEARANCE'}</button>`).join('')}</nav><div class="garage-content">${
      this.tab === 'fleet'
        ? VEHICLES.map(
            (d) =>
              `<button data-action="vehicle" data-value="${d.id}" class="vehicle-card ${v.data.id === d.id ? 'selected' : ''}"><span class="class-badge">${d.class}</span><div><small>${d.brand} / ${d.type}</small><b>${d.name}</b><span>${g.profile.unlocked.includes(d.id) ? (v.data.id === d.id ? 'CURRENT VEHICLE' : 'OWNED · SELECT') : g.profile.settings.infiniteMoney ? 'UNLOCK / FREE ∞' : 'UNLOCK / ₡ ' + money(d.price)}</span></div><span>↗</span></button>`,
          ).join('')
        : this.tab === 'tune'
          ? `<p class="panel-note">Live setup. All adjustments change driving behavior. Workshop tuning is included.</p>${tunes.map(([key, label, sub, min, max]) => `<label class="tune-row"><span>${label}<output>${c.tune[key]}</output><small>${sub}</small></span><input aria-label="${label}" type="range" min="${min}" max="${max}" step="1" value="${c.tune[key]}" data-tune="${key}"></label>`).join('')}`
          : `<span class="eyebrow">FACTORY FINISHES</span><div class="swatches">${['#d7f44e', '#ee684d', '#b9c9ee', '#eee7d8', '#2a454d', '#a66fb0', '#20242a'].map((color) => `<button aria-label="Paint ${color}" data-action="paint" data-value="${color}" style="--swatch:${color}" class="${c.paint === color ? 'selected' : ''}"></button>`).join('')}</div><label class="color-picker">CUSTOM PAINT <input type="color" value="${c.paint}" data-style="paint" aria-label="Custom paint"></label><span class="eyebrow">WHEEL FINISH</span><div class="button-row">${['Alloy', 'Bronze', 'Graphite'].map((n, i) => `<button class="${c.wheels === i ? 'selected' : ''}" data-action="wheels" data-value="${i}">${n}</button>`).join('')}</div>${[
              ['spoiler', 'Aero spoiler'],
              ['decal', 'Twin racing stripes'],
              ['lighting', 'Lime underglow'],
            ]
              .map(
                ([key, label]) =>
                  `<label class="toggle">${label}<input type="checkbox" data-style="${key}" ${c[key] ? 'checked' : ''}></label>`,
              )
              .join('')}`
    }</div></div><div class="garage-stage"><div class="stage-title"><span class="eyebrow">${v.data.brand} / ${v.data.year}</span><h2>${v.data.name}</h2><span class="class-badge">${v.data.class}</span></div><div class="vehicle-stats" id="vehicle-stats"></div><span class="stage-caption">LIVE VEHICLE PREVIEW / CHANGES SAVED AUTOMATICALLY</span></div></div>`;
    this.updateStats();
  }
  updateStats() {
    const el = this.$('vehicle-stats');
    if (!el) return;
    const s = this.game.vehicle.stats;
    el.innerHTML = `<div><b>${Math.round(s.power)}</b><span>POWER / HP</span></div><div><b>${Math.round(s.maxSpeed * 3.6)}</b><span>TOP SPEED / KMH</span></div><div><b>${Math.round(s.torque)}</b><span>TORQUE / NM</span></div><div><b>${Math.round((s.height + 0.28) * 1000)}</b><span>CLEARANCE / MM</span></div>`;
  }
  pause() {
    const g = this.game;
    this.panel.className = 'pause-panel';
    this.panel.innerHTML = `<div class="pause-card"><span class="eyebrow">TAKE A BREATHER</span><h1>NIGHT ON HOLD.</h1><p>Your progress is saved automatically.</p><button class="primary" data-action="drive">RESUME DRIVE <span>↗</span></button><button class="secondary" data-action="map">WORLD MAP <span>M</span></button><button class="secondary" data-action="recover">RECOVER TO GARAGE <span>${g.profile.settings.infiniteMoney ? 'FREE ∞' : '₡ ' + Math.min(600, g.profile.money)}</span></button>${g.races?.active ? '<button class="secondary" data-action="restart">RESTART EVENT ↻</button><button class="secondary" data-action="abandon">ABANDON EVENT ×</button>' : ''}<div class="settings"><span class="eyebrow">PREFERENCES</span><label>Graphics<select data-setting="quality" aria-label="Graphics quality">${['low', 'medium', 'high'].map((q) => `<option ${q === g.profile.settings.quality ? 'selected' : ''}>${q}</option>`).join('')}</select></label><label>Volume<input type="range" min="0" max="1" step=".05" value="${g.profile.settings.volume}" data-setting="volume" aria-label="Audio volume"></label><label class="toggle">Camera shake<input type="checkbox" data-setting="shake" ${g.profile.settings.shake ? 'checked' : ''}></label><label class="toggle">Infinite money · پول بی‌نهایت<input type="checkbox" data-setting="infiniteMoney" ${g.profile.settings.infiniteMoney ? 'checked' : ''}></label></div><p class="controls-note">WASD / arrows — drive · Space — handbrake<br>Shift — nitrous · C — camera · E — interact<br>M — map · R — recovery · F3 — diagnostics<br>Gamepad: left stick, triggers, A brake, B nitrous</p></div>`;
  }
  map() {
    const g = this.game;
    this.panel.className = 'map-panel';
    this.panel.innerHTML = `<div class="panel-heading"><div><span class="eyebrow">EXPLORE / COMPETE / BUILD</span><h1>MERIDIAN CITY.</h1></div><button class="close" data-action="close">BACK TO STREETS ↗</button></div><div class="map-layout"><div class="map-sidebar"><span class="eyebrow">TONIGHT'S LINEUP</span>${(g.races?.events || []).map((e) => `<button class="event-card" data-action="navigate" data-value="race:${e.id}"><span class="event-icon">${e.icon}</span><div><small>${e.type.toUpperCase()} ${g.profile.completed.includes(e.id) ? ' / COMPLETE' : ''}</small><b>${e.name}</b><span>${e.distance} KM &nbsp; · &nbsp; ₡ ${money(e.reward)}</span></div><span>↗</span></button>`).join('')}<span class="eyebrow">WORKSHOPS</span>${GARAGES.map((g) => `<button class="garage-link" data-action="navigate" data-value="garage:${g.id}"><span>⌂</span>${g.name}<span>↗</span></button>`).join('')}<button class="text-button" data-action="clear-route">CLEAR ROUTE ×</button></div><div class="world-map"><canvas id="world-map"></canvas><div class="map-tools"><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="center-map" aria-label="Center on player">◎</button></div><div class="map-legend"><span><i class="lime"></i> EVENT</span><span><i class="teal"></i> GARAGE</span><span>▲ YOU</span></div><div class="map-help">DRAG TO PAN / SCROLL TO ZOOM / SELECT A LOCATION</div></div></div>`;
    g.attachMap?.();
  }
  results() {
    const r = this.game.races.result;
    this.panel.className = 'results-panel';
    this.panel.innerHTML = `<div class="results-card"><span class="eyebrow">${r.event.name} / EVENT COMPLETE</span><h1>${r.won ? 'NIGHT. OWNED.' : 'KEEP CHASING.'}</h1><div class="result-number">${r.event.type === 'speed challenge' ? Math.round(r.peak * 3.6) + '<small> KM/H</small>' : time(r.time)}</div><p>${r.message}</p><div class="result-reward"><span>EVENT REWARD</span><b>₡ ${money(r.reward)}</b></div><button data-action="drive" class="primary">BACK TO THE CITY <span>↗</span></button><button data-action="restart" class="secondary">RUN IT AGAIN <span>↻</span></button></div>`;
  }
  update() {
    const g = this.game,
      v = g.vehicle;
    this.$('credits').textContent = g.profile.settings.infiniteMoney ? '∞' : money(g.profile.money);
    this.$('speed').textContent = Math.round(Math.abs(v.speed) * 3.6)
      .toString()
      .padStart(3, '0');
    this.$('gear').textContent = v.gear < 0 ? 'R' : v.gear;
    this.$('rpm').textContent = `${Math.round(v.rpm / 100) * 100} RPM`;
    this.$('health').textContent = `${Math.round(v.damage.health)}%`;
    this.$('health-fill').style.width = v.damage.health + '%';
    this.$('health-fill').style.background = v.damage.health < 25 ? '#ff765e' : '#d8e5df';
    this.$('nitro-fill').style.width = v.nitro + '%';
    for (let i = 0; i < 24; i++) this.rpmBars[i].classList.toggle('lit', i < (v.rpm / 8000) * 24);
    this.$('district').textContent = this.$('map-caption').textContent = districtAt(v.x, v.z);
    this.$('car-class').textContent = v.data.class;
    this.$('car-brand').textContent = `${v.data.brand} / ${v.data.year}`;
    this.$('car-name').textContent = v.data.name;
    const interaction = g.getInteraction();
    this.$('interaction').innerHTML = v.damage.disabled
      ? '<div class="critical">VEHICLE DISABLED <span><kbd>R</kbd> RECOVER TO GARAGE</span></div>'
      : interaction
        ? `<button data-action="interact"><kbd>E</kbd> ${interaction.label}</button>`
        : '';
    if (g.races?.active) this.$('session-label').textContent = 'EVENT IN PROGRESS';
    g.updateRaceHUD?.();
    const nav = g.navigation;
    if (nav?.target && !g.races?.active) {
      this.$('objective-title').textContent = nav.target.name;
      this.$('objective-detail').textContent =
        `${(nav.length / 1000).toFixed(2)} km to destination · follow the lime route`;
    } else if (!g.races?.active) {
      this.$('objective-title').textContent = 'Find your next rush.';
      this.$('objective-detail').textContent = 'Explore Meridian. Make a name for yourself.';
    }
    this.$('debug').hidden = !g.debug;
    if (g.debug)
      this.$('debug').textContent =
        `${(1000 / g.loop.frameMs).toFixed(0)} FPS / ${g.loop.frameMs.toFixed(1)} MS\nDRAW ${g.renderer.info.render.calls} / TRI ${g.renderer.info.render.triangles.toLocaleString()}\nTRAFFIC ${g.traffic.cars.length} / CHUNKS ${g.world.chunks.filter((c) => c.visible).length}\nPOS ${v.x.toFixed(1)}, ${v.z.toFixed(1)} / SLIP ${v.slip.toFixed(2)}\nGRIP ${v.stats.grip.toFixed(2)} / HEALTH ${v.damage.health.toFixed(1)}\nGEOMETRY ${g.renderer.info.memory.geometries} / TEXTURES ${g.renderer.info.memory.textures}`;
  }
  notify(text) {
    this.$('toast').textContent = text;
    this.$('toast').classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.$('toast').classList.remove('show'), 3500);
  }
}
