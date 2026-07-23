(function () {
  const ICON_STORAGE_KEY = "charlie-site-desktop-icon-positions-v4";
  const WINDOW_LAYOUT_STORAGE_KEY = "charlie-site-desktop-window-layouts-v1";
  const root = document.body;
  const windows = Array.from(document.querySelectorAll("[data-desktop-window]"));
  const icons = Array.from(document.querySelectorAll("[data-desktop-icon]"));

  if (!root || windows.length === 0) return;

  let iconDragState = null;
  let selectionState = null;
  let dragState = null;
  let resizeState = null;
  let lastIconClick = null;
  let topZ = 8;

  const selectionBox = document.createElement("div");
  selectionBox.className = "desktop-selection-box";
  selectionBox.setAttribute("aria-hidden", "true");
  root.append(selectionBox);

  function desktopModeEnabled() {
    return root.dataset.styleMode === "windows95desktop";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function windowKey(node) {
    return node.dataset.desktopWindow || "about";
  }

  const windowsByKey = new Map(windows.map((node) => [windowKey(node), node]));

  function bringToFront(node) {
    topZ += 1;
    node.style.zIndex = String(topZ);
  }

  function loadDeferredFrames(node) {
    node.querySelectorAll("iframe[data-src]").forEach((frame) => {
      const src = frame.dataset.src;
      if (!src) return;

      frame.src = src;
      frame.removeAttribute("data-src");
    });
  }

  function openWindow(node) {
    if (!node) return;
    loadDeferredFrames(node);
    node.classList.remove("is-closed", "is-minimized");
    bringToFront(node);
  }

  function closeWindow(node) {
    node.classList.add("is-closed");
    node.classList.remove("is-minimized");
  }

  function minimizeWindow(node) {
    node.classList.add("is-minimized");
    bringToFront(node);
  }

  function loadIconPositions() {
    try {
      return JSON.parse(window.localStorage.getItem(ICON_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveIconPositions() {
    const positions = {};

    icons.forEach((icon) => {
      const key = icon.dataset.desktopIcon;
      if (!key) return;

      const rect = icon.getBoundingClientRect();
      positions[key] = {
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      };
    });

    try {
      window.localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Icon movement is still useful even if localStorage is unavailable.
    }
  }

  function applySavedIconPositions() {
    const positions = loadIconPositions();

    icons.forEach((icon) => {
      const position = positions[icon.dataset.desktopIcon];
      if (!position) return;

      icon.style.left = `${position.left}px`;
      icon.style.top = `${position.top}px`;
    });
  }

  function loadWindowLayouts() {
    try {
      return JSON.parse(window.localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveWindowLayout(node) {
    if (!desktopModeEnabled()) return;

    const key = windowKey(node);
    const rect = node.getBoundingClientRect();
    const layouts = loadWindowLayouts();

    layouts[key] = {
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width)
    };

    try {
      window.localStorage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      // Window movement and resizing still work without persisted state.
    }
  }

  function applySavedWindowLayouts() {
    if (!desktopModeEnabled()) return;

    const layouts = loadWindowLayouts();

    windows.forEach((node) => {
      const layout = layouts[windowKey(node)];
      if (!layout) return;

      const maxWidth = Math.max(260, window.innerWidth - 12);
      const maxHeight = Math.max(170, window.innerHeight - 58);
      const width = clamp(Number(layout.width) || 360, 260, maxWidth);
      const height = clamp(Number(layout.height) || 220, 170, maxHeight);
      const left = clamp(Number(layout.left) || 0, 0, Math.max(0, window.innerWidth - Math.min(width, 180)));
      const top = clamp(Number(layout.top) || 0, 0, Math.max(0, window.innerHeight - 54));

      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      node.classList.add("has-custom-size");
    });
  }

  function constrainCustomWindows() {
    if (!desktopModeEnabled()) return;

    windows.forEach((node) => {
      if (!node.classList.contains("has-custom-size") || node.classList.contains("is-closed")) return;

      const rect = node.getBoundingClientRect();
      const maxWidth = Math.max(260, window.innerWidth - 12);
      const maxHeight = Math.max(170, window.innerHeight - 58);
      const width = clamp(rect.width, 260, maxWidth);
      const height = clamp(rect.height, 170, maxHeight);
      const left = clamp(rect.left, 0, Math.max(0, window.innerWidth - Math.min(width, 180)));
      const top = clamp(rect.top, 0, Math.max(0, window.innerHeight - 54));

      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
    });
  }

  function selectedIcons() {
    return icons.filter((icon) => icon.classList.contains("is-selected"));
  }

  function clearIconSelection() {
    icons.forEach((icon) => icon.classList.remove("is-selected"));
  }

  function selectIcon(icon, options = {}) {
    if (!options.additive) {
      clearIconSelection();
    }
    icon.classList.add("is-selected");
  }

  function toggleIconSelection(icon) {
    icon.classList.toggle("is-selected");
  }

  function modifierAddsSelection(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey;
  }

  function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function openIcon(icon) {
    openWindow(windowsByKey.get(icon.dataset.windowOpen || icon.dataset.desktopIcon));
  }

  function markPointerClickHandled(icon) {
    icon.dataset.pointerClickHandled = "true";
    window.setTimeout(() => {
      delete icon.dataset.pointerClickHandled;
    }, 120);
  }

  function handleIconClick(icon, event) {
    if (event?.metaKey || event?.ctrlKey) {
      toggleIconSelection(icon);
      lastIconClick = null;
      return;
    }

    if (event?.shiftKey) {
      selectIcon(icon, { additive: true });
      lastIconClick = null;
      return;
    }

    selectIcon(icon);

    const now = Date.now();
    const key = icon.dataset.desktopIcon;
    const isDoubleClick = lastIconClick && lastIconClick.key === key && now - lastIconClick.at < 420;

    if (isDoubleClick) {
      lastIconClick = null;
      openIcon(icon);
      return;
    }

    lastIconClick = { at: now, key };
  }

  function startDrag(event, node, handle) {
    if (!desktopModeEnabled() || event.button !== 0 || event.target.closest("button, [data-window-resize-handle]")) return;

    const rect = node.getBoundingClientRect();
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    if (node.classList.contains("has-custom-size")) {
      node.style.height = `${rect.height}px`;
    }

    dragState = {
      handle,
      node,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId
    };

    bringToFront(node);
    node.classList.add("is-dragging");

    if (handle.setPointerCapture) {
      handle.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const rect = dragState.node.getBoundingClientRect();
    const left = clamp(event.clientX - dragState.offsetX, 0, window.innerWidth - Math.min(rect.width, 180));
    const top = clamp(event.clientY - dragState.offsetY, 0, window.innerHeight - 54);

    dragState.node.style.left = `${left}px`;
    dragState.node.style.top = `${top}px`;
  }

  function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    dragState.node.classList.remove("is-dragging");
    saveWindowLayout(dragState.node);
    dragState = null;
  }

  function startResize(event, node, handle) {
    if (!desktopModeEnabled() || event.button !== 0) return;

    const rect = node.getBoundingClientRect();
    resizeState = {
      direction: handle.dataset.windowResizeHandle || "se",
      handle,
      node,
      pointerId: event.pointerId,
      startBottom: rect.top + rect.height,
      startHeight: rect.height,
      startLeft: rect.left,
      startRight: rect.left + rect.width,
      startTop: rect.top,
      startWidth: rect.width,
      startX: event.clientX,
      startY: event.clientY
    };

    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
    node.classList.add("has-custom-size", "is-resizing");
    bringToFront(node);

    if (handle.setPointerCapture) {
      handle.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function moveResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) return;

    const minWidth = 260;
    const minHeight = 170;
    const direction = resizeState.direction;
    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;
    let left = resizeState.startLeft;
    let top = resizeState.startTop;
    let width = resizeState.startWidth;
    let height = resizeState.startHeight;

    if (direction.includes("e")) {
      width = clamp(resizeState.startWidth + dx, minWidth, window.innerWidth - resizeState.startLeft - 6);
    }

    if (direction.includes("s")) {
      height = clamp(resizeState.startHeight + dy, minHeight, window.innerHeight - resizeState.startTop - 54);
    }

    if (direction.includes("w")) {
      width = clamp(resizeState.startWidth - dx, minWidth, resizeState.startRight);
      left = resizeState.startRight - width;
    }

    if (direction.includes("n")) {
      height = clamp(resizeState.startHeight - dy, minHeight, resizeState.startBottom);
      top = resizeState.startBottom - height;
    }

    resizeState.node.style.left = `${left}px`;
    resizeState.node.style.top = `${top}px`;
    resizeState.node.style.width = `${width}px`;
    resizeState.node.style.height = `${height}px`;
  }

  function endResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) return;

    resizeState.node.classList.remove("is-resizing");
    saveWindowLayout(resizeState.node);
    resizeState = null;
  }

  function startIconDrag(event, icon) {
    if (!desktopModeEnabled() || event.button !== 0) return;

    const handledSelectionOnPointerDown = modifierAddsSelection(event);
    if (event.metaKey || event.ctrlKey) {
      toggleIconSelection(icon);
    } else if (event.shiftKey) {
      selectIcon(icon, { additive: true });
    } else if (!icon.classList.contains("is-selected")) {
      selectIcon(icon);
    }

    const dragIcons = selectedIcons();
    const selectedForDrag = dragIcons.length > 0 ? dragIcons : [icon];
    const iconRects = selectedForDrag.map((node) => {
      const rect = node.getBoundingClientRect();

      node.style.left = `${rect.left}px`;
      node.style.top = `${rect.top}px`;

      return {
        height: rect.height,
        left: rect.left,
        node,
        top: rect.top,
        width: rect.width
      };
    });

    iconDragState = {
      icon,
      icons: iconRects,
      handledSelectionOnPointerDown,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };

    if (icon.setPointerCapture) {
      icon.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
  }

  function moveIconDrag(event) {
    if (!iconDragState || event.pointerId !== iconDragState.pointerId) return;

    const distance = Math.abs(event.clientX - iconDragState.startX) + Math.abs(event.clientY - iconDragState.startY);
    if (distance > 3) {
      iconDragState.moved = true;
      iconDragState.icons.forEach((item) => item.node.classList.add("is-moving"));
    }

    if (!iconDragState.moved) return;

    const rawDx = event.clientX - iconDragState.startX;
    const rawDy = event.clientY - iconDragState.startY;
    const minDx = Math.max(...iconDragState.icons.map((item) => -item.left));
    const maxDx = Math.min(...iconDragState.icons.map((item) => window.innerWidth - item.width - item.left));
    const minDy = Math.max(...iconDragState.icons.map((item) => -item.top));
    const maxDy = Math.min(...iconDragState.icons.map((item) => window.innerHeight - 54 - item.height - item.top));
    const dx = clamp(rawDx, minDx, maxDx);
    const dy = clamp(rawDy, minDy, maxDy);

    iconDragState.icons.forEach((item) => {
      item.node.style.left = `${item.left + dx}px`;
      item.node.style.top = `${item.top + dy}px`;
    });
  }

  function endIconDrag(event) {
    if (!iconDragState || event.pointerId !== iconDragState.pointerId) return;

    const moved = iconDragState.moved;
    const icon = iconDragState.icon;
    const handledSelectionOnPointerDown = iconDragState.handledSelectionOnPointerDown;
    iconDragState.icons.forEach((item) => item.node.classList.remove("is-moving"));
    iconDragState = null;

    markPointerClickHandled(icon);

    if (moved) {
      lastIconClick = null;
      saveIconPositions();
      return;
    }

    if (!handledSelectionOnPointerDown) {
      handleIconClick(icon, event);
    }
  }

  function selectionBounds() {
    const left = Math.min(selectionState.startX, selectionState.currentX);
    const top = Math.min(selectionState.startY, selectionState.currentY);
    const right = Math.max(selectionState.startX, selectionState.currentX);
    const bottom = Math.max(selectionState.startY, selectionState.currentY);

    return { bottom, left, right, top };
  }

  function paintSelectionBox() {
    const box = selectionBounds();

    selectionBox.style.display = "block";
    selectionBox.style.left = `${box.left}px`;
    selectionBox.style.top = `${box.top}px`;
    selectionBox.style.width = `${box.right - box.left}px`;
    selectionBox.style.height = `${box.bottom - box.top}px`;
  }

  function updateDesktopSelection(event) {
    if (!selectionState || event.pointerId !== selectionState.pointerId) return;

    selectionState.currentX = event.clientX;
    selectionState.currentY = event.clientY;
    selectionState.moved = true;
    paintSelectionBox();

    const box = selectionBounds();
    icons.forEach((icon) => {
      const wasSelected = selectionState.initialSelection.has(icon);
      const intersects = rectsIntersect(icon.getBoundingClientRect(), box);

      icon.classList.toggle("is-selected", intersects || (selectionState.preserve && wasSelected));
    });
  }

  function startDesktopSelection(event) {
    if (!desktopModeEnabled() || event.button !== 0) return;

    const preserve = modifierAddsSelection(event);
    if (!preserve) {
      clearIconSelection();
    }

    selectionState = {
      currentX: event.clientX,
      currentY: event.clientY,
      initialSelection: new Set(selectedIcons()),
      moved: false,
      pointerId: event.pointerId,
      preserve,
      startX: event.clientX,
      startY: event.clientY
    };

    paintSelectionBox();
    event.preventDefault();
  }

  function endDesktopSelection(event) {
    if (!selectionState || event.pointerId !== selectionState.pointerId) return;

    selectionBox.style.display = "none";
    selectionState = null;
  }

  windows.forEach((node, index) => {
    node.style.zIndex = String(6 + index);

    const handle = node.querySelector("[data-window-drag-handle]");
    const closeButton = node.querySelector("[data-window-close]");
    const minimizeButton = node.querySelector("[data-window-minimize]");
    const resizeHandles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"].map((direction) => {
      const resizeHandle = document.createElement("span");
      resizeHandle.className = `desktop-window-resize-handle desktop-window-resize-${direction}`;
      resizeHandle.dataset.windowResizeHandle = direction;
      resizeHandle.setAttribute("aria-hidden", "true");
      node.append(resizeHandle);
      return resizeHandle;
    });

    node.addEventListener("pointerdown", () => bringToFront(node));

    if (handle) {
      handle.addEventListener("pointerdown", (event) => startDrag(event, node, handle));
      handle.addEventListener("pointerup", endDrag);
      handle.addEventListener("pointercancel", endDrag);
    }

    if (closeButton) {
      closeButton.addEventListener("click", () => closeWindow(node));
    }

    if (minimizeButton) {
      minimizeButton.addEventListener("click", () => minimizeWindow(node));
    }

    resizeHandles.forEach((resizeHandle) => {
      resizeHandle.addEventListener("pointerdown", (event) => startResize(event, node, resizeHandle));
      resizeHandle.addEventListener("pointerup", endResize);
      resizeHandle.addEventListener("pointercancel", endResize);
    });
  });

  applySavedWindowLayouts();
  applySavedIconPositions();

  icons.forEach((icon) => {
    icon.addEventListener("pointerdown", (event) => startIconDrag(event, icon));
    icon.addEventListener("pointerup", endIconDrag);
    icon.addEventListener("pointercancel", endIconDrag);
    icon.addEventListener("click", (event) => {
      if (!desktopModeEnabled() || icon.dataset.pointerClickHandled === "true") return;
      event.preventDefault();
      handleIconClick(icon, event);
    });
    icon.addEventListener("dblclick", (event) => {
      if (!desktopModeEnabled()) return;
      event.preventDefault();
      openIcon(icon);
    });
    icon.addEventListener("keydown", (event) => {
      if (!desktopModeEnabled() || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      selectIcon(icon);
      openIcon(icon);
    });
  });

  Array.from(document.querySelectorAll("[data-window-open]")).forEach((button) => {
    button.addEventListener("click", () => {
      if (desktopModeEnabled() && button.closest(".desktop-icons")) return;

      const target = button.dataset.windowOpen || "about";
      openWindow(windowsByKey.get(target));

      const menu = button.closest("details");
      if (menu) {
        menu.removeAttribute("open");
      }
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!desktopModeEnabled() || event.target.closest("[data-desktop-icon]")) return;

    if (event.target.closest("[data-desktop-window], .desktop-taskbar, .desktop-start-panel, .site-settings")) {
      clearIconSelection();
      return;
    }

    startDesktopSelection(event);
  });

  window.addEventListener("pointermove", moveIconDrag);
  window.addEventListener("pointerup", endIconDrag);
  window.addEventListener("pointercancel", endIconDrag);
  window.addEventListener("pointermove", updateDesktopSelection);
  window.addEventListener("pointerup", endDesktopSelection);
  window.addEventListener("pointercancel", endDesktopSelection);
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("pointermove", moveResize);
  window.addEventListener("pointerup", endResize);
  window.addEventListener("pointercancel", endResize);
  window.addEventListener("resize", constrainCustomWindows);
})();
