    const WIDTH = 500, HEIGHT = 200;
    let tileSize = 24;
    let cameraZoom = 1;
    const world = Array.from({length: WIDTH}, ()=>Array.from({length: HEIGHT}, ()=>null));

    function updateTileSize() {
      const baseTileSize = Math.max(12, Math.min(36, Math.floor(Math.min(innerWidth, innerHeight) / 25)));
      tileSize = Math.max(6, Math.floor(baseTileSize * cameraZoom));
    }

    // Generate smooth layered terrain using Perlin-like noise
    function generateTerrain() {
      // Create height map with smooth transitions
      const heightMap = [];
      for (let x = 0; x < WIDTH; x++) {
        let h = 90; // 3x deeper world base
        h += Math.sin(x * 0.01) * 6; // Broad wave
        h += Math.sin(x * 0.05) * 3; // Smaller variation
        heightMap[x] = Math.floor(h);
      }

      // Fill terrain from bottom to top
      for (let x = 0; x < WIDTH; x++) {
        const surfaceHeight = heightMap[x];

        for (let y = 0; y < HEIGHT; y++) {
          if (y < surfaceHeight) {
            // Underground layers
            const depthFromSurface = surfaceHeight - y;
            if (depthFromSurface <= 1) {
              world[x][y] = 'grass'; // Grass covering the surface
            } else if (depthFromSurface <= 6) {
              world[x][y] = 'dirt'; // Dirt layer below grass
            } else {
              world[x][y] = 'stone'; // Stone below topsoil
            }
          }
        }
      }

      function carveBlob(cx, cy, rx, ry) {
        const minX = Math.floor(cx - rx), maxX = Math.ceil(cx + rx);
        const minY = Math.floor(cy - ry), maxY = Math.ceil(cy + ry);
        for (let x = minX; x <= maxX; x++) {
          if (x < 0 || x >= WIDTH) continue;
          for (let y = minY; y <= maxY; y++) {
            if (y < 1 || y >= HEIGHT) continue;
            const nx = (x - cx) / rx;
            const ny = (y - cy) / ry;
            const d = nx * nx + ny * ny;
            if (d <= 1.0) {
              const depthFromSurface = heightMap[x] - y;
              // Keep caves much deeper below the surface while preserving roof blocks.
              if (depthFromSurface >= 16 && y < heightMap[x] - 1) {
                world[x][y] = null;
              }
            }
          }
        }
      }

      // Generate many thinner caves; only rarely create a large cavern.
      for (let i = 0; i < 52; i++) {
        const caveX = Math.floor(Math.random() * WIDTH);
        const caveDepth = 22 + Math.random() * 26; // 22-48 blocks below local surface
        const caveY = Math.max(3, Math.floor(heightMap[caveX] - caveDepth));
        const isBigCave = Math.random() < 0.1;
        const baseR = isBigCave ? (8 + Math.random() * 8) : (1.2 + Math.random() * 1.8);
        const blobCount = isBigCave ? (5 + Math.floor(Math.random() * 5)) : (1 + Math.floor(Math.random() * 2));

        for (let b = 0; b < blobCount; b++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * baseR * (isBigCave ? 1.1 : 2.1);
          const cx = caveX + Math.cos(angle) * distance;
          const cy = caveY + Math.sin(angle) * distance * (isBigCave ? 0.7 : 0.45);
          const rx = baseR * (isBigCave ? (0.55 + Math.random() * 0.45) : (0.32 + Math.random() * 0.2));
          const ry = 2.0 + Math.random() * 2.0; // 4-8 blocks tall caves
          carveBlob(cx, cy, rx, ry);
        }

        // Add winding tunnels; small caves are biased into long connected paths.
        let tx = caveX;
        let ty = caveY;
        let tunnelAngle = Math.random() * Math.PI * 2;
        const tunnelSteps = isBigCave ? 28 : 68;
        for (let s = 0; s < tunnelSteps; s++) {
          tunnelAngle += (Math.random() * 2 - 1) * (isBigCave ? 0.42 : 0.2);
          tx += Math.cos(tunnelAngle) * (isBigCave ? 1.7 : 2.0);
          ty += Math.sin(tunnelAngle) * (isBigCave ? 1.0 : 0.5);
          if (isBigCave) {
            carveBlob(tx, ty, 3.6 + Math.random() * 2.0, 2.0 + Math.random() * 2.0);
          } else {
            carveBlob(tx, ty, 1.0 + Math.random() * 0.65, 2.0 + Math.random() * 2.0);
          }
        }
      }

      // Seal any underground air connected to the open sky so caves never expose void.
      const skyReachable = Array.from({length: WIDTH}, () => Array(HEIGHT).fill(false));
      const stack = [];
      for (let x = 0; x < WIDTH; x++) {
        for (let y = heightMap[x]; y < HEIGHT; y++) {
          if (world[x][y] === null && !skyReachable[x][y]) {
            skyReachable[x][y] = true;
            stack.push([x, y]);
          }
        }
      }

      while (stack.length) {
        const [x, y] = stack.pop();
        const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
          if (skyReachable[nx][ny]) continue;
          if (world[nx][ny] !== null) continue;
          skyReachable[nx][ny] = true;
          stack.push([nx, ny]);
        }
      }

      for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < Math.min(heightMap[x], HEIGHT); y++) {
          if (world[x][y] === null && skyReachable[x][y]) {
            const depthFromSurface = heightMap[x] - y;
            world[x][y] = depthFromSurface <= 6 ? 'dirt' : 'stone';
          }
        }
      }

      // Natural ore generation in stone layer.
      function carveOreVeins(oreId, minDepth, maxDepth, veinCount, veinSizeMin, veinSizeMax) {
        for (let i = 0; i < veinCount; i++) {
          const x = Math.floor(Math.random() * WIDTH);
          const depth = minDepth + Math.random() * (maxDepth - minDepth);
          const y = Math.max(1, Math.floor(heightMap[x] - depth));
          const steps = Math.floor(veinSizeMin + Math.random() * (veinSizeMax - veinSizeMin + 1));
          let vx = x;
          let vy = y;
          for (let s = 0; s < steps; s++) {
            vx += Math.floor(Math.random() * 3) - 1;
            vy += Math.floor(Math.random() * 3) - 1;
            if (vx < 1 || vx >= WIDTH - 1 || vy < 1 || vy >= HEIGHT - 1) continue;
            const depthFromSurface = heightMap[vx] - vy;
            if (depthFromSurface >= minDepth && depthFromSurface <= maxDepth && world[vx][vy] === 'stone') {
              world[vx][vy] = oreId;
            }
          }
        }
      }

      carveOreVeins('coal_ore', 8, 70, 220, 4, 10);
      carveOreVeins('iron_ore', 16, 95, 170, 3, 8);
      carveOreVeins('gold_ore', 38, 120, 100, 3, 7);
      carveOreVeins('diamond_ore', 60, 150, 60, 2, 5);

      function generateLavaPools() {
        const poolCount = 34 + Math.floor(Math.random() * 16);
        for (let i = 0; i < poolCount; i++) {
          const cx = 6 + Math.floor(Math.random() * (WIDTH - 12));
          const depth = 72 + Math.random() * 72;
          const cy = Math.max(4, Math.floor(heightMap[cx] - depth));
          const rx = 2 + Math.random() * 2.5;
          const ry = 1.3 + Math.random() * 1.3;
          const minX = Math.max(1, Math.floor(cx - rx - 1));
          const maxX = Math.min(WIDTH - 2, Math.ceil(cx + rx + 1));
          const minY = Math.max(1, Math.floor(cy - ry - 1));
          const maxY = Math.min(HEIGHT - 2, Math.ceil(cy + ry + 1));

          let openTiles = 0;
          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              if (world[x][y] === null && heightMap[x] - y >= 55) openTiles++;
            }
          }
          if (openTiles < 8) continue;

          for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
              const nx = (x - cx) / rx;
              const ny = (y - cy) / ry;
              if (nx * nx + ny * ny > 1) continue;
              if (heightMap[x] - y < 55) continue;
              if (world[x][y] === null) world[x][y] = 'lava';
            }
          }
        }
      }

      generateLavaPools();

      // Post-processing: cover exposed dirt with grass and avoid exposed stone near surface.
      for (let x = 0; x < WIDTH; x++) {
        for (let y = 0; y < HEIGHT; y++) {
          if (world[x][y] === 'dirt' && (y + 1 >= HEIGHT || world[x][y + 1] === null)) {
            world[x][y] = 'grass';
          }

          if (world[x][y] === 'stone') {
            const depthFromSurface = heightMap[x] - y;
            if (depthFromSurface <= 6 && (y + 1 >= HEIGHT || world[x][y + 1] === null)) {
              world[x][y] = 'dirt';
            }
          }
        }
      }

      function getSurfaceY(x) {
        if (x < 0 || x >= WIDTH) return -1;
        for (let y = HEIGHT - 2; y >= 1; y--) {
          if (world[x][y] && world[x][y + 1] === null) return y;
        }
        return -1;
      }

      function generateSurfaceLakes() {
        const lakeCount = 9 + Math.floor(Math.random() * 6);
        for (let i = 0; i < lakeCount; i++) {
          const cx = 10 + Math.floor(Math.random() * (WIDTH - 20));
          const radius = 4 + Math.floor(Math.random() * 4);
          const spanStart = cx - radius - 2;
          const spanEnd = cx + radius + 2;
          if (spanStart < 2 || spanEnd >= WIDTH - 2) continue;

          const surfaceYs = [];
          let valid = true;
          for (let x = spanStart; x <= spanEnd; x++) {
            const sy = getSurfaceY(x);
            if (sy < 0 || !['grass', 'dirt', 'sand'].includes(world[x][sy])) {
              valid = false;
              break;
            }
            surfaceYs.push(sy);
          }
          if (!valid) continue;

          const minSurface = Math.min(...surfaceYs);
          const maxSurface = Math.max(...surfaceYs);
          if (maxSurface - minSurface > 3) continue;

          const waterLevel = minSurface - 1;
          const maxDepth = 2 + Math.floor(Math.random() * 2);

          for (let x = spanStart; x <= spanEnd; x++) {
            const surfaceY = getSurfaceY(x);
            if (surfaceY < 0) continue;
            const dist = Math.abs(x - cx);
            const normalized = dist / (radius + 0.5);
            if (normalized > 1.15) continue;

            const carveDepth = Math.max(1, Math.round((1 - normalized) * maxDepth));
            const floorY = Math.max(2, waterLevel - carveDepth);

            for (let y = surfaceY; y > floorY; y--) {
              world[x][y] = y <= waterLevel ? 'water' : null;
            }
            world[x][floorY] = 'sand';
            if (floorY - 1 >= 0 && world[x][floorY - 1] === 'dirt') world[x][floorY - 1] = 'sand';

            if (dist >= radius - 1 && dist <= radius + 1) {
              if (world[x][surfaceY] && world[x][surfaceY] !== 'water') world[x][surfaceY] = 'sand';
              if (surfaceY - 1 >= 0 && world[x][surfaceY - 1] && world[x][surfaceY - 1] !== 'water') {
                world[x][surfaceY - 1] = 'sand';
              }
            }
          }
        }
      }

      generateSurfaceLakes();

      // Add identical trees (logs + grass-leaf canopy) with wider spacing.
      let lastTreeX = -999;
      const minTreeSpacing = 9;
      for (let x = 4; x < WIDTH - 4; x += 5) {
        if (Math.random() > 0.32) continue;
        if (x - lastTreeX < minTreeSpacing) continue;
        let groundY = -1;
        for (let y = HEIGHT - 2; y >= 1; y--) {
          if (world[x][y] === 'grass' && world[x][y + 1] === null) {
            groundY = y;
            break;
          }
        }
        if (groundY < 0 || groundY + 7 >= HEIGHT) continue;

        // Ensure clear trunk area.
        let blocked = false;
        for (let ty = groundY + 1; ty <= groundY + 4; ty++) {
          if (world[x][ty] !== null) { blocked = true; break; }
        }
        if (blocked) continue;

        // Trunk (identical every tree).
        for (let ty = groundY + 1; ty <= groundY + 4; ty++) {
          world[x][ty] = 'log';
        }
        lastTreeX = x;

        // Fixed canopy made from grass blocks.
        const canopy = [
          [-1, 3], [0, 3], [1, 3],
          [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4],
          [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5],
          [-1, 6], [0, 6], [1, 6]
        ];
        for (const [dx, dy] of canopy) {
          const lx = x + dx;
          const ly = groundY + dy;
          if (lx < 0 || lx >= WIDTH || ly < 0 || ly >= HEIGHT) continue;
          if (world[lx][ly] === null) world[lx][ly] = 'grass';
        }
      }
    }

    generateTerrain();

    function getGrassSpawn(preferredX) {
      const maxRadius = Math.max(preferredX, WIDTH - 1 - preferredX);
      for (let radius = 0; radius <= maxRadius; radius++) {
        const candidates = radius === 0
          ? [preferredX]
          : [preferredX - radius, preferredX + radius];
        for (const x of candidates) {
          if (x < 0 || x >= WIDTH) continue;
          for (let y = HEIGHT - 2; y >= 0; y--) {
            // Spawn only on grass with headroom for the 2-block-tall player.
            if (world[x][y] === 'grass' && !world[x][y + 1] && !world[x][y + 2]) {
              return { x: x + 0.5, y: y + 2 };
            }
          }
        }
      }
      return { x: preferredX + 0.5, y: 95 };
    }

    // Calculate spawn position on grass
