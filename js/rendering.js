    function getCameraOffset(){
      const camX = player.x * tileSize - canvas.width/2 + tileSize/2;
      const camY = player.y * tileSize - canvas.height/2 + tileSize/2;

      // Clamp camera to world boundaries
      const maxCamX = (WIDTH * tileSize) - canvas.width;
      const maxCamY = (HEIGHT * tileSize) - canvas.height;

      return {
        x: Math.max(0, Math.min(camX, maxCamX)),
        y: Math.max(0, Math.min(camY, maxCamY))
      };
    }

    function isSolid(gx,gy){
      if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT) return false;
      const block = world[gx][gy];
      if (block === 'door') {
        // Check if door is open using lower door block state
        const lowerY = (gy > 0 && world[gx][gy - 1] === 'door') ? gy - 1 : gy;
        const key = `${gx},${lowerY}`;
        return !doorStates[key]; // Solid only if door is closed
      }
      return block && block !== 'water' && block !== 'ladder'; // Water and ladder are not solid
    }

    function hasOpenSkyAt(gx, gy){
      if (gx < 0 || gx >= WIDTH) return true;
      const startY = Math.max(gy + 1, 0);
      for (let y = startY; y < HEIGHT; y++) {
        if (isSolid(gx, y)) return false;
      }
      return true;
    }

    function isOnLadder(){
      const eps = 1e-6;
      const left = Math.floor(player.x - player.w/2), right = Math.floor(player.x + player.w/2 - eps);
      const bottom = Math.floor(player.y - PLAYER_COLLIDER_H/2), top = Math.floor(player.y + PLAYER_COLLIDER_H/2 - eps);
      for (let x = left; x <= right; x++) {
        for (let y = bottom; y <= top; y++) {
          if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && world[x][y] === 'ladder') {
            return true;
          }
        }
      }
      return false;
    }

    function resolveCollisions(){
      const eps = 1e-3;
      let left = player.x - player.w/2, right = player.x + player.w/2, bottom = player.y - PLAYER_COLLIDER_H/2, top = player.y + PLAYER_COLLIDER_H/2;
      const minX = Math.floor(left), maxX = Math.floor(right - eps);
      const minY = Math.floor(bottom), maxY = Math.floor(top - eps);
      let grounded = false;

      for (let gx = minX; gx <= maxX; gx++){
        for (let gy = minY; gy <= maxY; gy++){
          if (!isSolid(gx,gy)) continue;
          const tileLeft = gx, tileRight = gx+1, tileBottom = gy, tileTop = gy+1;
          const overlapX = Math.min(right, tileRight) - Math.max(left, tileLeft);
          const overlapY = Math.min(top, tileTop) - Math.max(bottom, tileBottom);
          if (overlapX > 0 && overlapY > 0){
            if (overlapX < overlapY){
              // resolve X
              if (player.x < gx+0.5) player.x -= overlapX + eps; else player.x += overlapX + eps;
            } else {
              // resolve Y
              if (player.y < gy+0.5){ player.y -= overlapY + eps; player.vy = 0; } else { player.y += overlapY + eps; player.vy = 0; grounded = true; }
            }
            left = player.x - player.w/2; right = player.x + player.w/2; bottom = player.y - PLAYER_COLLIDER_H/2; top = player.y + PLAYER_COLLIDER_H/2;
          }
        }
      }
      return grounded;
    }

    function getArmorPalette(materialKey) {
      if (materialKey === 'wood') return { main: '#9b6b3f', mid: '#7c5431', dark: '#5f3f24' };
      if (materialKey === 'gold') return { main: '#f0c64c', mid: '#d9aa27', dark: '#b88915' };
      if (materialKey === 'iron') return { main: '#c8c8cf', mid: '#a7a7b0', dark: '#878791' };
      if (materialKey === 'diamond') return { main: '#6fdbe8', mid: '#58bfce', dark: '#4aa8b5' };
      return null;
    }

    function drawHeldItem(itemId, handX, handY, pixel, actionProgress = 0) {
      if (!itemId) return;
      const isTool = /_(?:shovel|sword|axe|pickaxe)$/.test(itemId);
      if (!isTool) {
        const itemDef = BLOCK_BY_ID[itemId];
        if (!itemDef) return;
        const idleOffsetX = pixel * 0.8;
        const idleOffsetY = pixel * 1.5;
        const bob = actionProgress * pixel * 0.8;
        const size = Math.max(pixel * 2.6, tileSize * 0.18);
        const x = handX - size * 0.5 + idleOffsetX;
        const y = handY - size * 0.5 + idleOffsetY - bob;
        ctx.fillStyle = itemDef.color;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x, y, size * 0.28, size);
        ctx.fillRect(x, y, size, size * 0.18);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(x + size * 0.62, y + size * 0.62, size * 0.24, size * 0.24);
        ctx.strokeStyle = '#101010';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
        return;
      }

      const toolId = itemId;
      const handleColor = '#5a3a24';
      const toolColorMap = {
        wood_shovel: '#b07a4a',
        wood_sword: '#b07a4a',
        wood_pickaxe: '#b07a4a',
        wood_axe: '#b07a4a',
        stone_shovel: '#7f7f7f',
        stone_sword: '#7f7f7f',
        stone_pickaxe: '#7f7f7f',
        stone_axe: '#7f7f7f',
        iron_shovel: '#c8c8cf',
        iron_sword: '#c8c8cf',
        iron_pickaxe: '#c8c8cf',
        iron_axe: '#c8c8cf',
        gold_shovel: '#f0c64c',
        gold_sword: '#f0c64c',
        gold_pickaxe: '#f0c64c',
        gold_axe: '#f0c64c',
        diamond_shovel: '#74d9e6',
        diamond_sword: '#74d9e6',
        diamond_pickaxe: '#74d9e6',
        diamond_axe: '#74d9e6'
      };
      const toolColor = toolColorMap[toolId] || '#74d9e6';
      const shadowColorMap = {
        wood: '#8a5d36',
        stone: '#5f5f5f',
        gold: '#cf9f22',
        iron: '#9fa0a8',
        diamond: '#4db8c9'
      };
      const highlightColorMap = {
        wood: '#c9935c',
        stone: '#a6a6a6',
        gold: '#ffd86a',
        iron: '#e1e2e8',
        diamond: '#a6f3ff'
      };
      const material = toolId.split('_')[0];
      const shadowColor = shadowColorMap[material] || '#4db8c9';
      const highlightColor = highlightColorMap[material] || '#a6f3ff';
      const tex = Math.max(1, pixel * 0.35);
      const lift = actionProgress * pixel * 3.2;
      const toolHandY = handY - lift;

      function texturedRect(x, y, w, h) {
        ctx.fillStyle = toolColor;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = shadowColor;
        for (let iy = y + tex; iy < y + h; iy += tex * 2) {
          for (let ix = x + ((Math.round((iy - y) / tex) % 2) ? tex : 0); ix < x + w; ix += tex * 2) {
            ctx.fillRect(ix, iy, tex, tex);
          }
        }
        ctx.fillStyle = highlightColor;
        ctx.fillRect(x, y, Math.max(1, w * 0.22), h);
        ctx.fillRect(x, y, w, Math.max(1, h * 0.16));
      }

      function pixelCell(x, y, cellsX = 1, cellsY = 1) {
        texturedRect(x, y, tex * cellsX, tex * cellsY);
      }

      ctx.fillStyle = handleColor;
      ctx.fillRect(handX - pixel * 0.25, toolHandY + pixel * 0.2, pixel * 0.5, pixel * 3.2);
      ctx.fillStyle = toolColor;
      if (toolId.endsWith('_sword')) {
        const centerX = handX - tex * 0.5;
        pixelCell(centerX, toolHandY - tex * 6, 1, 1);
        pixelCell(centerX - tex * 0.5, toolHandY - tex * 5, 2, 1);
        pixelCell(centerX - tex * 0.5, toolHandY - tex * 4, 2, 1);
        pixelCell(centerX - tex, toolHandY - tex * 3, 3, 1);
        pixelCell(centerX - tex, toolHandY - tex * 2, 3, 1);
        pixelCell(centerX - tex * 1.5, toolHandY - tex, 4, 0.8);
        pixelCell(centerX - tex * 2, toolHandY + tex * 0.2, 5, 0.7);
      } else if (toolId.endsWith('_pickaxe')) {
        pixelCell(handX - tex * 3, toolHandY - tex * 4, 2, 1);
        pixelCell(handX - tex, toolHandY - tex * 4.8, 2, 1);
        pixelCell(handX + tex, toolHandY - tex * 4, 2, 1);
        pixelCell(handX - tex * 1.2, toolHandY - tex * 3, 1, 1.2);
        pixelCell(handX + tex * 0.2, toolHandY - tex * 3, 1, 1.2);
      } else if (toolId.endsWith('_axe')) {
        pixelCell(handX - tex * 0.2, toolHandY - tex * 4.8, 2.4, 1.2);
        pixelCell(handX - tex * 1.4, toolHandY - tex * 4.0, 3.2, 1.4);
        pixelCell(handX - tex * 1.1, toolHandY - tex * 2.8, 2.2, 1.1);
      } else if (toolId.endsWith('_shovel')) {
        pixelCell(handX - tex * 1.2, toolHandY - tex * 4.8, 2.4, 1.1);
        pixelCell(handX - tex * 1.6, toolHandY - tex * 3.7, 3.2, 1.4);
        pixelCell(handX - tex, toolHandY - tex * 2.5, 2, 0.9);
      }
    }

    function getHandActionProgress() {
      if (miningState.active && miningState.required > 0) {
        return Math.sin((miningState.swingTimer / HAND_ACTION_DURATION) * Math.PI);
      }
      if (player.handActionTimer <= 0) return 0;
      const actionProgress = 1 - (player.handActionTimer / HAND_ACTION_DURATION);
      return Math.sin(actionProgress * Math.PI);
    }

    function drawPlayerWithDeathPose(drawBaseSprite, screenX, screenY, pixel, facing, walkCycle, moving) {
      if (!deathSequence.active) {
        drawBaseSprite(screenX, screenY, pixel, facing, walkCycle, moving);
        return;
      }

      const spriteWidth = 16 * pixel;
      const spriteHeight = 32 * pixel;
      const pivotX = screenX + spriteWidth * 0.5;
      const pivotY = screenY + spriteHeight * 0.18 + tileSize;

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-spriteWidth * 0.5, -spriteHeight * 0.5);
      drawBaseSprite(0, 0, pixel, facing, 0, false);
      ctx.fillStyle = 'rgba(200, 35, 35, 0.38)';
      ctx.fillRect(0, 0, spriteWidth, spriteHeight);
      ctx.restore();
    }

    function drawSteve(screenX, screenY, pixel, facing, walkCycle, moving) {
      const dir = facing >= 0 ? 1 : -1;
      const legSwing = moving ? Math.sin(walkCycle) * pixel * 0.9 : 0;
      const armSwing = moving ? -Math.sin(walkCycle) * pixel * 0.8 : 0;
      const actionLift = getHandActionProgress() * pixel * 3.2;

      const headW = 8 * pixel, headH = 8 * pixel;
      const bodyW = 8 * pixel, bodyH = 12 * pixel;
      const limbW = 4 * pixel, limbH = 12 * pixel;

      const spriteW = 16 * pixel;
      const centerX = screenX + (player.w * tileSize) / 2;
      const leftX = centerX - spriteW / 2;
      const headX = leftX + 4 * pixel;
      const headY = screenY;
      const bodyX = leftX + 4 * pixel;
      const bodyY = headY + headH;

      // Head
      ctx.fillStyle = '#5b3a22';
      ctx.fillRect(headX, headY, headW, 2 * pixel);
      ctx.fillStyle = '#ddb289';
      ctx.fillRect(headX, headY + 2 * pixel, headW, 6 * pixel);
      // Eyes: separated with exact 50/50 white-purple split per eye
      ctx.fillStyle = '#f2f6ff';
      ctx.fillRect(headX + pixel, headY + 4 * pixel, pixel, 2 * pixel); // Left eye outer half
      ctx.fillRect(headX + 6 * pixel, headY + 4 * pixel, pixel, 2 * pixel); // Right eye outer half
      ctx.fillStyle = '#8c4fcf';
      ctx.fillRect(headX + 2 * pixel, headY + 4 * pixel, pixel, 2 * pixel); // Left eye inner half
      ctx.fillRect(headX + 5 * pixel, headY + 4 * pixel, pixel, 2 * pixel); // Right eye inner half

      // Torso and arms
      ctx.fillStyle = '#4aa3df';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
      const sleeveHeight = 4 * pixel;
      const leftArmY = bodyY + armSwing + (player.handActionSide < 0 ? -actionLift : 0);
      const rightArmY = bodyY - armSwing + (player.handActionSide > 0 ? -actionLift : 0);
      ctx.fillStyle = '#4aa3df';
      ctx.fillRect(bodyX - limbW, leftArmY, limbW, sleeveHeight);
      ctx.fillRect(bodyX + bodyW, rightArmY, limbW, sleeveHeight);
      ctx.fillStyle = '#ddb289';
      ctx.fillRect(bodyX - limbW, leftArmY + sleeveHeight, limbW, limbH - sleeveHeight);
      ctx.fillRect(bodyX + bodyW, rightArmY + sleeveHeight, limbW, limbH - sleeveHeight);

      // Pants/legs
      ctx.fillStyle = '#7b3fc8';
      ctx.fillRect(bodyX, bodyY + bodyH - 2 * pixel, bodyW, 2 * pixel);
      ctx.fillRect(bodyX, bodyY + bodyH + legSwing, limbW, limbH);
      ctx.fillRect(bodyX + bodyW - limbW, bodyY + bodyH - legSwing, limbW, limbH);

      const armorPalette = getArmorPalette(getBestUnlockedArmorMaterial());
      if (armorPalette) {
        ctx.fillStyle = armorPalette.main;
        ctx.fillRect(headX, headY, headW, 2 * pixel); // helmet
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH); // chestplate
        ctx.fillStyle = armorPalette.mid;
        ctx.fillRect(bodyX, bodyY + bodyH + legSwing, limbW, 7 * pixel); // leggings
        ctx.fillRect(bodyX + bodyW - limbW, bodyY + bodyH - legSwing, limbW, 7 * pixel);
        ctx.fillStyle = armorPalette.dark;
        ctx.fillRect(bodyX, bodyY + bodyH + legSwing + 7 * pixel, limbW, 5 * pixel); // boots
        ctx.fillRect(bodyX + bodyW - limbW, bodyY + bodyH - legSwing + 7 * pixel, limbW, 5 * pixel);
      }
      const selectedItemId = getSelectedItemId();
      drawHeldItem(player.handToolId || selectedItemId, bodyX + bodyW + limbW * 0.5, rightArmY + limbH * 0.5, pixel, getHandActionProgress());

      // Outline
      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 1;
      ctx.strokeRect(headX, headY, headW, headH);
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
      ctx.strokeRect(bodyX - limbW, leftArmY, limbW, limbH);
      ctx.strokeRect(bodyX + bodyW, rightArmY, limbW, limbH);
      ctx.strokeRect(bodyX, bodyY + bodyH + legSwing, limbW, limbH);
      ctx.strokeRect(bodyX + bodyW - limbW, bodyY + bodyH - legSwing, limbW, limbH);
    }

    function drawAlex(screenX, screenY, pixel, facing, walkCycle, moving) {
      const dir = facing >= 0 ? 1 : -1;
      const legSwing = moving ? Math.sin(walkCycle) * pixel * 0.9 : 0;
      const armSwing = moving ? -Math.sin(walkCycle) * pixel * 0.8 : 0;
      const actionLift = getHandActionProgress() * pixel * 3.2;

      const headW = 8 * pixel, headH = 8 * pixel;
      const bodyW = 8 * pixel, bodyH = 12 * pixel;
      const armW = 3 * pixel, armH = 12 * pixel; // Alex has slimmer arms
      const legW = 4 * pixel, legH = 12 * pixel;

      const spriteW = 16 * pixel;
      const centerX = screenX + (player.w * tileSize) / 2;
      const leftX = centerX - spriteW / 2;
      const headX = leftX + 4 * pixel;
      const headY = screenY;
      const bodyX = leftX + 4 * pixel;
      const bodyY = headY + headH;

      // Head + hair
      ctx.fillStyle = '#b1612f';
      ctx.fillRect(headX, headY, headW, 2 * pixel);
      ctx.fillStyle = '#dfb691';
      ctx.fillRect(headX, headY + 2 * pixel, headW, 6 * pixel);
      // Eyes
      ctx.fillStyle = '#f2f6ff';
      ctx.fillRect(headX + pixel, headY + 4 * pixel, pixel, 2 * pixel);
      ctx.fillRect(headX + 6 * pixel, headY + 4 * pixel, pixel, 2 * pixel);
      ctx.fillStyle = '#4a9b7e';
      ctx.fillRect(headX + 2 * pixel, headY + 4 * pixel, pixel, 2 * pixel);
      ctx.fillRect(headX + 5 * pixel, headY + 4 * pixel, pixel, 2 * pixel);

      // Torso and arms
      ctx.fillStyle = '#8cbf6f';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
      const sleeveHeight = 4 * pixel;
      const leftArmY = bodyY + armSwing + (player.handActionSide < 0 ? -actionLift : 0);
      const rightArmY = bodyY - armSwing + (player.handActionSide > 0 ? -actionLift : 0);
      ctx.fillStyle = '#8cbf6f';
      ctx.fillRect(bodyX - armW, leftArmY, armW, sleeveHeight);
      ctx.fillRect(bodyX + bodyW, rightArmY, armW, sleeveHeight);
      ctx.fillStyle = '#dfb691';
      ctx.fillRect(bodyX - armW, leftArmY + sleeveHeight, armW, armH - sleeveHeight);
      ctx.fillRect(bodyX + bodyW, rightArmY + sleeveHeight, armW, armH - sleeveHeight);

      // Pants/legs
      ctx.fillStyle = '#6a4a2f';
      ctx.fillRect(bodyX, bodyY + bodyH - 2 * pixel, bodyW, 2 * pixel);
      ctx.fillRect(bodyX, bodyY + bodyH + legSwing, legW, legH);
      ctx.fillRect(bodyX + bodyW - legW, bodyY + bodyH - legSwing, legW, legH);

      const armorPalette = getArmorPalette(getBestUnlockedArmorMaterial());
      if (armorPalette) {
        ctx.fillStyle = armorPalette.main;
        ctx.fillRect(headX, headY, headW, 2 * pixel); // helmet
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH); // chestplate
        ctx.fillStyle = armorPalette.mid;
        ctx.fillRect(bodyX, bodyY + bodyH + legSwing, legW, 7 * pixel); // leggings
        ctx.fillRect(bodyX + bodyW - legW, bodyY + bodyH - legSwing, legW, 7 * pixel);
        ctx.fillStyle = armorPalette.dark;
        ctx.fillRect(bodyX, bodyY + bodyH + legSwing + 7 * pixel, legW, 5 * pixel); // boots
        ctx.fillRect(bodyX + bodyW - legW, bodyY + bodyH - legSwing + 7 * pixel, legW, 5 * pixel);
      }
      const selectedItemId = getSelectedItemId();
      drawHeldItem(player.handToolId || selectedItemId, bodyX + bodyW + armW * 0.5, rightArmY + armH * 0.5, pixel, getHandActionProgress());

      // Outline
      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 1;
      ctx.strokeRect(headX, headY, headW, headH);
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
      ctx.strokeRect(bodyX - armW, leftArmY, armW, armH);
      ctx.strokeRect(bodyX + bodyW, rightArmY, armW, armH);
      ctx.strokeRect(bodyX, bodyY + bodyH + legSwing, legW, legH);
      ctx.strokeRect(bodyX + bodyW - legW, bodyY + bodyH - legSwing, legW, legH);
    }

    function drawMobLegs(legBaseY, legH, legW, leftLegX, rightLegX, swing, color) {
      ctx.fillStyle = color;
      ctx.fillRect(leftLegX, legBaseY + swing, legW, legH);
      ctx.fillRect(rightLegX, legBaseY - swing, legW, legH);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(leftLegX, legBaseY + swing, legW, legH);
      ctx.strokeRect(rightLegX, legBaseY - swing, legW, legH);
    }

    function drawCowMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.04) : 0;
      const headBob = moving ? Math.abs(Math.sin(mob.walkCycle * 1.2)) * (hPx * 0.03) : Math.sin(mob.idleCycle) * (hPx * 0.015);
      const dir = mob.facing >= 0 ? 1 : -1;

      const bodyW = wPx * 0.7, bodyH = hPx * 0.46;
      const bodyX = screenX + (wPx - bodyW) * 0.48;
      const bodyY = screenY + hPx * 0.38;
      const legW = wPx * 0.12, legH = hPx * 0.3;
      const legY = bodyY + bodyH - hPx * 0.02;

      drawMobLegs(legY, legH, legW, bodyX + wPx * 0.02, bodyX + bodyW - legW - wPx * 0.02, walk, '#3b2618');

      ctx.fillStyle = '#5d3b28';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
      ctx.fillStyle = '#f3f3f3';
      ctx.fillRect(bodyX + bodyW * 0.2, bodyY + bodyH * 0.18, bodyW * 0.2, bodyH * 0.24);
      ctx.fillRect(bodyX + bodyW * 0.58, bodyY + bodyH * 0.48, bodyW * 0.18, bodyH * 0.22);

      const headW = wPx * 0.27, headH = hPx * 0.27;
      const headX = dir > 0 ? bodyX + bodyW - headW * 0.18 : bodyX - headW * 0.82;
      const headY = bodyY + hPx * 0.04 + headBob;
      ctx.fillStyle = '#5d3b28';
      ctx.fillRect(headX, headY, headW, headH);
      ctx.fillStyle = '#f0c5b5';
      ctx.fillRect(headX + headW * 0.12, headY + headH * 0.55, headW * 0.76, headH * 0.35);
      ctx.fillStyle = '#111';
      ctx.fillRect(headX + (dir > 0 ? headW * 0.62 : headW * 0.2), headY + headH * 0.32, headW * 0.12, headH * 0.12);

      // Horns and tail
      ctx.fillStyle = '#ccb088';
      ctx.fillRect(headX + headW * 0.05, headY - headH * 0.13, headW * 0.16, headH * 0.12);
      ctx.fillRect(headX + headW * 0.79, headY - headH * 0.13, headW * 0.16, headH * 0.12);
      const tailX = dir > 0 ? bodyX - wPx * 0.04 : bodyX + bodyW;
      ctx.strokeStyle = '#3b2618';
      ctx.lineWidth = Math.max(1, wPx * 0.015);
      ctx.beginPath();
      ctx.moveTo(tailX, bodyY + bodyH * 0.35);
      ctx.lineTo(tailX - dir * wPx * 0.08, bodyY + bodyH * 0.48 + walk * 0.8);
      ctx.stroke();

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
      ctx.strokeRect(headX, headY, headW, headH);
    }

    function drawSheepMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.035) : 0;
      const headBob = moving ? Math.abs(Math.sin(mob.walkCycle)) * (hPx * 0.02) : Math.sin(mob.idleCycle) * (hPx * 0.012);
      const dir = mob.facing >= 0 ? 1 : -1;

      const bodyW = wPx * 0.74, bodyH = hPx * 0.52;
      const bodyX = screenX + (wPx - bodyW) * 0.46;
      const bodyY = screenY + hPx * 0.32;
      const legW = wPx * 0.11, legH = hPx * 0.28;
      const legY = bodyY + bodyH - hPx * 0.02;

      drawMobLegs(legY, legH, legW, bodyX + wPx * 0.03, bodyX + bodyW - legW - wPx * 0.03, walk, '#53453d');

      // Wool body
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bodyX + bodyW * 0.08, bodyY + bodyH * 0.08, bodyW * 0.82, bodyH * 0.65);

      const headW = wPx * 0.24, headH = hPx * 0.24;
      const headX = dir > 0 ? bodyX + bodyW - headW * 0.05 : bodyX - headW * 0.95;
      const headY = bodyY + hPx * 0.14 + headBob;
      ctx.fillStyle = '#4b3d35';
      ctx.fillRect(headX, headY, headW, headH);
      ctx.fillStyle = '#111';
      ctx.fillRect(headX + (dir > 0 ? headW * 0.62 : headW * 0.22), headY + headH * 0.34, headW * 0.12, headH * 0.12);

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
      ctx.strokeRect(headX, headY, headW, headH);
    }

    function drawPigMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.04) : 0;
      const headBob = moving ? Math.abs(Math.sin(mob.walkCycle * 1.1)) * (hPx * 0.02) : Math.sin(mob.idleCycle) * (hPx * 0.013);
      const dir = mob.facing >= 0 ? 1 : -1;

      const bodyW = wPx * 0.72, bodyH = hPx * 0.5;
      const bodyX = screenX + (wPx - bodyW) * 0.45;
      const bodyY = screenY + hPx * 0.34;
      const legW = wPx * 0.11, legH = hPx * 0.27;
      const legY = bodyY + bodyH - hPx * 0.02;

      drawMobLegs(legY, legH, legW, bodyX + wPx * 0.04, bodyX + bodyW - legW - wPx * 0.04, walk, '#b66f8c');

      ctx.fillStyle = '#f0a9c0';
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
      ctx.fillStyle = '#f7bed0';
      ctx.fillRect(bodyX + bodyW * 0.08, bodyY + bodyH * 0.15, bodyW * 0.75, bodyH * 0.45);

      const headW = wPx * 0.26, headH = hPx * 0.24;
      const headX = dir > 0 ? bodyX + bodyW - headW * 0.02 : bodyX - headW * 0.98;
      const headY = bodyY + hPx * 0.14 + headBob;
      ctx.fillStyle = '#f0a9c0';
      ctx.fillRect(headX, headY, headW, headH);
      ctx.fillStyle = '#d98ca7';
      ctx.fillRect(headX + headW * 0.2, headY + headH * 0.55, headW * 0.6, headH * 0.32);
      ctx.fillStyle = '#111';
      ctx.fillRect(headX + (dir > 0 ? headW * 0.62 : headW * 0.22), headY + headH * 0.32, headW * 0.12, headH * 0.12);

      // Curly tail
      const tailX = dir > 0 ? bodyX - wPx * 0.03 : bodyX + bodyW + wPx * 0.03;
      ctx.strokeStyle = '#cf7f9f';
      ctx.lineWidth = Math.max(1, wPx * 0.02);
      ctx.beginPath();
      ctx.arc(tailX, bodyY + bodyH * 0.45, wPx * 0.04, 0, Math.PI * 1.7);
      ctx.stroke();

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
      ctx.strokeRect(headX, headY, headW, headH);
    }

    function drawZombieMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.05) : 0;
      const dir = mob.facing >= 0 ? 1 : -1;
      const headH = hPx * 0.27;
      const bodyH = hPx * 0.4;
      const legH = hPx * 0.33;
      const armW = wPx * 0.24;
      const armH = hPx * 0.33;
      const bodyY = screenY + headH;
      const legY = bodyY + bodyH;

      ctx.fillStyle = '#4ca65a';
      ctx.fillRect(screenX + wPx * 0.15, screenY, wPx * 0.7, headH);
      ctx.fillStyle = '#2f6db2';
      ctx.fillRect(screenX + wPx * 0.2, bodyY, wPx * 0.6, bodyH);
      ctx.fillStyle = '#7b3fc8';
      ctx.fillRect(screenX + wPx * 0.2, legY + walk, wPx * 0.25, legH);
      ctx.fillRect(screenX + wPx * 0.55, legY - walk, wPx * 0.25, legH);
      ctx.fillStyle = '#4ca65a';
      ctx.fillRect(screenX + (dir > 0 ? wPx * 0.02 : wPx * 0.74), bodyY + walk * 0.6, armW, armH);
      ctx.fillRect(screenX + (dir > 0 ? wPx * 0.74 : wPx * 0.02), bodyY - walk * 0.6, armW, armH);
      ctx.fillStyle = '#111';
      ctx.fillRect(screenX + wPx * 0.36, screenY + headH * 0.35, wPx * 0.1, headH * 0.12);
      ctx.fillRect(screenX + wPx * 0.54, screenY + headH * 0.35, wPx * 0.1, headH * 0.12);
    }

    function drawSkeletonMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.04) : 0;
      const headH = hPx * 0.24;
      const bodyY = screenY + headH;
      const legY = bodyY + hPx * 0.4;
      const dir = mob.facing >= 0 ? 1 : -1;

      ctx.fillStyle = '#dcdcdc';
      ctx.fillRect(screenX + wPx * 0.18, screenY, wPx * 0.64, headH);
      ctx.fillRect(screenX + wPx * 0.4, bodyY, wPx * 0.2, hPx * 0.4);
      ctx.fillRect(screenX + wPx * 0.18, bodyY + hPx * 0.08, wPx * 0.2, hPx * 0.36);
      ctx.fillRect(screenX + wPx * 0.62, bodyY + hPx * 0.08, wPx * 0.2, hPx * 0.36);
      ctx.fillRect(screenX + wPx * 0.34, legY + walk, wPx * 0.12, hPx * 0.33);
      ctx.fillRect(screenX + wPx * 0.54, legY - walk, wPx * 0.12, hPx * 0.33);
      ctx.fillStyle = '#111';
      ctx.fillRect(screenX + wPx * 0.34, screenY + headH * 0.36, wPx * 0.1, headH * 0.1);
      ctx.fillRect(screenX + wPx * 0.56, screenY + headH * 0.36, wPx * 0.1, headH * 0.1);

      // Bow (held in front arm)
      const bowX = dir > 0 ? screenX + wPx * 0.76 : screenX + wPx * 0.06;
      const bowY = bodyY + hPx * 0.14;
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = Math.max(1, wPx * 0.05);
      ctx.beginPath();
      ctx.arc(bowX, bowY + hPx * 0.07, wPx * 0.1, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : -Math.PI / 2, dir < 0);
      ctx.stroke();
      ctx.strokeStyle = '#d9d9d9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bowX, bowY - hPx * 0.03);
      ctx.lineTo(bowX, bowY + hPx * 0.17);
      ctx.stroke();
    }

    function drawCreeperMob(mob, screenX, screenY, wPx, hPx, moving) {
      const walk = moving ? Math.sin(mob.walkCycle) * (hPx * 0.03) : 0;
      const pixel = Math.max(1, Math.floor(Math.min(wPx, hPx) / 12));
      const headX = screenX + wPx * 0.2;
      const headY = screenY;
      const headW = wPx * 0.6;
      const headH = hPx * 0.32;
      const bodyX = screenX + wPx * 0.22;
      const bodyY = headY + headH + pixel * 0.6; // visible separation between head and body
      const bodyW = wPx * 0.56;
      const bodyH = hPx * 0.46;

      const fusing = mob.fuseTimer != null && mob.fuseTimer > 0;
      const flash = fusing && Math.floor(mob.fuseTimer * 20) % 2 === 0;
      const baseGreen = flash ? '#b8ff95' : '#67b64b';
      const darkGreen = flash ? '#93d873' : '#4b9a3b';
      const lightGreen = flash ? '#ccffac' : '#82c65f';
      const legGreen = flash ? '#8fd96d' : '#4c943a';

      // Head
      ctx.fillStyle = baseGreen;
      ctx.fillRect(headX, headY, headW, headH);
      ctx.fillStyle = darkGreen;
      for (let y = 0; y < headH; y += pixel * 2) {
        for (let x = 0; x < headW; x += pixel * 2) {
          if (((x / pixel) + (y / pixel)) % 3 === 0) {
            ctx.fillRect(headX + x, headY + y, pixel, pixel);
          }
        }
      }
      // Head face
      const faceY = headY + headH * 0.2;
      ctx.fillStyle = '#111';
      ctx.fillRect(headX + headW * 0.23, faceY, headW * 0.14, headH * 0.22);
      ctx.fillRect(headX + headW * 0.63, faceY, headW * 0.14, headH * 0.22);
      ctx.fillRect(headX + headW * 0.42, faceY + headH * 0.2, headW * 0.16, headH * 0.32);
      ctx.fillRect(headX + headW * 0.32, faceY + headH * 0.38, headW * 0.36, headH * 0.12);
      ctx.fillRect(headX + headW * 0.34, faceY + headH * 0.5, headW * 0.12, headH * 0.16);
      ctx.fillRect(headX + headW * 0.54, faceY + headH * 0.5, headW * 0.12, headH * 0.16);

      // Base body
      ctx.fillStyle = baseGreen;
      ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

      // Minecraft-like green dither pattern
      ctx.fillStyle = darkGreen;
      for (let y = 0; y < bodyH; y += pixel * 2) {
        for (let x = 0; x < bodyW; x += pixel * 2) {
          if (((x / pixel) + (y / pixel)) % 3 === 0) {
            ctx.fillRect(bodyX + x, bodyY + y, pixel, pixel);
          }
        }
      }
      ctx.fillStyle = lightGreen;
      for (let y = pixel; y < bodyH; y += pixel * 3) {
        for (let x = pixel; x < bodyW; x += pixel * 3) {
          if (((x / pixel) + (y / pixel)) % 2 === 0) {
            ctx.fillRect(bodyX + x, bodyY + y, pixel, pixel);
          }
        }
      }

      // Four legs
      const legW = bodyW * 0.19;
      const legH = hPx * 0.22;
      const legY = bodyY + bodyH - pixel * 0.3;
      ctx.fillStyle = legGreen;
      ctx.fillRect(bodyX + bodyW * 0.02, legY + walk, legW, legH);
      ctx.fillRect(bodyX + bodyW * 0.29, legY - walk, legW, legH);
      ctx.fillRect(bodyX + bodyW * 0.56, legY + walk, legW, legH);
      ctx.fillRect(bodyX + bodyW * 0.79, legY - walk, legW, legH);

      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.38)';
      ctx.lineWidth = 1;
      ctx.strokeRect(headX, headY, headW, headH);
      ctx.strokeRect(bodyX, bodyY, bodyW, bodyH);
    }

    function drawMob(mob, cam) {
      const worldPx = mob.x * tileSize;
      const worldPy = mob.y * tileSize;
      const screenX = worldPx - cam.x - (mob.w * tileSize) / 2;
      const screenY = canvas.height - (worldPy - cam.y) - (mob.h * tileSize) / 2;
      const wPx = mob.w * tileSize;
      const hPx = mob.h * tileSize;
      const moving = Math.abs(mob.vx) > 0.08;

      if (mob.hostile) {
        if (mob.type === 'zombie') drawZombieMob(mob, screenX, screenY, wPx, hPx, moving);
        else if (mob.type === 'skeleton') drawSkeletonMob(mob, screenX, screenY, wPx, hPx, moving);
        else drawCreeperMob(mob, screenX, screenY, wPx, hPx, moving);
      } else if (mob.type === 'cow') {
        drawCowMob(mob, screenX, screenY, wPx, hPx, moving);
      } else if (mob.type === 'sheep') {
        drawSheepMob(mob, screenX, screenY, wPx, hPx, moving);
      } else {
        drawPigMob(mob, screenX, screenY, wPx, hPx, moving);
      }

      // Health bar over hostile mobs
      if (mob.hostile) {
        const ratio = Math.max(0, mob.health / mob.maxHealth);
        const barW = wPx * 0.9;
        const barX = screenX + (wPx - barW) / 2;
        const barY = screenY - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(barX, barY, barW, 4);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(barX, barY, barW * ratio, 4);
      }

      // Red hurt flash
      if (mob.hurtTimer > 0) {
        ctx.fillStyle = 'rgba(255, 45, 45, 0.35)';
        ctx.fillRect(screenX, screenY, wPx, hPx);
      }
    }

    function autoSpawnHostiles(dt) {
      const hostileCount = mobs.filter(m => m.hostile).length;
      let mode = 'cave';
      let cap = 14;
      let interval = 3.6;

      if (isNightTime()) {
        mode = 'night_any';
        cap = 38;
        interval = 1.3;
      } else if (weather === 'rain') {
        mode = 'rain_day';
        cap = 16;
        interval = 2.7;
      }

      if (hostileCount >= cap) return;
      hostileSpawnTimer -= dt;
      if (hostileSpawnTimer > 0) return;
      hostileSpawnTimer = interval * (0.7 + Math.random() * 0.7);

      const types = ['zombie', 'skeleton', 'creeper'];
      const type = types[Math.floor(Math.random() * types.length)];
      const pos = findHostileSpawnPosition(mode, HOSTILE_TYPES[type]);
      if (pos) spawnHostile(type, pos.x, pos.y);
    }

    function autoSpawnPassives(dt) {
      const passiveCount = mobs.filter(m => !m.hostile).length;
      if (isNightTime()) return;
      if (passiveCount >= 18) return;

      passiveSpawnTimer -= dt;
      if (passiveSpawnTimer > 0) return;
      passiveSpawnTimer = 4.2 * (0.75 + Math.random() * 0.9);

      const types = ['cow', 'sheep', 'pig'];
      const type = types[Math.floor(Math.random() * types.length)];
      const pos = findPassiveSpawnPosition(MOB_TYPES[type]);
      if (pos) spawnPassive(type, pos.x, pos.y);
    }

    function draw(){
      // Update time
      gameTime = (gameTime + timeSpeed) % 24000;

      // Calculate lighting based on time (darker at night)
      const timeOfDay = gameTime / 24000;
      let brightness = 1;
      if (timeOfDay > 0.25 && timeOfDay < 0.75) { // Day time
        brightness = 1;
      } else { // Night time
        brightness = 0.3;
      }

      ctx.clearRect(0,0,canvas.width,canvas.height);
      const cam = getCameraOffset();

      const startX = Math.floor(cam.x / tileSize) - 1;
      const endX = Math.ceil((cam.x + canvas.width) / tileSize) + 1;
      const startY = Math.floor(cam.y / tileSize) - 1;
      const endY = Math.ceil((cam.y + canvas.height) / tileSize) + 1;
      function isAirBlock(gx, gy) {
        if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT) return true;
        return !world[gx][gy];
      }

      function blockTouchesAir(gx, gy) {
        return isAirBlock(gx - 1, gy)
          || isAirBlock(gx + 1, gy)
          || isAirBlock(gx, gy - 1)
          || isAirBlock(gx, gy + 1);
      }

      for (let gx = startX; gx <= endX; gx++){
        for (let gy = startY; gy <= endY; gy++){
          const sx = gx * tileSize - cam.x;
          const sy = canvas.height - ((gy+1) * tileSize - cam.y);
          if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT){
            // Sky with time-based color
            let skyColor = '#87CEEB'; // Day sky
            if (brightness < 0.5) skyColor = '#191970'; // Night sky
            ctx.fillStyle = skyColor;
            ctx.fillRect(sx, sy, tileSize, tileSize);
            continue;
          }
          const t = world[gx][gy];
          if (t){
            const block = BLOCKS.find(b=>b.id===t);
            const blockBrightness = blockTouchesAir(gx, gy) ? 1 : 0.16;
            ctx.fillStyle = block.color;
            if (blockBrightness < 1) {
              const rgb = hexToRgb(block.color);
              ctx.fillStyle = `rgb(${Math.floor(rgb.r * blockBrightness)}, ${Math.floor(rgb.g * blockBrightness)}, ${Math.floor(rgb.b * blockBrightness)})`;
            }
            ctx.fillRect(sx, sy, tileSize, tileSize);
          } else {
            let skyColor = '#87CEEB'; // Day sky
            if (brightness < 0.5) skyColor = '#191970'; // Night sky
            ctx.fillStyle = skyColor;
            ctx.fillRect(sx, sy, tileSize, tileSize);
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.strokeRect(sx+0.5, sy+0.5, tileSize-1, tileSize-1);
        }
      }

      // Pixel clouds: fewer in clear weather, more in rain.
      const cloudCount = weather === 'rain' ? clouds.length : Math.floor(clouds.length * 0.72);
      const cloudColor = weather === 'rain'
        ? (brightness < 0.5 ? 'rgba(120,130,145,0.52)' : 'rgba(155,165,180,0.66)')
        : (brightness < 0.5 ? 'rgba(190,200,220,0.28)' : 'rgba(250,255,255,0.72)');
      ctx.fillStyle = cloudColor;
      for (let i = 0; i < cloudCount; i++) {
        const c = clouds[i];
        const cellPx = c.cell * tileSize;
        const cloudW = c.widthTiles * tileSize;
        const cloudH = c.heightTiles * tileSize;
        const cloudX = c.cx * tileSize - cam.x - cloudW / 2;
        const cloudY = canvas.height - (c.cy * tileSize - cam.y) - cloudH / 2;
        for (const cell of c.mask) {
          ctx.fillRect(cloudX + cell.x * cellPx, cloudY + cell.y * cellPx, cellPx, cellPx);
        }
      }

      // Weather effects
      if (weather === 'rain') {
        const rainColor = brightness >= 1
          ? 'rgba(55, 95, 165, 0.72)'   // Darker rain in daytime
          : 'rgba(100, 149, 237, 0.6)'; // Existing rain at night
        ctx.fillStyle = rainColor;
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const worldPx = x + cam.x;
          const worldPy = (canvas.height - y) + cam.y;
          const gx = Math.floor(worldPx / tileSize);
          const gy = Math.floor(worldPy / tileSize);
          if (!hasOpenSkyAt(gx, gy)) continue;
          ctx.fillRect(x, y, 1, 8);
        }
      }

      // Render mobs
      mobs.forEach(mob => {
        drawMob(mob, cam);
      });

      // Render hostile arrows
      ctx.strokeStyle = '#3b2a1a';
      ctx.lineWidth = Math.max(1, tileSize * 0.07);
      hostileArrows.forEach(a => {
        const sx = a.x * tileSize - cam.x;
        const sy = canvas.height - (a.y * tileSize - cam.y);
        const ex = sx + (a.vx >= 0 ? 7 : -7);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, sy - a.vy * 0.4);
        ctx.stroke();
      });

      // player
      const worldPx = player.x * tileSize;
      const worldPy = player.y * tileSize;
      const screenX = worldPx - cam.x - (player.w*tileSize)/2;
      const screenY = canvas.height - (worldPy - cam.y) - (player.h*tileSize)/2;

      const moving = Math.abs(player.vx) > 0.15 && player.grounded;
      const charPixel = (player.h * tileSize) / 32;
      if (player.model === 'alex') {
        drawPlayerWithDeathPose(drawAlex, screenX, screenY, charPixel, player.facing, player.walkCycle, moving);
      } else {
        drawPlayerWithDeathPose(drawSteve, screenX, screenY, charPixel, player.facing, player.walkCycle, moving);
      }
      drawMiningCracks(cam);
      if (player.hurtTimer > 0 && !deathSequence.active) {
        ctx.fillStyle = 'rgba(255, 45, 45, 0.35)';
        ctx.fillRect(screenX, screenY, player.w * tileSize, player.h * tileSize);
      }

      // highlight mouse tile
      const cam2 = getCameraOffset();
      const worldPxM = mouse.x + cam2.x; const worldPyM = (canvas.height - mouse.y) + cam2.y;
      const hx = Math.floor(worldPxM / tileSize); const hy = Math.floor(worldPyM / tileSize);
      const hsx = hx * tileSize - cam2.x; const hsy = canvas.height - ((hy+1) * tileSize - cam2.y);
      if (hx>=0 && hy>=0 && hx<WIDTH && hy<HEIGHT){ ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2; ctx.strokeRect(hsx+1, hsy+1, tileSize-2, tileSize-2); }

      // Draw block tooltip
      if (blockTooltip.show) {
        ctx.save();
        ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const padding = 8;
        const textWidth = ctx.measureText(blockTooltip.blockName).width;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = 20;

        // Tooltip background
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(blockTooltip.x, blockTooltip.y, tooltipWidth, tooltipHeight);

        // Tooltip border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(blockTooltip.x, blockTooltip.y, tooltipWidth, tooltipHeight);

        // Tooltip text
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(blockTooltip.blockName, blockTooltip.x + padding, blockTooltip.y + padding - 2);

        ctx.restore();
      }
    }

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }

