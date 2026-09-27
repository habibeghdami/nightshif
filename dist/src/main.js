import('./core/game.js')
  .then(({ Game }) => {
    window.__game = new Game();
  })
  .catch((error) => {
    console.error(error);
    document.querySelector('#interface').innerHTML =
      '<div class="fatal"><h1>Unable to start Nightshift</h1><p>Check that the local server is running and your browser supports WebGL 2. Reload to try again.</p><button onclick="location.reload()">RELOAD GAME ↻</button></div>';
  });
