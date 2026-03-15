    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');

    const BLOCKS = [
      { id: 'grass', color: '#4caf50' },
      { id: 'dirt',  color: '#CD853F' },
      { id: 'stone', color: '#9e9e9e' },
      { id: 'log',  color: '#8B4513' },
      { id: 'water', color: '#2196f3' },
      { id: 'planks', color: '#d2b48c' },
      { id: 'bricks', color: '#b71c1c' },
      { id: 'ladder', color: '#a0522d' },
      { id: 'door', color: '#654321' },
      { id: 'glass', color: '#e0f7fa' },
      { id: 'coal_ore', color: '#5a5a5a' },
      { id: 'iron_ore', color: '#e0a86b' },
      { id: 'gold_ore', color: '#d4af37' },
      { id: 'diamond_ore', color: '#42d4f4' },
      { id: 'coal', color: '#2f2f2f' },
      { id: 'diamond', color: '#7ee7ff' },
      { id: 'diamond_shovel', color: '#7ee7ff' },
      { id: 'diamond_sword', color: '#9ef3ff' },
      { id: 'diamond_axe', color: '#7ee7ff' },
      { id: 'diamond_pickaxe', color: '#7ee7ff' },
      { id: 'diamond_boots', color: '#77dce8' },
      { id: 'diamond_leggings', color: '#77dce8' },
      { id: 'diamond_chestplate', color: '#77dce8' },
      { id: 'diamond_helmet', color: '#77dce8' },
    ];
    let selected = 0;
    const HOTBAR_SIZE = 10;
    const MAX_STACK = 64;
    const hotbarInventory = Array.from({length: HOTBAR_SIZE}, () => null);
    const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map(b => [b.id, b]));
    const MATERIAL_TIERS = ['diamond'];
    const NON_PLACEABLE_ITEMS = new Set([
      'coal', 'diamond',
      'diamond_shovel',
      'diamond_sword',
      'diamond_axe',
      'diamond_pickaxe',
      'diamond_boots', 'diamond_leggings', 'diamond_chestplate', 'diamond_helmet'
    ]);
    const toolUnlockState = Object.fromEntries(MATERIAL_TIERS.map(t => [t, { shovel: false, sword: false, tier3: false, armor: false }]));

    const hotbarEl = document.getElementById('hotbar');
    function getItemLabel(id){
      const def = BLOCK_BY_ID[id];
      if (!def) return id;
      return def.id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    function getDropItemId(blockId){
      if (blockId === 'coal_ore') return 'coal';
      if (blockId === 'diamond_ore') return 'diamond';
      return blockId;
    }
    function getInventoryCount(id) {
      let count = 0;
      for (const slot of hotbarInventory) {
        if (slot && slot.id === id) count += slot.count;
      }
      return count;
    }

    function hasInventoryItem(id) {
      return getInventoryCount(id) > 0;
    }

    function resetToolUnlockState() {
      for (const tier of MATERIAL_TIERS) {
        toolUnlockState[tier] = { shovel: false, sword: false, tier3: false, armor: false };
      }
    }

    function checkMaterialUnlocks() {
      for (const tier of MATERIAL_TIERS) {
        const amount = getInventoryCount(tier);
        const state = toolUnlockState[tier];
        if (!state.shovel && amount >= 1) {
          addItemToInventory(`${tier}_shovel`, 1, true);
          state.shovel = true;
        }
        if (!state.sword && amount >= 2) {
          addItemToInventory(`${tier}_sword`, 1, true);
          state.sword = true;
        }
        if (!state.tier3 && amount >= 3) {
          addItemToInventory(`${tier}_axe`, 1, true);
          addItemToInventory(`${tier}_pickaxe`, 1, true);
          state.tier3 = true;
        }
        if (!state.armor && amount >= 4) {
          addItemToInventory(`${tier}_boots`, 1, true);
          addItemToInventory(`${tier}_leggings`, 1, true);
          addItemToInventory(`${tier}_chestplate`, 1, true);
          addItemToInventory(`${tier}_helmet`, 1, true);
          state.armor = true;
        }
      }
    }

    function addItemToInventory(id, amount = 1, skipUnlock = false){
      if (!BLOCK_BY_ID[id]) return false;
      let remaining = amount;
      for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
        const slot = hotbarInventory[i];
        if (slot && slot.id === id && slot.count < MAX_STACK) {
          const add = Math.min(MAX_STACK - slot.count, remaining);
          slot.count += add;
          remaining -= add;
        }
      }
      for (let i = 0; i < HOTBAR_SIZE && remaining > 0; i++) {
        if (!hotbarInventory[i]) {
          const add = Math.min(MAX_STACK, remaining);
          hotbarInventory[i] = { id, count: add };
          remaining -= add;
        }
      }
      if (remaining !== amount) {
        if (!skipUnlock) checkMaterialUnlocks();
        renderHotbar();
      }
      return remaining === 0;
    }
    function consumeSelectedItem(amount = 1){
      const slot = hotbarInventory[selected];
      if (!slot || slot.count < amount) return false;
      slot.count -= amount;
      if (slot.count <= 0) hotbarInventory[selected] = null;
      renderHotbar();
      return true;
    }

    function isPlaceableItem(id) {
      return !NON_PLACEABLE_ITEMS.has(id);
    }
    function renderHotbar(){
      hotbarEl.innerHTML = '';
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const item = hotbarInventory[i];
        const slot = document.createElement('div');
        slot.className = 'slot' + (i===selected? ' selected':'');
        const num = document.createElement('div'); num.className='num'; num.textContent = i === 9 ? '0' : (i+1);
        slot.appendChild(num);
        if (item) {
          const swatch = document.createElement('div'); swatch.className='swatch';
          swatch.style.background = BLOCK_BY_ID[item.id].color;
          const name = document.createElement('div'); name.className='block-name'; name.textContent = getItemLabel(item.id);
          const count = document.createElement('div'); count.className='count'; count.textContent = String(item.count);
          slot.appendChild(swatch); slot.appendChild(name); slot.appendChild(count);
        }
        hotbarEl.appendChild(slot);
      }
    }
    renderHotbar();
    window.addEventListener('keydown', (e)=>{ const n = parseInt(e.key,10); if (!Number.isNaN(n) && ((n>=1 && n<=9) || n===0)){ selected = n === 0 ? 9 : n-1; renderHotbar(); } if (e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') e.preventDefault(); });
