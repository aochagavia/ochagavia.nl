let canvas = document.getElementById('canvas');
canvas.tabIndex = 1;
canvas.width = canvas.offsetWidth;
let ctx = canvas.getContext('2d');
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "orange";
ctx.textBaseline = "top";
ctx.font = "32px sans-serif";
ctx.fillText('Click on the canvas to play', 60, 130)

let running = false;
canvas.addEventListener('click', () => {
  if (!running) {
    running = true;
  } else {
    running = false;
    return;
  }

  // Returns an object containing resources that will be used later for drawing
  function resources() {
    let res = {
      player: document.createElement('canvas'),
      enemy: document.createElement('canvas'),
      bullet: document.createElement('canvas'),
      particle: document.createElement('canvas')
    }

    // Particle
    res.particle.width = 20;
    res.particle.height = 20;
    let pCtx = res.particle.getContext('2d');
    pCtx.fillStyle = "darkviolet";
    pCtx.beginPath();
    pCtx.arc(10, 10, 10, 0, 2 * Math.PI);
    pCtx.fill();

    // Bullet
    res.bullet.width = 6;
    res.bullet.height = 6;
    let bCtx = res.bullet.getContext('2d');
    bCtx.fillStyle = "blue";
    bCtx.beginPath();
    bCtx.arc(3, 3, 3, 0, 2 * Math.PI);
    bCtx.fill();

    // Enemy
    res.enemy.width = 20;
    res.enemy.height = 20;
    let eCtx = res.enemy.getContext('2d');
    eCtx.fillStyle = "yellow";
    eCtx.beginPath();
    eCtx.arc(10, 10, 10, 0, 2 * Math.PI);
    eCtx.fill();

    // Player
    res.player.width = 20;
    res.player.height = 16;
    let plCtx = res.player.getContext('2d');
    plCtx.fillStyle = "red";
    plCtx.beginPath();
    plCtx.lineTo(20, 8);
    plCtx.lineTo(0, 16);
    plCtx.lineTo(0, 0);
    plCtx.fill();

    return res;
  }

  function imports() {
    const res = resources();
    var ctx = canvas.getContext("2d");

    function clear_screen() {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function draw_player(x, y, angle) {
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.translate(0, -8);
      ctx.drawImage(res.player, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      ctx.fillStyle = "black";
    }

    function draw_enemy(x, y) {
      ctx.drawImage(res.enemy, x - 10, y - 10);
    }

    function draw_bullet(x, y) {
      ctx.drawImage(res.bullet, x - 3, y - 3);
    }

    function draw_particle(x, y, radius) {
      ctx.drawImage(res.particle, x - radius, y - radius, 2 * radius, 2 * radius);
    }

    function draw_score(x) {
      ctx.fillStyle = "orange";
      ctx.textBaseline = "top";
      ctx.font = "20px sans-serif";
      ctx.fillText('Score: ' + x, 10, 10)
    }

    // The real loading and running of our wasm starts here
    let imports = { clear_screen, draw_player, draw_enemy, draw_bullet, draw_particle, draw_score };
    imports.Math_atan = Math.atan;
    imports.sin = Math.sin;
    imports.cos = Math.cos;
    return imports;
  }

  // Fetch and instantiate our wasm module
  fetch("/js/rocket.wasm").then(response =>
    response.arrayBuffer()
  ).then(bytes =>
    WebAssembly.instantiate(bytes, { env: imports() })
  ).then(results => {
    let module = {};
    let mod = results.instance;
    module.update = mod.exports.update;
    module.toggle_shoot = mod.exports.toggle_shoot;
    module.toggle_boost = mod.exports.toggle_boost;
    module.toggle_turn_left = mod.exports.toggle_turn_left;
    module.toggle_turn_right = mod.exports.toggle_turn_right;
    module.resize = mod.exports.resize;
    module.draw = mod.exports.draw;

    // Input processing
    function processKey(key, b) {
      switch (key) {
        case "ArrowLeft":
          module.toggle_turn_left(b);
          break;
        case "ArrowRight":
          module.toggle_turn_right(b);
          break;
        case "ArrowUp":
          module.toggle_boost(b);
          break;
        case " ":
          module.toggle_shoot(b);
          break;
      }
    }
    canvas.addEventListener('keydown', e => { processKey(e.key, true); e.preventDefault(); });
    canvas.addEventListener('keyup', e => { processKey(e.key, false); e.preventDefault(); });

    // Game loop
    let start = null;
    let prevTimestamp = null;
    let drawAndUpdate = (timestamp) => {
      if (!running) return;

      // Initialization
      if (!prevTimestamp) {
        start = timestamp;
        prevTimestamp = timestamp;
        requestAnimationFrame(drawAndUpdate);
        return;
      }

      // Update and draw
      let progress = (timestamp - prevTimestamp) / 1000;
      module.update(progress);
      module.draw();

      // Some bookkeeping
      prevTimestamp = timestamp;
      requestAnimationFrame(drawAndUpdate);
    };

    module.resize(canvas.width, canvas.height);
    drawAndUpdate();
  });
});
