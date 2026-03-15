    const centerX = Math.floor(WIDTH / 2);
    const spawn = getGrassSpawn(centerX);
    const player = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      speed: 6,
      w: 0.6,
      h: 2.0,
      model: 'steve',
      facing: 1,
      walkCycle: 0,
      grounded: false,
      handActionTimer: 0,
      handActionSide: 1,
      handToolId: null,
      maxHealth: 20,
      health: 20,
      invulnTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      regenDelay: 0,
      regenAccum: 0,
      maxFallSpeed: 0
    };
    let spawnPoint = { x: spawn.x, y: spawn.y };
    let deathSequence = { active: false, timer: 0, duration: 1.5, zoomStart: 1, zoomTarget: 0.6 };
    const PLAYER_COLLIDER_H = 1.9;
    const HAND_ACTION_DURATION = 0.16;
    const keys = { left:false, right:false, jump:false, down:false };

    // Mob system
    const MOB_TYPES = {
      cow: { w: 1.35, h: 1.1, speed: 1.0, maxHealth: 10 },
      sheep: { w: 1.15, h: 1.0, speed: 0.85, maxHealth: 8 },
      pig: { w: 1.1, h: 0.9, speed: 1.2, maxHealth: 8 }
    };
    const HOSTILE_TYPES = {
      zombie: { w: 0.74, h: 1.9, speed: 2.0, maxHealth: 20, damage: 3, hitCooldown: 0.9, color: '#3a8a42' },
      skeleton: { w: 0.68, h: 1.9, speed: 2.2, maxHealth: 20, damage: 2, hitCooldown: 0.75, color: '#d8d8d8' },
      creeper: { w: 0.78, h: 1.8, speed: 1.9, maxHealth: 20, damage: 4, hitCooldown: 1.1, color: '#4caf50' }
    };
    const HOSTILE_AGGRO_RADIUS = 15;
    const CREEPER_FUSE_TIME = 1.1;
    const INTERACTION_RANGE = 4;
    let mobs = [];
    let hostileArrows = [];
    let hostileSpawnTimer = 0;
    let passiveSpawnTimer = 0;
    const healthBarFill = document.getElementById('healthBarFill');
    const healthText = document.getElementById('healthText');

    function updateHealthUI() {
      const ratio = Math.max(0, Math.min(1, player.health / player.maxHealth));
      healthBarFill.style.width = `${ratio * 100}%`;
      healthText.textContent = `Health: ${Math.ceil(player.health)} / ${player.maxHealth}`;
    }
    updateHealthUI();

    function respawnPlayer() {
      player.x = spawnPoint.x;
      player.y = spawnPoint.y;
      player.vx = 0;
      player.vy = 0;
      player.health = player.maxHealth;
      player.invulnTimer = 1.0;
      player.regenDelay = 0;
      player.regenAccum = 0;
      player.maxFallSpeed = 0;
      player.handToolId = null;
      player.handActionTimer = 0;
      player.hurtTimer = 0;
      for (let i = 0; i < hotbarInventory.length; i++) hotbarInventory[i] = null;
      resetToolUnlockState();
      selected = 0;
      deathSequence.active = false;
      deathSequence.timer = 0;
      cameraZoom = 1;
      updateTileSize();
      renderHotbar();
      updateHealthUI();
    }

    function startDeathSequence() {
      if (deathSequence.active) return;
      deathSequence.active = true;
      deathSequence.timer = deathSequence.duration;
      deathSequence.zoomStart = cameraZoom;
      player.health = 0;
      player.vx = 0;
      player.vy = 0;
      player.handToolId = null;
      player.handActionTimer = 0;
      player.attackCooldown = 0;
      player.invulnTimer = 0;
      player.regenDelay = 0;
      player.regenAccum = 0;
      updateHealthUI();
    }

    function getBestArmorReduction() {
      const armorMaterial = getBestUnlockedArmorMaterial();
      if (armorMaterial === 'gold') return 0.25;
      if (armorMaterial === 'iron') return 0.4;
      if (armorMaterial === 'diamond') return 0.55;
      return 0;
    }

    function damagePlayer(amount, sourceX = null) {
      if (player.invulnTimer > 0 || deathSequence.active) return;
      const reduction = getBestArmorReduction();
      const reducedAmount = Math.max(0.5, amount * (1 - reduction));
      player.hurtTimer = 0.25;
      player.health = Math.max(0, player.health - reducedAmount);
      if (sourceX != null) {
        const away = player.x >= sourceX ? 1 : -1;
        player.vx = away * Math.max(5.5, Math.abs(player.vx));
        player.vy = Math.max(player.vy, 4.5);
        player.grounded = false;
      }
      player.invulnTimer = 0.45;
      player.regenDelay = 6.0; // Wait before regenerating again.
      player.regenAccum = 0;
      updateHealthUI();
      if (player.health <= 0) {
        startDeathSequence();
      }
    }

    function damageMob(mob, amount, sourceX = null) {
      if (!mob || mob.health == null || mob.health <= 0) return;
      mob.hurtTimer = 0.25;
      mob.health -= amount;
      if (sourceX != null) {
        const away = mob.x >= sourceX ? 1 : -1;
        mob.vx = away * Math.max(4.8, Math.abs(mob.vx || 0));
        mob.vy = Math.max(mob.vy || 0, 4.0);
        mob.grounded = false;
      }
      if (!mob.hostile && mob.health <= 0) {
        addItemToInventory('meat', 1);
      }
    }

    function isNightTime() {
      const t = gameTime / 24000;
      return !(t > 0.25 && t < 0.75);
    }

    function explodeBlocksAt(cx, cy, radius) {
      const minX = Math.max(0, Math.floor(cx - radius));
      const maxX = Math.min(WIDTH - 1, Math.ceil(cx + radius));
      const minY = Math.max(0, Math.floor(cy - radius));
      const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + radius));
      for (let gx = minX; gx <= maxX; gx++) {
        for (let gy = minY; gy <= maxY; gy++) {
          const dx = (gx + 0.5) - cx;
          const dy = (gy + 0.5) - cy;
          if (dx * dx + dy * dy > radius * radius) continue;
          const block = world[gx][gy];
          if (!block) continue;
          if (block === 'door') {
            const lowerY = (gy > 0 && world[gx][gy - 1] === 'door') ? gy - 1 : gy;
            delete doorStates[`${gx},${lowerY}`];
            world[gx][lowerY] = null;
            if (lowerY + 1 < HEIGHT && world[gx][lowerY + 1] === 'door') world[gx][lowerY + 1] = null;
          } else {
            world[gx][gy] = null;
          }
        }
      }
    }

    function fireSkeletonArrow(skeleton, target) {
      const dir = skeleton.facing >= 0 ? 1 : -1;
      const spawnX = skeleton.x + dir * (skeleton.w * 0.48);
      const spawnY = skeleton.y + skeleton.h * 0.08;
      const tx = target ? target.x : (skeleton.x + dir * 8);
      const ty = target ? target.y : skeleton.y;
      const dx = tx - spawnX;
      const dy = ty - spawnY;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 13.0;
      hostileArrows.push({
        x: spawnX,
        y: spawnY,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        life: 4.0,
        damage: 3
      });
    }

    // Time and weather system
    let gameTime = 6000; // 0-24000 (Minecraft-like time), start at day time
    let weather = 'clear'; // 'clear', 'rain'
    let timeSpeed = 1; // How fast time passes
    let weatherTimer = 45 + Math.random() * 85; // Seconds until next natural weather roll
    let clouds = [];

    function rollNaturalWeather() {
      if (weather === 'clear') {
        // Mostly clear, occasional rain.
        weather = Math.random() < 0.24 ? 'rain' : 'clear';
      } else {
        // Rain often clears, sometimes continues.
        weather = Math.random() < 0.72 ? 'clear' : 'rain';
      }
      if (weather === 'rain') {
        weatherTimer = 35 + Math.random() * 70; // Rain lasts ~35-105s
      } else {
        weatherTimer = 55 + Math.random() * 130; // Clear lasts ~55-185s
      }
    }

    function seededNoise(seed) {
      const v = Math.sin(seed * 12.9898) * 43758.5453123;
      return v - Math.floor(v);
    }

    function buildCloudMask(cols, rows, seed) {
      const mask = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const nx = ((x + 0.5) / cols) * 2 - 1;
          const ny = ((y + 0.5) / rows) * 2 - 1;
          const ellipse = (nx * nx * 0.9) + (ny * ny * 1.35);
          const jitter = seededNoise(seed + x * 17 + y * 31) * 0.32;
          const carve = y === rows - 1 && seededNoise(seed + x * 43) > 0.72;
          if (ellipse < 1.03 + jitter && !carve) {
            mask.push({ x, y });
          }
        }
      }
      return mask;
    }

    function initClouds() {
      clouds = [];
      const count = 140;
      for (let i = 0; i < count; i++) {
        const cols = 9 + Math.floor(Math.random() * 8);   // 9-16
        const rows = 4 + Math.floor(Math.random() * 4);   // 4-7
        const cell = 0.7 + Math.random() * 0.5;           // Cloud block size in world tiles
        const seed = Math.random() * 10000;
        const widthTiles = cols * cell;
        const heightTiles = rows * cell;
        clouds.push({
          cx: Math.random() * (WIDTH + 16) - 8,
          cy: HEIGHT * 0.62 + Math.random() * (HEIGHT * 0.26),
          speed: 0.28 + Math.random() * 0.44, // tiles per second
          cols,
          rows,
          cell,
          widthTiles,
          heightTiles,
          mask: buildCloudMask(cols, rows, seed)
        });
      }
    }
    initClouds();

    window.addEventListener('keydown', e=>{ if (e.code==='KeyA' || e.code==='ArrowLeft') keys.left=true; if (e.code==='KeyD' || e.code==='ArrowRight') keys.right=true; if (e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') keys.jump=true; if (e.code==='KeyS' || e.code==='ArrowDown') keys.down=true; });
    window.addEventListener('keyup', e=>{ if (e.code==='KeyA' || e.code==='ArrowLeft') keys.left=false; if (e.code==='KeyD' || e.code==='ArrowRight') keys.right=false; if (e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') keys.jump=false; if (e.code==='KeyS' || e.code==='ArrowDown') keys.down=false; });

    // Skin selector (Steve / Alex)
    const skinSelector = document.getElementById('skinSelector');
    function createSkinButton(label, modelId) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.color = 'rgba(255,255,255,.95)';
      btn.style.fontSize = '11px';
      btn.style.padding = '4px 8px';
      btn.style.border = '1px solid rgba(255,255,255,.25)';
      btn.style.borderRadius = '6px';
      btn.style.background = 'rgba(255,255,255,.08)';
      btn.style.cursor = 'pointer';
      btn.onclick = () => {
        player.model = modelId;
        updateSkinSelector();
      };
      btn.dataset.model = modelId;
      skinSelector.appendChild(btn);
      return btn;
    }

    createSkinButton('Steve', 'steve');
    createSkinButton('Alex', 'alex');

    function updateSkinSelector() {
      const buttons = skinSelector.querySelectorAll('button[data-model]');
      buttons.forEach(btn => {
        const isSelected = btn.dataset.model === player.model;
        btn.style.border = isSelected ? '1px solid rgba(255,255,255,.9)' : '1px solid rgba(255,255,255,.25)';
        btn.style.background = isSelected ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)';
      });
    }
    updateSkinSelector();

    // Spawn mob function
    function spawnMob(type) {
      const mobType = MOB_TYPES[type];
      const mob = {
        type: type,
        x: player.x + (Math.random() - 0.5) * 10,
        y: player.y + (Math.random() - 0.5) * 5,
        vx: 0,
        vy: 0,
        w: mobType.w,
        h: mobType.h,
        speed: mobType.speed,
        direction: Math.random() > 0.5 ? 1 : -1,
        moveTimer: 0,
        walkCycle: Math.random() * Math.PI * 2,
        idleCycle: Math.random() * Math.PI * 2,
        facing: Math.random() > 0.5 ? 1 : -1,
        hurtTimer: 0,
        health: mobType.maxHealth,
        maxHealth: mobType.maxHealth,
        grounded: false,
        maxFallSpeed: 0
      };
      mobs.push(mob);
    }

    function spawnPassive(type, x, y) {
      const mobType = MOB_TYPES[type];
      mobs.push({
        type,
        x,
        y,
        vx: 0,
        vy: 0,
        w: mobType.w,
        h: mobType.h,
        speed: mobType.speed,
        direction: Math.random() > 0.5 ? 1 : -1,
        moveTimer: 0,
        walkCycle: Math.random() * Math.PI * 2,
        idleCycle: Math.random() * Math.PI * 2,
        facing: Math.random() > 0.5 ? 1 : -1,
        hurtTimer: 0,
        health: mobType.maxHealth,
        maxHealth: mobType.maxHealth,
        grounded: false,
        maxFallSpeed: 0
      });
    }

    function spawnHostile(type, x, y) {
      const mobType = HOSTILE_TYPES[type];
      mobs.push({
        type,
        x,
        y,
        vx: 0,
        vy: 0,
        w: mobType.w,
        h: mobType.h,
        speed: mobType.speed,
        hostile: true,
        health: mobType.maxHealth,
        maxHealth: mobType.maxHealth,
        damage: mobType.damage,
        hitCooldown: mobType.hitCooldown,
        attackTimer: 0,
        fuseTimer: type === 'creeper' ? -1 : 0,
        direction: Math.random() > 0.5 ? 1 : -1,
        moveTimer: 0,
        walkCycle: Math.random() * Math.PI * 2,
        idleCycle: Math.random() * Math.PI * 2,
        facing: Math.random() > 0.5 ? 1 : -1,
        tint: mobType.color,
        hurtTimer: 0,
        grounded: false,
        maxFallSpeed: 0
      });
    }

    function getSurfaceHeightAt(x) {
      for (let y = HEIGHT - 1; y >= 0; y--) {
        if (world[x][y] !== null) return y + 1;
      }
      return 1;
    }

    function canSpawnEntityAt(x, y, w, h) {
      const eps = 1e-4;
      const left = Math.floor(x - w / 2 + eps);
      const right = Math.floor(x + w / 2 - eps);
      const bottom = Math.floor(y - h / 2 + eps);
      const top = Math.floor(y + h / 2 - eps);
      if (left < 0 || right >= WIDTH || bottom < 1 || top >= HEIGHT) return false;

      for (let gx = left; gx <= right; gx++) {
        for (let gy = bottom; gy <= top; gy++) {
          if (isSolid(gx, gy)) return false;
        }
      }
      // Need solid support under feet.
      for (let gx = left; gx <= right; gx++) {
        if (!isSolid(gx, bottom - 1)) return false;
      }
      return true;
    }

    function isMobGrounded(mob) {
      const eps = 1e-4;
      const left = Math.floor(mob.x - mob.w / 2 + eps);
      const right = Math.floor(mob.x + mob.w / 2 - eps);
      const below = Math.floor(mob.y - mob.h / 2 - eps);
      for (let gx = left; gx <= right; gx++) {
        if (isSolid(gx, below)) return true;
      }
      return false;
    }

    function shouldMobStepJump(mob) {
      const dir = (mob.direction || mob.facing || 0) >= 0 ? 1 : -1;
      if (dir === 0) return false;
      const footY = mob.y - mob.h / 2;
      const gyFoot = Math.floor(footY + 0.06);
      const gyHead = gyFoot + 1;

      const probeXNear = Math.floor(mob.x + dir * (mob.w / 2 + 0.08));
      const probeXFar = Math.floor(mob.x + dir * (mob.w / 2 + 0.24));

      // A 1-block obstacle ahead with enough headroom above it.
      const nearBlocked = isSolid(probeXNear, gyFoot);
      const farBlocked = isSolid(probeXFar, gyFoot);
      const headroom = !isSolid(probeXNear, gyHead) && !isSolid(probeXFar, gyHead);
      return (nearBlocked || farBlocked) && headroom;
    }

    function canMobOccupyAt(mob, x, y) {
      const eps = 1e-4;
      const left = Math.floor(x - mob.w / 2 + eps);
      const right = Math.floor(x + mob.w / 2 - eps);
      const bottom = Math.floor(y - mob.h / 2 + eps);
      const top = Math.floor(y + mob.h / 2 - eps);
      for (let gx = left; gx <= right; gx++) {
        for (let gy = bottom; gy <= top; gy++) {
          if (isSolid(gx, gy)) return false;
        }
      }
      return true;
    }

    function findHostileSpawnPosition(mode, hostileType) {
      const w = hostileType.w;
      const h = hostileType.h;
      for (let i = 0; i < 80; i++) {
        const x = Math.max(2, Math.min(WIDTH - 3, Math.floor(player.x + (Math.random() - 0.5) * 90)));
        const surface = getSurfaceHeightAt(x);
        let y;
        if (mode === 'cave') {
          const caveTop = Math.max(3, surface - 8);
          if (caveTop <= 3) continue;
          y = 2 + Math.random() * (caveTop - 2);
        } else if (mode === 'rain_day') {
          const caveTop = Math.max(3, surface - 8);
          if (caveTop <= 3) continue;
          y = 2 + Math.random() * (caveTop - 2);
        } else {
          // Night: anywhere (surface and caves)
          if (Math.random() < 0.55) {
            y = surface + h / 2 + 0.05;
          } else {
            y = 2 + Math.random() * Math.max(1, surface - 2);
          }
        }
        if (Math.abs(x + 0.5 - player.x) < 5) continue;
        if (mode === 'cave' || mode === 'rain_day') {
          const gx = Math.floor(x + 0.5);
          const feetY = Math.floor(y - h * 0.5);
          const headY = Math.floor(y + h * 0.5);
          // Daytime hostiles must stay below the surface and under a solid roof.
          if (headY >= surface - 1) continue;
          if (hasOpenSkyAt(gx, feetY) || hasOpenSkyAt(gx, headY)) continue;
        }
        if (canSpawnEntityAt(x + 0.5, y, w, h)) {
          return { x: x + 0.5, y };
        }
      }
      return null;
    }

    function findPassiveSpawnPosition(passiveType) {
      const w = passiveType.w;
      const h = passiveType.h;
      for (let i = 0; i < 70; i++) {
        const x = Math.max(2, Math.min(WIDTH - 3, Math.floor(player.x + (Math.random() - 0.5) * 90)));
        const surface = getSurfaceHeightAt(x);
        const groundY = surface - 1;
        if (groundY < 1 || groundY >= HEIGHT) continue;
        if (world[x][groundY] !== 'grass') continue;
        const y = surface + h / 2 + 0.05;
        if (Math.abs(x + 0.5 - player.x) < 6) continue;
        if (canSpawnEntityAt(x + 0.5, y, w, h)) {
          return { x: x + 0.5, y };
        }
      }
      return null;
    }

    // Mouse placement / removal
