    let mouse = { x:0, y:0 };
    let mouseButtons = { left: false, right: false };
    let blockTooltip = { show: false, x: 0, y: 0, blockName: '' };
    let doorStates = {}; // Track open/closed state of doors by coordinate
    const BREAK_TIME = {
      grass: 0.3,
      dirt: 0.35,
      stone: 1.25,
      log: 0.9,
      water: Infinity,
      planks: 0.7,
      bricks: 1.7,
      ladder: 0.25,
      door: 0.65,
      glass: 0.15,
      coal_ore: 1.35,
      iron_ore: 1.65,
      gold_ore: 1.9,
      diamond_ore: 2.2
    };
    let miningState = { active: false, gx: 0, gy: 0, progress: 0, required: 0, swingTimer: 0 };

    function resetMining() {
      const wasActive = miningState.active;
      miningState.active = false;
      miningState.progress = 0;
      miningState.required = 0;
      miningState.swingTimer = 0;
      if (wasActive && player.handActionTimer <= 0) player.handToolId = null;
    }

    function getSelectedItemId() {
      const slot = hotbarInventory[selected];
      return slot ? slot.id : null;
    }

    function getPlayerAttackDamage() {
      const id = getSelectedItemId();
      if (id === 'wood_sword') return 6;
      if (id === 'gold_sword') return 8;
      if (id === 'stone_sword') return 8.5;
      if (id === 'iron_sword') return 9;
      if (id === 'diamond_sword') return 11;
      return 4;
    }

    function getToolMiningMultiplier(blockId) {
      const id = getSelectedItemId();
      if (!id) return 1;
      if ((blockId === 'grass' || blockId === 'dirt') && id.endsWith('_shovel')) {
        if (id === 'wood_shovel') return 1.8;
        if (id === 'gold_shovel') return 2.2;
        if (id === 'stone_shovel') return 2.45;
        if (id === 'iron_shovel') return 2.7;
        if (id === 'diamond_shovel') return 3.2;
      }
      if ((blockId === 'stone' || blockId.endsWith('_ore')) && id.endsWith('_pickaxe')) {
        if (id === 'wood_pickaxe') return 1.8;
        if (id === 'gold_pickaxe') return 2.2;
        if (id === 'stone_pickaxe') return 2.45;
        if (id === 'iron_pickaxe') return 2.7;
        if (id === 'diamond_pickaxe') return 3.3;
      }
      if (blockId === 'log' && id.endsWith('_axe')) {
        if (id === 'wood_axe') return 1.8;
        if (id === 'gold_axe') return 2.2;
        if (id === 'stone_axe') return 2.45;
        if (id === 'iron_axe') return 2.7;
        if (id === 'diamond_axe') return 3.2;
      }
      return 1;
    }

    function getActionToolForBlock(blockId) {
      const id = getSelectedItemId();
      if (!id) return null;
      if ((blockId === 'grass' || blockId === 'dirt') && id.endsWith('_shovel')) return id;
      if ((blockId === 'stone' || blockId.endsWith('_ore')) && id.endsWith('_pickaxe')) return id;
      if (blockId === 'log' && id.endsWith('_axe')) return id;
      return null;
    }

    function getMouseGridTarget() {
      const cam = getCameraOffset();
      const worldPx = mouse.x + cam.x;
      const worldPy = (canvas.height - mouse.y) + cam.y;
      const gx = Math.floor(worldPx / tileSize);
      const gy = Math.floor(worldPy / tileSize);
      return { gx, gy, worldPx, worldPy };
    }

    function isWithinInteractionRangeWorld(wx, wy) {
      return Math.hypot(wx - player.x, wy - player.y) <= INTERACTION_RANGE;
    }

    function isWithinInteractionRangeTile(gx, gy) {
      return isWithinInteractionRangeWorld(gx + 0.5, gy + 0.5);
    }

    function breakBlockAt(gx, gy) {
      if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT) return false;
      const block = world[gx][gy];
      if (!block) return false;
      player.handToolId = getActionToolForBlock(block);
      if (block === 'door') {
        const lowerY = (gy > 0 && world[gx][gy - 1] === 'door') ? gy - 1 : gy;
        const key = `${gx},${lowerY}`;
        delete doorStates[key];
        world[gx][lowerY] = null;
        if (lowerY + 1 < HEIGHT && world[gx][lowerY + 1] === 'door') world[gx][lowerY + 1] = null;
        addItemToInventory('door', 1);
      } else {
        if (block === 'iron_ore') registerMaterialAcquired('iron');
        if (block === 'gold_ore') registerMaterialAcquired('gold');
        if (block === 'diamond_ore') registerMaterialAcquired('diamond');
        const dropItemId = getDropItemId(block);
        if (dropItemId) addItemToInventory(dropItemId, 1);
        world[gx][gy] = null;
      }
      player.handActionSide = (gx + 0.5) >= player.x ? 1 : -1;
      player.handActionTimer = HAND_ACTION_DURATION;
      return true;
    }

    function drawMiningCracks(cam) {
      if (!miningState.active || miningState.required <= 0) return;
      const gx = miningState.gx, gy = miningState.gy;
      if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT || !world[gx][gy]) return;

      const progress = Math.max(0, Math.min(1, miningState.progress / miningState.required));
      if (progress <= 0) return;

      const sx = gx * tileSize - cam.x;
      const sy = canvas.height - ((gy + 1) * tileSize - cam.y);
      const lineCount = Math.max(1, Math.ceil(progress * 10));
      const alpha = 0.18 + progress * 0.55;
      const segs = [
        [0.12,0.14,0.48,0.28], [0.52,0.26,0.86,0.1], [0.42,0.42,0.76,0.56],
        [0.18,0.52,0.4,0.82], [0.62,0.56,0.82,0.86], [0.1,0.34,0.22,0.64],
        [0.48,0.14,0.5,0.52], [0.28,0.7,0.62,0.92], [0.72,0.34,0.9,0.62],
        [0.3,0.18,0.7,0.76]
      ];

      ctx.strokeStyle = `rgba(20,20,20,${alpha})`;
      ctx.lineWidth = Math.max(1, tileSize * 0.08);
      for (let i = 0; i < lineCount; i++) {
        const s = segs[i];
        ctx.beginPath();
        ctx.moveTo(sx + s[0] * tileSize, sy + s[1] * tileSize);
        ctx.lineTo(sx + s[2] * tileSize, sy + s[3] * tileSize);
        ctx.stroke();
      }
    }

    function handleBlockAction(e) {
      if (deathSequence.active) return;
      const { gx, gy, worldPx, worldPy } = getMouseGridTarget();
      if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT) return;
      let acted = false;

      function findMobAtPointer() {
        for (const mob of mobs) {
          if (mob.health != null && mob.health <= 0) continue;
          const left = mob.x - mob.w / 2, right = mob.x + mob.w / 2;
          const bottom = mob.y - mob.h / 2, top = mob.y + mob.h / 2;
          const wx = worldPx / tileSize;
          const wy = worldPy / tileSize;
          const inBounds = wx >= left && wx <= right && wy >= bottom && wy <= top;
          const inReach = isWithinInteractionRangeWorld(mob.x, mob.y);
          if (inBounds && inReach) return mob;
        }
        return null;
      }

      function getDoorLowerY(x, y) {
        if (world[x][y] !== 'door') return null;
        if (y > 0 && world[x][y - 1] === 'door') return y - 1;
        return y;
      }

      if (e.button === 0 || mouseButtons.left) {
        const mobTarget = findMobAtPointer();
        if (mobTarget && player.attackCooldown <= 0) {
          damageMob(mobTarget, getPlayerAttackDamage(), player.x);
          player.attackCooldown = 0.28;
          player.handToolId = getSelectedItemId()?.endsWith('_sword') ? getSelectedItemId() : null;
          player.handActionSide = mobTarget.x >= player.x ? 1 : -1;
          player.handActionTimer = HAND_ACTION_DURATION;
          return;
        }
      } else if (e.button === 1 || e.button === 2) {
        // Middle click or right click on door toggles it
        if (e.button === 1 && world[gx][gy] === 'door') {
          if (!isWithinInteractionRangeTile(gx, gy)) return;
          const lowerY = getDoorLowerY(gx, gy);
          const key = `${gx},${lowerY}`;
          doorStates[key] = !doorStates[key];
        } else if (e.button === 2) {
          if (!isWithinInteractionRangeTile(gx, gy)) return;
          // Right click to place blocks
          const left = player.x - player.w/2, right = player.x + player.w/2, bottom = player.y - PLAYER_COLLIDER_H/2, top = player.y + PLAYER_COLLIDER_H/2;
          if (gx+1 > left && gx < right && gy+1 > bottom && gy < top) return;

          const selectedItem = hotbarInventory[selected];
          if (!selectedItem || selectedItem.count <= 0) return;
          const selectedBlock = selectedItem.id;
          if (selectedBlock === 'meat') {
            if (player.health >= player.maxHealth) return;
            player.health = Math.min(player.maxHealth, player.health + (1 + Math.floor(Math.random() * 2)));
            player.regenDelay = 0;
            player.regenAccum = 0;
            updateHealthUI();
            consumeSelectedItem(1);
            acted = true;
            return;
          }
          if (!isPlaceableItem(selectedBlock)) return;
          if (selectedBlock === 'door') {
            // Place 2-block tall door from lower block (clicked) upward
            if (gy >= 0 && gy < HEIGHT-1 && !world[gx][gy] && !world[gx][gy+1]) {
              world[gx][gy] = 'door';
              world[gx][gy+1] = 'door';
              consumeSelectedItem(1);
              acted = true;
              // Initialize door state on lower door block
              const key = `${gx},${gy}`;
              doorStates[key] = false;
            }
          } else {
            if (world[gx][gy] !== selectedBlock) {
              world[gx][gy] = selectedBlock;
              consumeSelectedItem(1);
              acted = true;
            }
          }
        }
      }

      if (acted) {
        player.handToolId = null;
        player.handActionSide = (gx + 0.5) >= player.x ? 1 : -1;
        player.handActionTimer = HAND_ACTION_DURATION;
      }
    }

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;

      // Update block tooltip
      const cam = getCameraOffset();
      const worldPx = mouse.x + cam.x;
      const worldPy = (canvas.height - mouse.y) + cam.y;
      const gx = Math.floor(worldPx / tileSize);
      const gy = Math.floor(worldPy / tileSize);

      if (gx >= 0 && gy >= 0 && gx < WIDTH && gy < HEIGHT) {
        const block = world[gx][gy];
        if (block) {
          const blockData = BLOCKS.find(b => b.id === block);
          if (blockData) {
            blockTooltip.show = true;
            blockTooltip.x = mouse.x + 15;
            blockTooltip.y = mouse.y - 10;
            blockTooltip.blockName = block.charAt(0).toUpperCase() + block.slice(1);
          } else {
            blockTooltip.show = false;
          }
        } else {
          blockTooltip.show = false;
        }
      } else {
        blockTooltip.show = false;
      }

      // Handle dragging
      if (mouseButtons.right) {
        handleBlockAction({ button: 2 });
      }
    });

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) mouseButtons.left = true;
      if (e.button === 2) mouseButtons.right = true;
      handleBlockAction(e);
    });

    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) mouseButtons.left = false;
      if (e.button === 2) mouseButtons.right = false;
      if (e.button === 0) resetMining();
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; updateTileSize(); }
    window.addEventListener('resize', resize); resize();

