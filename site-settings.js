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
      item.setAttribute("aria-label", label?.textContent.trim() || "Navigation");
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

    const picturesBlade = bladeItems.find(
      (item) => item.matches('a[href$="pictures.html"]')
    );
    if (picturesBlade) {
      let picturesHitArea = root.querySelector(
        ":scope > .xbox-pictures-blade-hit-area"
      );

      if (!picturesHitArea) {
        picturesHitArea = document.createElement("a");
        picturesHitArea.className = "xbox-pictures-blade-hit-area";
        picturesHitArea.setAttribute("aria-hidden", "true");
        picturesHitArea.tabIndex = -1;
        root.appendChild(picturesHitArea);
      }

      picturesHitArea.href = picturesBlade.getAttribute("href");
    }

    const linksBlade = dropdownSummary;
    if (linksBlade) {
      let linksHitArea = root.querySelector(
        ":scope > .xbox-links-blade-hit-area"
      );

      if (!linksHitArea) {
        linksHitArea = document.createElement("a");
        linksHitArea.className = "xbox-links-blade-hit-area";
        linksHitArea.setAttribute("aria-hidden", "true");
        linksHitArea.tabIndex = -1;
        root.appendChild(linksHitArea);
      }

      linksHitArea.href = linksBlade.matches("a")
        ? linksBlade.getAttribute("href")
        : "./links.html";
    }

  }

  function prepareXboxPreview() {
    const list = document.querySelector("main > section#work > ul");
    if (!list || document.querySelector(".xbox-preview")) return;

    const aside = document.createElement("aside");
    aside.className = "xbox-preview";
    aside.id = "xbox-project-preview";
    aside.setAttribute("aria-label", "Selected project");
    aside.innerHTML = [
      '<a class="xbox-preview-display">',
      '<span class="xbox-preview-art" data-art="context-engine" aria-hidden="true"></span>',
      '<strong class="xbox-preview-title"></strong>',
      '<span class="xbox-preview-body"></span>',
      '</a>',
      '<a class="xbox-mobile-project-link">View project →</a>',
      '<div class="xbox-preview-links"></div>'
    ].join("");
    list.parentElement.appendChild(aside);

    const art = aside.querySelector(".xbox-preview-art");
    const title = aside.querySelector(".xbox-preview-title");
    const body = aside.querySelector(".xbox-preview-body");
    const previewLinks = aside.querySelector(".xbox-preview-links");
    const display = aside.querySelector(".xbox-preview-display");
    const mobileProjectLink = aside.querySelector(".xbox-mobile-project-link");
    const projects = [
      ["Context Engine", "2023–present", "An open-source toolkit for large-group deliberation and negotiation, for humans and AI agents."],
      ["Security Research", "2025", "Listed at the top of QRL’s bug bounty Hall of Fame."],
      ["Quantum computing and Bitcoin", "2018–present", "Research on quantum risk to Bitcoin, Ethereum, ECDSA, and post-quantum migration."],
      ["AI Consciousness Report", "2023", "Graphical assistance for the AI Consciousness Report."],
      ["Social Infrastructure for AI", "2023", "A Zuzalu talk on social infrastructure for AI on Ethereum."],
      ["Cornell University", "Computer Science · 2021", "B.A., Computer Science, Cornell University."],
      ["Quadratic Funding Research", "2019", "Research assistance connected to quadratic funding and civic experiments."],
      ["Proof of Human", "2018", "A Winograd Schema Challenge concept for proving humanity of smart-contract callers."]
    ];
    let selected;

    function setFrom(item) {
      if (selected === item) return;
      selected = item;
      const project = projects[items.indexOf(item)];
      items.forEach((row) => {
        row.classList.toggle("is-xbox-selected", row === item);
        row.querySelector(".xbox-project-select").setAttribute("aria-pressed", String(row === item));
      });
      art.dataset.art = item.dataset.xboxArt || "context-engine";
      title.textContent = project[0];
      body.textContent = project[2];
      display.removeAttribute("href");
      display.removeAttribute("aria-label");
      mobileProjectLink.removeAttribute("href");
      mobileProjectLink.removeAttribute("aria-label");
      previewLinks.replaceChildren();
      item.querySelectorAll(".xbox-work-original a").forEach((link, index) => {
        if (index === 0) {
          display.href = link.href;
          display.setAttribute("aria-label", "Open " + project[0]);
          mobileProjectLink.href = link.href;
          mobileProjectLink.setAttribute("aria-label", "View project: " + project[0]);
          if (item.dataset.xboxArt === "proof-of-human") {
            const githubLink = link.cloneNode(false);
            githubLink.className = "xbox-project-link";
            githubLink.textContent = "GitHub";
            previewLinks.appendChild(githubLink);
          }
          if (["zuzalu-social-infrastructure", "public-goods"].includes(item.dataset.xboxArt)) {
            const artifactLink = link.cloneNode(true);
            artifactLink.className = "xbox-project-link";
            previewLinks.appendChild(artifactLink);
          }
          if (item.dataset.xboxArt === "context-engine") {
            const liveLink = link.cloneNode(false);
            liveLink.className = "xbox-project-link";
            liveLink.textContent = "Live site";
            const githubLink = document.createElement("a");
            githubLink.className = "xbox-project-link";
            githubLink.href = "https://github.com/AgalmicSoftware/context-engine/";
            githubLink.textContent = "GitHub";
            previewLinks.append(liveLink, githubLink);
            for (const [label, href] of [
              ["Cosmos: 80 new grantees", "https://blog.cosmos-institute.org/p/announcing-80-new-cosmos-grantees"],
              ["RadicalxChange: Methods & Tools", "https://www.radicalxchange.org/tools/"],
            ]) {
              const recognitionLink = document.createElement("a");
              recognitionLink.className = "xbox-project-link";
              recognitionLink.href = href;
              recognitionLink.textContent = label;
              previewLinks.appendChild(recognitionLink);
            }
          }
          if (item.dataset.xboxArt === "security-research") {
            const bountyLink = link.cloneNode(false);
            bountyLink.className = "xbox-project-link";
            bountyLink.textContent = "QRL Bug Bounty & Hall of Fame";
            previewLinks.appendChild(bountyLink);
          }
          if (item.dataset.xboxArt === "ai-consciousness") {
            const paperLink = link.cloneNode(false);
            paperLink.className = "xbox-project-link";
            paperLink.textContent = "Consciousness in Artificial Intelligence: Insights from the Science of Consciousness";
            previewLinks.appendChild(paperLink);
          }
          return;
        }
        const copy = link.cloneNode(true);
        copy.className = "xbox-project-link";
        previewLinks.appendChild(copy);
      });
    }

    const items = Array.from(list.querySelectorAll(":scope > li"));
    if (!items.length) return;
    const mobileViewport = window.matchMedia("(max-width: 840px)");
    const main = list.closest("main");
    const back = document.createElement("button");
    back.type = "button";
    back.className = "xbox-project-back";
    back.textContent = "← Back";
    back.setAttribute("aria-label", "Back to projects");
    aside.appendChild(back);
    aside.tabIndex = -1;
    let returnButton;
    let listScrollTop = 0;
    function closeProject() {
      if (!root.classList.contains("xbox-project-open")) return;
      root.classList.remove("xbox-project-open");
      main.scrollTop = listScrollTop;
      returnButton?.focus({ preventScroll: true });
    }
    back.addEventListener("click", closeProject);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProject();
    });
    mobileViewport.addEventListener("change", closeProject);
    root.addEventListener("xbox-close-project", closeProject);
    items.forEach((item, index) => {
      const original = document.createElement("div");
      original.className = "xbox-work-original";
      while (item.firstChild) original.appendChild(item.firstChild);
      item.appendChild(original);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "xbox-project-select";
      button.setAttribute("aria-controls", aside.id);
      const name = document.createElement("span");
      name.textContent = projects[index][0];
      const date = document.createElement("span");
      date.className = "xbox-project-date";
      date.textContent = projects[index][1];
      button.append(name, date);
      item.appendChild(button);
      button.addEventListener("click", () => {
        setFrom(item);
        if (root.dataset.styleMode !== "xbox360" || !mobileViewport.matches) return;
        returnButton = button;
        listScrollTop = main.scrollTop;
        root.classList.add("xbox-project-open");
        main.scrollTop = 0;
        aside.focus({ preventScroll: true });
      });
      button.addEventListener("focus", () => setFrom(item));
      item.addEventListener("mouseenter", () => {
        if (root.dataset.styleMode === "xbox360" && !aside.contains(document.activeElement)) setFrom(item);
      });
      button.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        items[(index + step + items.length) % items.length].querySelector(".xbox-project-select").focus();
      });
    });
    setFrom(items[0]);
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
  if (toggleButton) {
    const label = document.createElement("span");
    label.className = "xbox-theme-label";
    label.textContent = "Change Theme";
    const icon = document.createElement("span");
    icon.className = "xbox-theme-y";
    icon.textContent = "Y";
    icon.setAttribute("aria-hidden", "true");
    toggleButton.append(icon, label);
  }
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
    if (nextMode !== "xbox360") root.dispatchEvent(new Event("xbox-close-project"));
    toggleButton?.setAttribute("aria-label", nextMode === "xbox360" ? "Change Theme" : "Settings");
    toggleButton?.setAttribute("title", nextMode === "xbox360" ? "Change Theme" : "Settings");

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
