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
      { id: 'meat', color: '#c65a4f' },
      { id: 'diamond', color: '#7ee7ff' },
      { id: 'wood_shovel', color: '#b07a4a' },
      { id: 'wood_sword', color: '#b07a4a' },
      { id: 'wood_axe', color: '#b07a4a' },
      { id: 'wood_pickaxe', color: '#b07a4a' },
      { id: 'stone_shovel', color: '#9e9e9e' },
      { id: 'stone_sword', color: '#9e9e9e' },
      { id: 'stone_axe', color: '#9e9e9e' },
      { id: 'stone_pickaxe', color: '#9e9e9e' },
      { id: 'iron_shovel', color: '#c8c8cf' },
      { id: 'iron_sword', color: '#c8c8cf' },
      { id: 'iron_axe', color: '#c8c8cf' },
      { id: 'iron_pickaxe', color: '#c8c8cf' },
      { id: 'gold_shovel', color: '#f0c64c' },
      { id: 'gold_sword', color: '#f0c64c' },
      { id: 'gold_axe', color: '#f0c64c' },
      { id: 'gold_pickaxe', color: '#f0c64c' },
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
    const MATERIAL_TIERS = [
      {
        key: 'wood',
        sourceItemId: 'log',
        unlocks: {
          shovel: 'wood_shovel',
          sword: 'wood_sword',
          axe: 'wood_axe',
          pickaxe: 'wood_pickaxe'
        }
      },
      {
        key: 'stone',
        sourceItemId: 'stone',
        unlocks: {
          shovel: 'stone_shovel',
          sword: 'stone_sword',
          axe: 'stone_axe',
          pickaxe: 'stone_pickaxe'
        }
      },
      {
        key: 'iron',
        sourceItemId: 'iron_ore',
        unlocks: {
          shovel: 'iron_shovel',
          sword: 'iron_sword',
          axe: 'iron_axe',
          pickaxe: 'iron_pickaxe'
        }
      },
      {
        key: 'gold',
        sourceItemId: 'gold_ore',
        unlocks: {
          shovel: 'gold_shovel',
          sword: 'gold_sword',
          axe: 'gold_axe',
          pickaxe: 'gold_pickaxe'
        }
      },
      {
        key: 'diamond',
        sourceItemId: 'diamond',
        unlocks: {
          shovel: 'diamond_shovel',
          sword: 'diamond_sword',
          axe: 'diamond_axe',
          pickaxe: 'diamond_pickaxe',
          boots: 'diamond_boots',
          leggings: 'diamond_leggings',
          chestplate: 'diamond_chestplate',
          helmet: 'diamond_helmet'
        }
      }
    ];
    const NON_PLACEABLE_ITEMS = new Set([
      'coal', 'diamond', 'meat',
      'wood_shovel',
      'wood_sword',
      'wood_axe',
      'wood_pickaxe',
      'stone_shovel',
      'stone_sword',
      'stone_axe',
      'stone_pickaxe',
      'iron_shovel',
      'iron_sword',
      'iron_axe',
      'iron_pickaxe',
      'gold_shovel',
      'gold_sword',
      'gold_axe',
      'gold_pickaxe',
      'diamond_shovel',
      'diamond_sword',
      'diamond_axe',
      'diamond_pickaxe',
      'diamond_boots', 'diamond_leggings', 'diamond_chestplate', 'diamond_helmet'
    ]);
    const toolUnlockState = Object.fromEntries(MATERIAL_TIERS.map(t => [t.key, { count: 0, shovel: false, sword: false, tier3: false, armor: false }]));
    const MATERIAL_ORDER = ['wood', 'gold', 'stone', 'iron', 'diamond'];

    const hotbarEl = document.getElementById('hotbar');
    function getItemLabel(id){
      const def = BLOCK_BY_ID[id];
      if (!def) return id;
      return def.id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    function getDropItemId(blockId){
      if (blockId === 'coal_ore') return 'coal';
      if (blockId === 'iron_ore') return 'iron_ore';
      if (blockId === 'gold_ore') return 'gold_ore';
      if (blockId === 'diamond_ore') return null;
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
        toolUnlockState[tier.key] = { count: 0, shovel: false, sword: false, tier3: false, armor: false };
      }
    }

    function getLowerTierKeys(materialKey) {
      const idx = MATERIAL_ORDER.indexOf(materialKey);
      if (idx <= 0) return [];
      return MATERIAL_ORDER.slice(0, idx);
    }

    function removeItemsFromInventory(itemIds) {
      let removed = false;
      const idSet = new Set(itemIds);
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        if (hotbarInventory[i] && idSet.has(hotbarInventory[i].id)) {
          hotbarInventory[i] = null;
          removed = true;
        }
      }
      return removed;
    }

    function replaceLowerTierCategory(materialKey, category) {
      const lowerKeys = getLowerTierKeys(materialKey);
      if (!lowerKeys.length) return false;
      const itemIds = [];
      for (const key of lowerKeys) {
        const tier = MATERIAL_TIERS.find(t => t.key === key);
        if (!tier) continue;
        if (category === 'tier3') {
          if (tier.unlocks.axe) itemIds.push(tier.unlocks.axe);
          if (tier.unlocks.pickaxe) itemIds.push(tier.unlocks.pickaxe);
        } else if (tier.unlocks[category]) {
          itemIds.push(tier.unlocks[category]);
        }
      }
      return removeItemsFromInventory(itemIds);
    }

    function replaceLowerTierArmor(materialKey) {
      let changed = false;
      for (const key of getLowerTierKeys(materialKey)) {
        if (toolUnlockState[key]?.armor) {
          toolUnlockState[key].armor = false;
          changed = true;
        }
      }
      return changed;
    }

    function applyMaterialUnlocks(materialKey) {
      const tier = MATERIAL_TIERS.find(t => t.key === materialKey);
      if (!tier) return false;
      const state = toolUnlockState[tier.key];
      let changed = false;
      if (!state.shovel && state.count >= 1 && tier.unlocks.shovel) {
        replaceLowerTierCategory(materialKey, 'shovel');
        if (addItemToInventory(tier.unlocks.shovel, 1, true)) {
          state.shovel = true;
          changed = true;
        }
      }
      if (!state.sword && state.count >= 2 && tier.unlocks.sword) {
        replaceLowerTierCategory(materialKey, 'sword');
        if (addItemToInventory(tier.unlocks.sword, 1, true)) {
          state.sword = true;
          changed = true;
        }
      }
      if (!state.tier3 && state.count >= 3 && tier.unlocks.axe && tier.unlocks.pickaxe) {
        replaceLowerTierCategory(materialKey, 'tier3');
        const addedAxe = addItemToInventory(tier.unlocks.axe, 1, true);
        const addedPickaxe = addItemToInventory(tier.unlocks.pickaxe, 1, true);
        if (addedAxe && addedPickaxe) {
          state.tier3 = true;
          changed = true;
        }
      }
      if (!state.armor && state.count >= 4 && materialKey !== 'wood' && materialKey !== 'stone') {
        replaceLowerTierArmor(materialKey);
        state.armor = true;
        changed = true;
      }
      return changed;
    }

    function registerMaterialAcquired(materialKey, amount = 1) {
      const tier = MATERIAL_TIERS.find(t => t.key === materialKey);
      if (!tier) return false;
      const state = toolUnlockState[tier.key];
      state.count += amount;
      return applyMaterialUnlocks(materialKey);
    }

    function getBestUnlockedArmorMaterial() {
      const order = ['diamond', 'iron', 'gold', 'wood'];
      for (const key of order) {
        if (toolUnlockState[key]?.armor) return key;
      }
      return null;
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
        if (!skipUnlock) {
          if (id === 'log') registerMaterialAcquired('wood', amount - remaining);
          else if (id === 'stone') registerMaterialAcquired('stone', amount - remaining);
          else if (id === 'iron_ore') registerMaterialAcquired('iron', amount - remaining);
          else if (id === 'gold_ore') registerMaterialAcquired('gold', amount - remaining);
          else if (id === 'diamond') registerMaterialAcquired('diamond', amount - remaining);
        }
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

    function createToolIconElement(toolId) {
      const toolColorMap = {
        wood: '#b07a4a',
        stone: '#7f7f7f',
        iron: '#c8c8cf',
        gold: '#f0c64c',
        diamond: '#74d9e6'
      };
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
      const icon = document.createElement('div');
      icon.className = 'swatch';
      icon.style.position = 'relative';
      icon.style.overflow = 'hidden';
      icon.style.background = 'rgba(0,0,0,0.08)';

      const cell = 3;
      const handleColor = '#5a3a24';
      const toolColor = toolColorMap[material] || '#74d9e6';
      const shadowColor = shadowColorMap[material] || '#4db8c9';
      const highlightColor = highlightColorMap[material] || '#a6f3ff';

      function addPixel(x, y, w, h, color) {
        const px = document.createElement('div');
        px.style.position = 'absolute';
        px.style.left = `${x}px`;
        px.style.top = `${y}px`;
        px.style.width = `${w}px`;
        px.style.height = `${h}px`;
        px.style.background = color;
        icon.appendChild(px);
      }

      function addTexturedPixel(x, y, w, h) {
        addPixel(x, y, w, h, toolColor);
        addPixel(x, y, Math.max(1, Math.floor(w * 0.25)), h, highlightColor);
        addPixel(x, y, w, Math.max(1, Math.floor(h * 0.18)), highlightColor);
        for (let iy = y + cell; iy < y + h; iy += cell * 2) {
          for (let ix = x + (((iy - y) / cell) % 2 ? cell : 0); ix < x + w; ix += cell * 2) {
            addPixel(ix, iy, cell, cell, shadowColor);
          }
        }
      }

      addPixel(13, 10, 3, 12, handleColor);

      if (toolId.endsWith('_sword')) {
        addTexturedPixel(12, 2, 3, 3);
        addTexturedPixel(11, 5, 6, 3);
        addTexturedPixel(11, 8, 6, 3);
        addTexturedPixel(10, 11, 9, 3);
        addTexturedPixel(10, 14, 9, 3);
        addTexturedPixel(8, 17, 12, 2);
        addTexturedPixel(7, 21, 15, 2);
      } else if (toolId.endsWith('_pickaxe')) {
        addTexturedPixel(4, 6, 6, 3);
        addTexturedPixel(10, 3, 6, 3);
        addTexturedPixel(16, 6, 6, 3);
        addTexturedPixel(10, 9, 3, 4);
        addTexturedPixel(16, 9, 3, 4);
      } else if (toolId.endsWith('_axe')) {
        addTexturedPixel(13, 3, 7, 4);
        addTexturedPixel(8, 6, 10, 5);
        addTexturedPixel(9, 11, 7, 4);
      } else if (toolId.endsWith('_shovel')) {
        addTexturedPixel(10, 3, 7, 3);
        addTexturedPixel(8, 6, 10, 5);
        addTexturedPixel(11, 11, 6, 3);
      }

      return icon;
    }

    function createHotbarIconElement(itemId) {
      if (/_(?:shovel|sword|axe|pickaxe)$/.test(itemId)) {
        return createToolIconElement(itemId);
      }
      const swatch = document.createElement('div');
      swatch.className='swatch';
      swatch.style.background = BLOCK_BY_ID[itemId].color;
      return swatch;
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
          const swatch = createHotbarIconElement(item.id);
          const name = document.createElement('div'); name.className='block-name'; name.textContent = getItemLabel(item.id);
          const count = document.createElement('div'); count.className='count'; count.textContent = String(item.count);
          slot.appendChild(swatch); slot.appendChild(name); slot.appendChild(count);
        }
        hotbarEl.appendChild(slot);
      }
    }
    renderHotbar();
    window.addEventListener('keydown', (e)=>{ const n = parseInt(e.key,10); if (!Number.isNaN(n) && ((n>=1 && n<=9) || n===0)){ selected = n === 0 ? 9 : n-1; renderHotbar(); } if (e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') e.preventDefault(); });
