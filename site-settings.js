(function () {
  const STYLE_MODE_STORAGE_KEY = "charlie-site-style-mode";
  const PUBLIC_STYLE_MODES = new Set(["minimal", "xbox360", "windows95desktop"]);
  const root = document.body;
  const settings = document.querySelector(".site-settings");
  const params = new URLSearchParams(window.location.search);
  const embedMode = params.get("embed") || "";

  function prepareXboxBladeNavigation() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;

    let homeBlade = nav.querySelector(":scope > .xbox-home-blade");
    if (!homeBlade) {
      homeBlade = document.createElement("a");
      homeBlade.className = "xbox-home-blade";
      homeBlade.href = "./index.html";
      homeBlade.textContent = "Home";
      nav.prepend(homeBlade);
    }

    const page = window.location.pathname.split("/").pop() || "index.html";
    const dropdown = nav.querySelector(":scope > .nav-dropdown");
    const dropdownSummary = dropdown?.querySelector(":scope > summary");
    const dropdownHasCurrentPage = Boolean(
      dropdown?.querySelector('[aria-current="page"]')
    );
    const dropdownIsCurrent = page === "links.html" || dropdownHasCurrentPage;
    const topLevelHasCurrentPage = Boolean(
      nav.querySelector(':scope > a:not(.xbox-home-blade)[aria-current="page"]')
    );

    if (dropdownSummary && dropdownIsCurrent) {
      dropdownSummary.setAttribute("aria-current", "page");
    }

    if (dropdownSummary && !dropdownSummary.dataset.xboxLinksNav) {
      dropdownSummary.dataset.xboxLinksNav = "true";
      dropdownSummary.addEventListener("click", (event) => {
        if (root.dataset.styleMode !== "xbox360") return;
        event.preventDefault();
        window.location.href = "./links.html";
      });
    }

    const bladeItems = Array.from(
      nav.querySelectorAll(":scope > a, :scope > .nav-dropdown > summary")
    );

    bladeItems.forEach((item) => {
      if (item.querySelector(":scope > .xbox-blade-label")) return;
      const label = document.createElement("span");
      label.className = "xbox-blade-label";
      while (item.firstChild) {
        label.appendChild(item.firstChild);
      }
      item.appendChild(label);
    });

    if (page === "index.html" || (!topLevelHasCurrentPage && !dropdownIsCurrent)) {
      homeBlade.setAttribute("aria-current", "page");
    }

    const currentBladeIndex = Math.max(
      1,
      bladeItems.findIndex((item) => item.getAttribute("aria-current") === "page") + 1
    );
    nav.dataset.xboxCurrentIndex = String(currentBladeIndex);

    /* Desktop blade masks must remain sculpted, but a descendant label would
       be clipped by that same curved mask. Mirror the labels onto an
       unmasked visual plane above the shells; the original anchor text stays
       in the DOM for keyboard and assistive-technology navigation, and is
       still the visible label in the independent mobile layout. */
    bladeItems.forEach((item, index) => {
      const bladeIndex = index + 1;
      const label = item.querySelector(":scope > .xbox-blade-label");
      let overlay = nav.querySelector(
        `:scope > .xbox-blade-label-overlay[data-xbox-blade-index="${bladeIndex}"]`
      );

      if (!overlay) {
        overlay = document.createElement("span");
        overlay.className = "xbox-blade-label-overlay";
        overlay.dataset.xboxBladeIndex = String(bladeIndex);
        overlay.setAttribute("aria-hidden", "true");
        nav.appendChild(overlay);
      }

      overlay.dataset.href = item.matches("a")
        ? item.getAttribute("href")
        : "./links.html";
      overlay.textContent = label?.textContent.trim() || "";

      if (!overlay.dataset.xboxNavigate) {
        overlay.dataset.xboxNavigate = "true";
        overlay.addEventListener("click", () => {
          if (root.dataset.styleMode !== "xbox360") return;
          window.location.href = overlay.dataset.href;
        });
      }
    });

  }

  function prepareXboxPreview() {
    const list = document.querySelector("main > section#work > ul");
    if (!list || document.querySelector(".xbox-preview")) return;

    const aside = document.createElement("aside");
    aside.className = "xbox-preview";
    aside.setAttribute("aria-hidden", "true");
    aside.innerHTML = [
      '<span class="xbox-preview-art" data-art="context-engine"></span>',
      '<strong class="xbox-preview-title"></strong>',
      '<span class="xbox-preview-body"></span>'
    ].join("");
    list.parentElement.appendChild(aside);

    const art = aside.querySelector(".xbox-preview-art");
    const title = aside.querySelector(".xbox-preview-title");
    const body = aside.querySelector(".xbox-preview-body");

    function setFrom(item) {
      const lead = item.querySelector("a") || item.querySelector("strong") || item;
      const text = item.textContent.replace(/\s+/g, " ").trim();
      const splitAt = text.indexOf(" - ");
      art.dataset.art = item.dataset.xboxArt || "context-engine";
      title.textContent = lead.textContent.replace(/[:\s]+$/, "");
      body.textContent = splitAt > -1 ? text.slice(splitAt + 3) : text;
    }

    const items = Array.from(list.querySelectorAll(":scope > li"));
    if (!items.length) return;
    setFrom(items[0]);
    items.forEach((item) => {
      item.addEventListener("mouseenter", () => setFrom(item));
      item.addEventListener("focusin", () => setFrom(item));
    });
  }

  function prepareXboxWorkLinks() {
    const list = document.querySelector("main > section#work > ul");
    if (!list) return;

    const items = Array.from(
      list.querySelectorAll(":scope > li, :scope > li > ul > li")
    );

    items.forEach((item) => {
      const links = Array.from(item.children).filter((child) =>
        child.matches("a[href]")
      );
      if (links.length !== 1) return;

      const link = links[0];
      item.classList.add("xbox-single-link-item");

      item.addEventListener("click", (event) => {
        if (root.dataset.styleMode !== "xbox360") return;
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.target.closest?.("a, button, input, select, textarea, summary")) return;

        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim()) return;

        if (event.metaKey || event.ctrlKey || event.shiftKey) {
          window.open(link.href, "_blank", "noopener");
          return;
        }

        window.location.href = link.href;
      });
    });
  }

  prepareXboxBladeNavigation();
  prepareXboxPreview();
  prepareXboxWorkLinks();

  if (!root) return;

  if (embedMode) {
    root.dataset.embedMode = embedMode;
  }

  const toggleButton = settings?.querySelector(".settings-toggle-button") || null;
  const panel = settings?.querySelector(".settings-panel") || null;
  const themeSelect = settings?.querySelector("[data-style-mode-select]") || null;
  const demoFeaturesToggle = settings?.querySelector("[data-demo-features-toggle]") || null;
  const demoFeatures = Array.from(document.querySelectorAll("[data-demo-feature]"));
  const pageDemoToggles = Array.from(document.querySelectorAll("[data-page-demo-toggle]"));

  function setPanelOpen(open) {
    if (!toggleButton || !panel) return;

    panel.hidden = !open;
    toggleButton.setAttribute("aria-expanded", String(open));
  }

  function setThemeMode(mode, persist = true) {
    const nextMode = embedMode
      ? "minimal"
      : (PUBLIC_STYLE_MODES.has(mode) ? mode : "minimal");
    root.dataset.styleMode = nextMode;

    if (themeSelect) {
      themeSelect.value = nextMode;
    }

    if (persist) {
      try {
        window.localStorage.setItem(STYLE_MODE_STORAGE_KEY, nextMode);
      } catch {
        // Ignore storage failures; the current page can still switch themes.
      }
    }
  }

  function setDemoFeatures(enabled) {
    root.dataset.demoFeatures = enabled ? "on" : "off";

    demoFeatures.forEach((node) => {
      node.hidden = !enabled;
    });

    if (!enabled) {
      pageDemoToggles.forEach((toggle) => {
        if (toggle.checked) {
          toggle.checked = false;
          toggle.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }

    if (demoFeaturesToggle) {
      demoFeaturesToggle.checked = enabled;
    }
  }

  let savedMode = "";
  try {
    savedMode = window.localStorage.getItem(STYLE_MODE_STORAGE_KEY) || "";
  } catch {
    savedMode = "";
  }

  if (embedMode) {
    setThemeMode("minimal", false);
  } else {
    setThemeMode(savedMode || root.dataset.styleMode || "minimal", false);
  }
  setDemoFeatures(!embedMode && root.dataset.demoFeatures === "on");

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      setPanelOpen(panel.hidden);
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", () => {
      setThemeMode(themeSelect.value);
    });
  }

  if (demoFeaturesToggle) {
    demoFeaturesToggle.addEventListener("change", () => {
      setDemoFeatures(demoFeaturesToggle.checked);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setPanelOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel || panel.hidden || settings.contains(event.target)) return;
    setPanelOpen(false);
  });

  window.siteSettings = {
    setDemoFeatures,
    setThemeMode
  };
})();
