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
    const STORAGE_SIZE = 30;
    const CRAFT_GRID_SIZE = 9;
    const MAX_STACK = 64;
    const hotbarInventory = Array.from({length: HOTBAR_SIZE}, () => null);
    const storageInventory = Array.from({length: STORAGE_SIZE}, () => null);
    const craftingInventory = Array.from({length: CRAFT_GRID_SIZE}, () => null);
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
    const inventoryOverlayEl = document.getElementById('inventoryOverlay');
    const inventoryStorageEl = document.getElementById('inventoryStorage');
    const inventoryHotbarEl = document.getElementById('inventoryHotbar');
    const craftingGridEl = document.getElementById('craftingGrid');
    const craftingResultEl = document.getElementById('craftingResult');
    const draggedInventoryItemEl = document.getElementById('draggedInventoryItem');
    let inventoryOpen = false;
    let draggedInventoryItem = null;
    let draggedInventorySource = null;
    let inventoryRightDragActive = false;
    let inventoryRightDragVisited = new Set();
    const CRAFTING_RECIPES = [
      { pattern: [['log']], output: { id: 'planks', count: 4 } },
      { pattern: [['planks', 'planks'], ['planks', 'planks'], ['planks', 'planks']], output: { id: 'door', count: 1 } },
      { pattern: [['planks'], ['planks'], ['planks']], output: { id: 'ladder', count: 3 } }
    ];

    function getAllInventoryContainers() {
      return [hotbarInventory, storageInventory];
    }

    function findInventorySlotRef(kind, index) {
      const slots = kind === 'storage'
        ? storageInventory
        : kind === 'crafting'
          ? craftingInventory
          : hotbarInventory;
      return { slots, kind, index };
    }

    function getInventorySlotValue(kind, index) {
      const ref = findInventorySlotRef(kind, index);
      return ref.slots[index];
    }

    function setInventorySlotValue(kind, index, value) {
      const ref = findInventorySlotRef(kind, index);
      ref.slots[index] = value;
    }

    function clearDraggedInventoryItem() {
      draggedInventoryItem = null;
      draggedInventorySource = null;
      inventoryRightDragActive = false;
      inventoryRightDragVisited.clear();
      draggedInventoryItemEl.innerHTML = '';
      draggedInventoryItemEl.style.transform = 'translate(-9999px, -9999px)';
    }

    function updateDraggedInventoryItemPosition(clientX, clientY) {
      if (!draggedInventoryItem) return;
      draggedInventoryItemEl.style.transform = `translate(${clientX - 26}px, ${clientY - 26}px)`;
    }

    function getInventorySlotKey(kind, index) {
      return `${kind}:${index}`;
    }

    function distributeOneDraggedItemToSlot(kind, index) {
      if (!draggedInventoryItem || draggedInventoryItem.count <= 0) return false;
      const slotItem = getInventorySlotValue(kind, index);
      if (!slotItem) {
        setInventorySlotValue(kind, index, { id: draggedInventoryItem.id, count: 1 });
      } else {
        if (slotItem.id !== draggedInventoryItem.id || slotItem.count >= MAX_STACK) return false;
        slotItem.count += 1;
      }
      draggedInventoryItem.count -= 1;
      if (draggedInventoryItem.count <= 0) clearDraggedInventoryItem();
      return true;
    }

    function collectMatchingInventoryItems(itemId) {
      if (!itemId) return;
      if (!draggedInventoryItem) {
        draggedInventoryItem = { id: itemId, count: 0 };
        draggedInventorySource = null;
      }
      for (const slots of getAllInventoryContainers()) {
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          if (!slot || slot.id !== itemId) continue;
          draggedInventoryItem.count += slot.count;
          slots[i] = null;
        }
      }
    }

    function getTrimmedCraftPattern() {
      let minRow = 3, maxRow = -1, minCol = 3, maxCol = -1;
      for (let i = 0; i < CRAFT_GRID_SIZE; i++) {
        if (!craftingInventory[i]) continue;
        const row = Math.floor(i / 3);
        const col = i % 3;
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
      if (maxRow === -1) return [];
      const rows = [];
      for (let row = minRow; row <= maxRow; row++) {
        const cols = [];
        for (let col = minCol; col <= maxCol; col++) {
          cols.push(craftingInventory[row * 3 + col]?.id || null);
        }
        rows.push(cols);
      }
      return rows;
    }

    function patternsMatch(current, expected) {
      if (current.length !== expected.length) return false;
      for (let row = 0; row < current.length; row++) {
        if (current[row].length !== expected[row].length) return false;
        for (let col = 0; col < current[row].length; col++) {
          if ((current[row][col] || null) !== (expected[row][col] || null)) return false;
        }
      }
      return true;
    }

    function getCraftingResult() {
      const current = getTrimmedCraftPattern();
      if (!current.length) return null;
      for (const recipe of CRAFTING_RECIPES) {
        if (patternsMatch(current, recipe.pattern)) {
          return { id: recipe.output.id, count: recipe.output.count };
        }
      }
      return null;
    }

    function consumeCraftingInputs() {
      for (let i = 0; i < CRAFT_GRID_SIZE; i++) {
        const slot = craftingInventory[i];
        if (!slot) continue;
        slot.count -= 1;
        if (slot.count <= 0) craftingInventory[i] = null;
      }
    }
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
      for (const slots of getAllInventoryContainers()) {
        for (const slot of slots) {
          if (slot && slot.id === id) count += slot.count;
        }
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
      for (const slots of getAllInventoryContainers()) {
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] && idSet.has(slots[i].id)) {
            slots[i] = null;
            removed = true;
          }
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
      for (const slots of getAllInventoryContainers()) {
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          const slot = slots[i];
          if (slot && slot.id === id && slot.count < MAX_STACK) {
            const add = Math.min(MAX_STACK - slot.count, remaining);
            slot.count += add;
            remaining -= add;
          }
        }
      }
      for (const slots of getAllInventoryContainers()) {
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          if (!slots[i]) {
            const add = Math.min(MAX_STACK, remaining);
            slots[i] = { id, count: add };
            remaining -= add;
          }
        }
      }
      if (remaining !== amount) {
        if (!skipUnlock) {
          if (id === 'log') registerMaterialAcquired('wood', amount - remaining);
          else if (id === 'stone') registerMaterialAcquired('stone', amount - remaining);
          else if (id === 'diamond') registerMaterialAcquired('diamond', amount - remaining);
        }
        renderInventoryUI();
      }
      return remaining === 0;
    }
    function consumeSelectedItem(amount = 1){
      const slot = hotbarInventory[selected];
      if (!slot || slot.count < amount) return false;
      slot.count -= amount;
      if (slot.count <= 0) hotbarInventory[selected] = null;
      renderInventoryUI();
      return true;
    }

    function consumeInventoryItemById(id, amount = 1) {
      let remaining = amount;
      for (const slots of getAllInventoryContainers()) {
        for (let i = 0; i < slots.length && remaining > 0; i++) {
          const slot = slots[i];
          if (!slot || slot.id !== id) continue;
          const used = Math.min(slot.count, remaining);
          slot.count -= used;
          remaining -= used;
          if (slot.count <= 0) slots[i] = null;
        }
      }
      if (remaining !== amount) renderInventoryUI();
      return remaining === 0;
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

    function createInventorySlotElement(item, options = {}) {
      const { label = '', selectedSlot = false, interactive = false, kind = 'hotbar', index = 0, craftResult = false } = options;
        const slot = document.createElement('div');
      slot.className = 'slot'
        + (selectedSlot ? ' selected' : '')
        + (interactive ? ' interactive' : '')
        + (draggedInventorySource && draggedInventorySource.kind === kind && draggedInventorySource.index === index ? ' dragging-source' : '');
      if (label) {
        const num = document.createElement('div');
        num.className='num';
        num.textContent = label;
        slot.appendChild(num);
      }
        if (item) {
          const swatch = createHotbarIconElement(item.id);
          const name = document.createElement('div'); name.className='block-name'; name.textContent = getItemLabel(item.id);
          const count = document.createElement('div'); count.className='count'; count.textContent = String(item.count);
          slot.appendChild(swatch); slot.appendChild(name); slot.appendChild(count);
        }
      if (interactive) {
        slot.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (craftResult) {
            if (e.button !== 0) return;
            const resultItem = getCraftingResult();
            if (!resultItem) return;
            if (draggedInventoryItem && draggedInventoryItem.id !== resultItem.id) return;
            if (draggedInventoryItem && draggedInventoryItem.count + resultItem.count > MAX_STACK) return;
            consumeCraftingInputs();
            if (!draggedInventoryItem) {
              draggedInventoryItem = { id: resultItem.id, count: resultItem.count };
              draggedInventorySource = null;
            } else {
              draggedInventoryItem.count += resultItem.count;
            }
            renderInventoryUI();
            updateDraggedInventoryItemPosition(e.clientX, e.clientY);
            return;
          }
          if (e.button === 2) {
            const slotItem = getInventorySlotValue(kind, index);
            if (!draggedInventoryItem) {
              if (!slotItem) return;
              draggedInventoryItem = slotItem;
              draggedInventorySource = { kind, index };
              setInventorySlotValue(kind, index, null);
            }
            inventoryRightDragActive = true;
            inventoryRightDragVisited = new Set([getInventorySlotKey(kind, index)]);
            if (!(draggedInventorySource && draggedInventorySource.kind === kind && draggedInventorySource.index === index)) {
              distributeOneDraggedItemToSlot(kind, index);
            }
            renderInventoryUI();
            updateDraggedInventoryItemPosition(e.clientX, e.clientY);
            return;
          }
          if (e.button !== 0) return;
          const slotItem = getInventorySlotValue(kind, index);
          if (e.detail >= 2 && slotItem) {
            collectMatchingInventoryItems(slotItem.id);
            renderInventoryUI();
            updateDraggedInventoryItemPosition(e.clientX, e.clientY);
            return;
          }
          if (!draggedInventoryItem && !slotItem) return;
          if (!draggedInventoryItem) {
            draggedInventoryItem = slotItem;
            draggedInventorySource = { kind, index };
            setInventorySlotValue(kind, index, null);
          } else if (!slotItem) {
            setInventorySlotValue(kind, index, draggedInventoryItem);
            clearDraggedInventoryItem();
          } else if (slotItem.id === draggedInventoryItem.id && slotItem.count < MAX_STACK) {
            const moved = Math.min(MAX_STACK - slotItem.count, draggedInventoryItem.count);
            slotItem.count += moved;
            draggedInventoryItem.count -= moved;
            if (draggedInventoryItem.count <= 0) clearDraggedInventoryItem();
          } else {
            setInventorySlotValue(kind, index, draggedInventoryItem);
            draggedInventoryItem = slotItem;
            draggedInventorySource = { kind, index };
          }
          renderInventoryUI();
          updateDraggedInventoryItemPosition(e.clientX, e.clientY);
        });
        slot.addEventListener('mouseenter', (e) => {
          if (!inventoryRightDragActive) return;
          const slotKey = getInventorySlotKey(kind, index);
          if (inventoryRightDragVisited.has(slotKey)) return;
          inventoryRightDragVisited.add(slotKey);
          if (distributeOneDraggedItemToSlot(kind, index)) {
            renderInventoryUI();
            updateDraggedInventoryItemPosition(e.clientX, e.clientY);
          }
        });
      }
      return slot;
    }

    function renderHotbar(){
      hotbarEl.innerHTML = '';
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        hotbarEl.appendChild(createInventorySlotElement(hotbarInventory[i], {
          label: i === 9 ? '0' : String(i + 1),
          selectedSlot: i === selected,
          kind: 'hotbar',
          index: i
        }));
      }
    }

    function renderInventoryPanel() {
      inventoryStorageEl.innerHTML = '';
      inventoryHotbarEl.innerHTML = '';
      craftingGridEl.innerHTML = '';
      craftingResultEl.innerHTML = '';
      for (let i = 0; i < CRAFT_GRID_SIZE; i++) {
        craftingGridEl.appendChild(createInventorySlotElement(craftingInventory[i], {
          interactive: true,
          kind: 'crafting',
          index: i
        }));
      }
      craftingResultEl.appendChild(createInventorySlotElement(getCraftingResult(), {
        interactive: true,
        craftResult: true
      }));
      for (let i = 0; i < STORAGE_SIZE; i++) {
        inventoryStorageEl.appendChild(createInventorySlotElement(storageInventory[i], {
          interactive: true,
          kind: 'storage',
          index: i
        }));
      }
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        inventoryHotbarEl.appendChild(createInventorySlotElement(hotbarInventory[i], {
          label: i === 9 ? '0' : String(i + 1),
          selectedSlot: i === selected,
          interactive: true,
          kind: 'hotbar',
          index: i
        }));
      }
      if (draggedInventoryItem) {
        draggedInventoryItemEl.innerHTML = '';
        draggedInventoryItemEl.appendChild(createInventorySlotElement(draggedInventoryItem));
      } else {
        draggedInventoryItemEl.innerHTML = '';
      }
    }

    function renderInventoryUI() {
      renderHotbar();
      renderInventoryPanel();
    }

    function toggleInventory(open = !inventoryOpen) {
      inventoryOpen = open;
      inventoryOverlayEl.classList.toggle('hidden', !inventoryOpen);
      if (!inventoryOpen && draggedInventoryItem) {
        if (draggedInventorySource) {
          const existing = getInventorySlotValue(draggedInventorySource.kind, draggedInventorySource.index);
          if (!existing) setInventorySlotValue(draggedInventorySource.kind, draggedInventorySource.index, draggedInventoryItem);
        } else {
          addItemToInventory(draggedInventoryItem.id, draggedInventoryItem.count, true);
        }
        clearDraggedInventoryItem();
      }
      renderInventoryUI();
    }

    inventoryOverlayEl.addEventListener('mousedown', (e) => {
      if (e.target === inventoryOverlayEl && draggedInventoryItem) {
        if (draggedInventorySource) {
          const existing = getInventorySlotValue(draggedInventorySource.kind, draggedInventorySource.index);
          if (!existing) setInventorySlotValue(draggedInventorySource.kind, draggedInventorySource.index, draggedInventoryItem);
        } else {
          addItemToInventory(draggedInventoryItem.id, draggedInventoryItem.count, true);
        }
        clearDraggedInventoryItem();
        renderInventoryUI();
      }
    });
    inventoryOverlayEl.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => updateDraggedInventoryItemPosition(e.clientX, e.clientY));
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        inventoryRightDragActive = false;
        inventoryRightDragVisited.clear();
      }
    });

    renderInventoryUI();
    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Escape' && inventoryOpen) {
        e.preventDefault();
        toggleInventory(false);
        return;
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        toggleInventory();
        return;
      }
      if (inventoryOpen) return;
      const n = parseInt(e.key,10);
      if (!Number.isNaN(n) && ((n>=1 && n<=9) || n===0)){ selected = n === 0 ? 9 : n-1; renderInventoryUI(); }
      if (e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') e.preventDefault();
    });
