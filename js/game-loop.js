    let last = performance.now();
    function loop(t){
      const dt = Math.min((t-last)/1000, 0.05); last = t;
      if (deathSequence.active) {
        deathSequence.timer = Math.max(0, deathSequence.timer - dt);
        const progress = 1 - (deathSequence.timer / deathSequence.duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        cameraZoom = deathSequence.zoomStart + (deathSequence.zoomTarget - deathSequence.zoomStart) * eased;
        updateTileSize();
      }
      // input
      if (player.handActionTimer > 0) {
        player.handActionTimer = Math.max(0, player.handActionTimer - dt);
        if (player.handActionTimer <= 0) player.handToolId = null;
      }
      if (player.attackCooldown > 0) {
        player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      }
      if (player.invulnTimer > 0) {
        player.invulnTimer = Math.max(0, player.invulnTimer - dt);
      }
      if (player.hurtTimer > 0) {
        player.hurtTimer = Math.max(0, player.hurtTimer - dt);
      }
      // Natural weather cycle
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        rollNaturalWeather();
      }
      if (player.regenDelay > 0) {
        player.regenDelay = Math.max(0, player.regenDelay - dt);
      } else if (player.health > 0 && player.health < player.maxHealth) {
        player.regenAccum += dt;
        if (player.regenAccum >= 2.0) {
          player.regenAccum = 0;
          player.health = Math.min(player.maxHealth, player.health + 1);
          updateHealthUI();
        }
      }
      // Cloud drift
      for (const c of clouds) {
        c.cx += c.speed * dt * (weather === 'rain' ? 1.2 : 1.0);
        if (c.cx - c.widthTiles / 2 > WIDTH + 8) {
          c.cx = -8 - c.widthTiles / 2;
          c.cy = HEIGHT * 0.62 + Math.random() * (HEIGHT * 0.26);
        }
      }
      // Timed block mining (hold left click).
      if (!deathSequence.active && mouseButtons.left) {
        const { gx, gy } = getMouseGridTarget();
        if (gx < 0 || gy < 0 || gx >= WIDTH || gy >= HEIGHT || !world[gx][gy] || !isWithinInteractionRangeTile(gx, gy)) {
          resetMining();
        } else {
          if (!miningState.active || miningState.gx !== gx || miningState.gy !== gy) {
            miningState.active = true;
            miningState.gx = gx;
            miningState.gy = gy;
            miningState.progress = 0;
            miningState.swingTimer = 0;
          }
          const blockId = world[gx][gy];
          const baseRequired = BREAK_TIME[blockId] ?? 0.8;
          const required = baseRequired / getToolMiningMultiplier(blockId);
          miningState.required = required;
          if (Number.isFinite(required)) {
            miningState.swingTimer = (miningState.swingTimer + dt) % HAND_ACTION_DURATION;
            miningState.progress += dt;
            player.handToolId = getActionToolForBlock(blockId);
            player.handActionSide = (gx + 0.5) >= player.x ? 1 : -1;
            if (miningState.progress >= required) {
              breakBlockAt(gx, gy);
              resetMining();
            }
          }
        }
      } else {
        resetMining();
      }
      if (!deathSequence.active) {
        let ax = 0;
        if (keys.left) ax -= 1; if (keys.right) ax += 1;
        const targetVx = ax * player.speed;
        // simple accel
        player.vx += (targetVx - player.vx) * Math.min(10*dt, 1);
        if (Math.abs(player.vx) > 0.1) player.facing = player.vx > 0 ? 1 : -1;
        // gravity
        const onLadder = isOnLadder();
        if (!onLadder) {
          player.vy += -25 * dt;
        } else {
          // On ladder - allow climbing
          let climbSpeed = 0;
          if (keys.jump) climbSpeed += player.speed * 0.8; // Up
          if (keys.down) climbSpeed -= player.speed * 0.8; // Down
          player.vy += (climbSpeed - player.vy) * Math.min(15*dt, 1); // Smooth climbing
        }
        const wasGrounded = player.grounded;
        if (!wasGrounded && player.vy < 0) {
          player.maxFallSpeed = Math.max(player.maxFallSpeed, -player.vy);
        }

        const moveX = player.vx * dt;
        const moveY = player.vy * dt;
        const maxMove = Math.max(Math.abs(moveX), Math.abs(moveY));
        const moveSteps = Math.max(1, Math.ceil(maxMove / 0.35));
        let grounded = false;
        for (let s = 0; s < moveSteps; s++) {
          player.x += moveX / moveSteps;
          player.y += moveY / moveSteps;
          if (resolveCollisions()) grounded = true;
        }
        if (!grounded && player.vy < 0) {
          player.maxFallSpeed = Math.max(player.maxFallSpeed, -player.vy);
        }
        player.grounded = grounded;
        if (grounded && !wasGrounded) {
          const impactSpeed = player.maxFallSpeed;
          if (impactSpeed > 12) {
            const fallDamage = Math.max(1, Math.floor((impactSpeed - 12) / 2));
            damagePlayer(fallDamage);
          }
          player.maxFallSpeed = 0;
        } else if (grounded) {
          player.maxFallSpeed = 0;
        }
        if (grounded && keys.jump && !onLadder){ player.vy = 9.0; }
        if (Math.abs(player.vx) > 0.15 && grounded) {
          player.walkCycle += dt * 14;
        }

        // Clamp horizontal bounds; allow falling below world so void death can trigger.
        player.x = Math.max(0.2, Math.min(WIDTH-0.2, player.x));
        player.y = Math.min(HEIGHT-0.2, player.y);
        if (player.y < -1) {
          startDeathSequence();
        }
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      // Update hostile arrows
      for (let i = hostileArrows.length - 1; i >= 0; i--) {
        const a = hostileArrows[i];
        a.life -= dt;
        a.vy += -6.5 * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        const gx = Math.floor(a.x);
        const gy = Math.floor(a.y);
        if (a.life <= 0 || gx < 0 || gx >= WIDTH || gy < 0 || gy >= HEIGHT || isSolid(gx, gy)) {
          hostileArrows.splice(i, 1);
          continue;
        }

        const left = player.x - player.w / 2;
        const right = player.x + player.w / 2;
        const bottom = player.y - PLAYER_COLLIDER_H / 2;
        const top = player.y + PLAYER_COLLIDER_H / 2;
        if (a.x >= left && a.x <= right && a.y >= bottom && a.y <= top) {
          damagePlayer(a.damage, a.x);
          hostileArrows.splice(i, 1);
        }
      }

      autoSpawnHostiles(dt);
      autoSpawnPassives(dt);

      // Update mobs
      mobs.forEach((mob) => {
        if (mob.health == null) {
          const base = mob.hostile ? HOSTILE_TYPES[mob.type] : MOB_TYPES[mob.type];
          if (base && base.maxHealth) {
            mob.maxHealth = base.maxHealth;
            mob.health = base.maxHealth;
          }
        }
        if (mob.maxFallSpeed == null) mob.maxFallSpeed = 0;
        if (mob.grounded == null) mob.grounded = false;

        if (mob.hostile) {
          const dx = player.x - mob.x;
          const dy = player.y - mob.y;
          const dist = Math.hypot(dx, dy);
          const inAggro = dist <= HOSTILE_AGGRO_RADIUS && Math.abs(dy) < 6;
          if (inAggro) {
            // All hostile mobs chase the player; attack style depends on mob type.
            mob.direction = dx >= 0 ? 1 : -1;
            if (mob.type === 'skeleton') {
              if (mob.rangedCooldown == null) mob.rangedCooldown = 0;
              mob.rangedCooldown = Math.max(0, mob.rangedCooldown - dt);
              // Skeletons keep chasing but attack by shooting.
              if (dist >= 3.5 && dist <= HOSTILE_AGGRO_RADIUS && Math.abs(dy) < 4.2 && mob.rangedCooldown <= 0) {
                fireSkeletonArrow(mob, player);
                mob.rangedCooldown = 1.15 + Math.random() * 0.75;
              }
            }
          } else {
            mob.moveTimer -= dt;
            if (mob.moveTimer <= 0) {
              mob.direction = Math.random() > 0.5 ? 1 : -1;
              mob.moveTimer = 1.2 + Math.random() * 1.8;
            }
          }
          if (mob.attackTimer > 0) mob.attackTimer = Math.max(0, mob.attackTimer - dt);
          if (mob.type === 'creeper') {
            if (dist <= 4.0 && Math.abs(dy) < 2.5) {
              if (mob.fuseTimer < 0) mob.fuseTimer = CREEPER_FUSE_TIME;
            } else {
              mob.fuseTimer = -1;
            }

            if (mob.fuseTimer > 0) {
              mob.fuseTimer -= dt;
              if (mob.fuseTimer <= 0) {
                // Creeper dies on explosion; player dies if within blast radius.
                explodeBlocksAt(mob.x, mob.y, 2.6);
                const blastDist = Math.hypot(player.x - mob.x, player.y - mob.y);
                if (blastDist < 1.9) {
                  startDeathSequence();
                } else if (blastDist < 5.0) {
                  // Further from center: heavy but non-lethal-style blast damage.
                  const t = (blastDist - 1.9) / (5.0 - 1.9); // 0 near core -> 1 at edge
                  const dmg = 10 - t * 7; // ~10 down to ~3
                  damagePlayer(Math.max(2, dmg), mob.x);
                }
                mob.health = 0;
                return;
              }
            }
          } else if (dist < 1.35 && Math.abs(dy) < 1.6 && mob.attackTimer <= 0) {
            damagePlayer(mob.damage, mob.x);
            mob.attackTimer = mob.hitCooldown;
          }
        } else {
          // Passive mob wandering
          mob.moveTimer -= dt;
          if (mob.moveTimer <= 0) {
            mob.direction = Math.random() > 0.5 ? 1 : -1;
            mob.moveTimer = 2 + Math.random() * 3;
          }
        }
        if (mob.hurtTimer > 0) {
          mob.hurtTimer = Math.max(0, mob.hurtTimer - dt);
        }

        const mobWasGrounded = !!mob.grounded;
        if (!mobWasGrounded && mob.vy < 0) {
          mob.maxFallSpeed = Math.max(mob.maxFallSpeed || 0, -mob.vy);
        }

        const targetVx = mob.direction * mob.speed;
        mob.vx += (targetVx - mob.vx) * Math.min(5 * dt, 1);
        if (Math.abs(mob.vx) > 0.04) mob.facing = mob.vx > 0 ? 1 : -1;
        mob.walkCycle += dt * (6 + mob.speed * 2);
        mob.idleCycle += dt * 2.4;
        if (isMobGrounded(mob) && shouldMobStepJump(mob)) {
          mob.vy = Math.max(mob.vy, 7.0); // ~1 block max jump height
        }
        mob.vy += -25 * dt;

        mob.x += mob.vx * dt;
        mob.y += mob.vy * dt;

        const eps = 1e-3;
        let left = mob.x - mob.w/2, right = mob.x + mob.w/2, bottom = mob.y - mob.h/2, top = mob.y + mob.h/2;
        const minX = Math.floor(left), maxX = Math.floor(right - eps);
        const minY = Math.floor(bottom), maxY = Math.floor(top - eps);
        let hitWallX = false;
        let steppedUp = false;
        let landedThisFrame = false;

        for (let gx = minX; gx <= maxX; gx++){
          for (let gy = minY; gy <= maxY; gy++){
            if (!isSolid(gx,gy)) continue;
            const tileLeft = gx, tileRight = gx+1, tileBottom = gy, tileTop = gy+1;
            const overlapX = Math.min(right, tileRight) - Math.max(left, tileLeft);
            const overlapY = Math.min(top, tileTop) - Math.max(bottom, tileBottom);
            if (overlapX > 0 && overlapY > 0){
              if (overlapX < overlapY){
                const dir = (mob.vx >= 0 ? 1 : -1);
                if (!steppedUp && isMobGrounded(mob) && shouldMobStepJump(mob)) {
                  const stepX = mob.x + dir * 0.16;
                  const stepY = mob.y + 1.0;
                  if (canMobOccupyAt(mob, stepX, stepY)) {
                    mob.x = stepX;
                    mob.y = stepY;
                    mob.vy = Math.max(mob.vy, 7.0);
                    steppedUp = true;
                    left = mob.x - mob.w/2; right = mob.x + mob.w/2; bottom = mob.y - mob.h/2; top = mob.y + mob.h/2;
                    continue;
                  }
                }
                if (mob.x < gx+0.5) mob.x -= overlapX + eps; else mob.x += overlapX + eps;
                mob.vx = 0;
                hitWallX = true;
              } else {
                if (mob.y < gy+0.5){
                  mob.y -= overlapY + eps;
                  mob.vy = 0;
                } else {
                  mob.y += overlapY + eps;
                  mob.vy = 0;
                  landedThisFrame = true;
                }
              }
              left = mob.x - mob.w/2; right = mob.x + mob.w/2; bottom = mob.y - mob.h/2; top = mob.y + mob.h/2;
            }
          }
        }

        // Strong fallback: if grounded and blocked horizontally, hop over one-block obstacles.
        if (hitWallX && isMobGrounded(mob)) {
          const dir = (mob.facing || mob.direction || 1) >= 0 ? 1 : -1;
          const probeX = Math.floor(mob.x + dir * (mob.w / 2 + 0.1));
          const footY = Math.floor(mob.y - mob.h / 2 + 0.08);
          if (isSolid(probeX, footY) && !isSolid(probeX, footY + 1)) {
            mob.y += 1.0; // Direct 1-block step-up fallback when blocked.
            mob.vy = Math.max(mob.vy, 7.0);
            mob.vx = dir * Math.max(mob.speed * 0.6, 1.0);
          }
        }

        mob.x = Math.max(0.2, Math.min(WIDTH-0.2, mob.x));
        mob.y = Math.min(HEIGHT-0.2, mob.y);
        const mobGrounded = isMobGrounded(mob);
        mob.grounded = mobGrounded;
        if (!mobGrounded && mob.vy < 0) {
          mob.maxFallSpeed = Math.max(mob.maxFallSpeed || 0, -mob.vy);
        }
        if ((mobGrounded && !mobWasGrounded) || landedThisFrame) {
          const impactSpeed = mob.maxFallSpeed || 0;
          if (impactSpeed > 9 && mob.health != null) {
            mob.hurtTimer = 0.25;
            const fallDamage = Math.max(1, Math.floor((impactSpeed - 9) / 1.6));
            mob.health = Math.max(0, mob.health - fallDamage);
          }
          mob.maxFallSpeed = 0;
        } else if (mobGrounded) {
          mob.maxFallSpeed = 0;
        }
        if (mob.y < -1) {
          if (mob.hostile) mob.health = 0;
          else mob.dead = true;
        }
      });

      mobs = mobs.filter(m => !m.dead && (m.health == null || m.health > 0));

      if (deathSequence.active && deathSequence.timer <= 0) {
        respawnPlayer();
      }

      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
