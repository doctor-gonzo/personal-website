(function () {
  const carousel = document.querySelector("[data-picture-carousel]");
  const carouselImage = document.querySelector("[data-picture-carousel-image]");
  const carouselTitle = document.querySelector("[data-picture-carousel-title]");
  const carouselPosition = document.querySelector("[data-picture-carousel-position]");
  const carouselOpen = document.querySelector("[data-picture-open]");
  const previousButton = document.querySelector("[data-picture-previous]");
  const nextButton = document.querySelector("[data-picture-next]");
  const thumbnailList = document.querySelector("[data-picture-thumbnails]");
  const filterButtons = Array.from(document.querySelectorAll("[data-picture-filter]"));
  const grid = document.getElementById("picture-list");
  const gridTitle = document.querySelector("[data-picture-grid-title]");
  const gridDescription = document.querySelector("[data-picture-grid-description]");
  const dialog = document.getElementById("picture-dialog");
  const dialogImage = document.getElementById("picture-dialog-image");
  const dialogTitle = document.getElementById("picture-dialog-title");
  const dialogDetails = document.getElementById("picture-dialog-details");

  const collectionCopy = {
    all: {
      label: "All pictures",
      description: "AI-assisted images and photography."
    },
    ai: {
      label: "AI collection",
      description: "Midjourney and other AI-assisted images."
    },
    camera: {
      label: "Camera collection",
      description: "Photography by Charlie Thompson."
    }
  };

  let allPictures = [];
  let visiblePictures = [];
  let activeFilter = "all";
  let currentIndex = 0;

  function normalizeCollections(payload) {
    if (Array.isArray(payload)) {
      return payload.map((item) => {
        const category = String(item.category || item.collection || "camera").toLowerCase();
        const collection = category === "ai" || category === "midjourney" ? "ai" : "camera";
        return { ...item, collection };
      });
    }

    const aiPictures = Array.isArray(payload?.ai)
      ? payload.ai.map((item) => ({ ...item, collection: "ai" }))
      : [];
    const cameraPictures = Array.isArray(payload?.camera)
      ? payload.camera.map((item) => ({ ...item, collection: "camera" }))
      : [];

    return [...aiPictures, ...cameraPictures];
  }

  function pictureAlt(item) {
    return item.alt || item.title || "Picture by Charlie Thompson";
  }

  function pictureDetails(item) {
    return [item.date, item.location, item.caption].filter(Boolean).join(" - ");
  }

  function openPicture(item) {
    if (!item) return;

    dialogImage.src = item.src;
    dialogImage.alt = pictureAlt(item);
    dialogTitle.textContent = item.title || "Picture";
    dialogDetails.textContent = pictureDetails(item);

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  }

  function pictureItem(item) {
    const li = document.createElement("li");
    li.className = "picture-item";

    const button = document.createElement("button");
    button.className = "picture-button";
    button.type = "button";
    button.addEventListener("click", () => openPicture(item));

    const image = document.createElement("img");
    image.loading = "lazy";
    image.src = item.src;
    image.alt = pictureAlt(item);

    const text = document.createElement("span");
    text.className = "picture-card-copy";

    const title = document.createElement("strong");
    title.className = "picture-title";
    title.textContent = item.title || "Untitled";

    const collection = document.createElement("span");
    collection.className = "picture-card-collection";
    collection.textContent = item.collection === "ai" ? "AI" : "Camera";

    text.append(title, collection);
    button.append(image, text);
    li.append(button);
    return li;
  }

  function renderGrid() {
    const copy = collectionCopy[activeFilter];
    grid.textContent = "";
    gridTitle.textContent = copy.label;
    gridDescription.textContent = copy.description;

    if (!visiblePictures.length) {
      const empty = document.createElement("li");
      empty.className = "picture-empty";
      empty.textContent = "No pictures are available in this collection yet.";
      grid.append(empty);
      return;
    }

    visiblePictures.forEach((item) => grid.append(pictureItem(item)));
  }

  function renderThumbnails() {
    thumbnailList.textContent = "";

    visiblePictures.forEach((item, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      const image = document.createElement("img");

      button.className = "picture-carousel-thumbnail";
      button.type = "button";
      button.setAttribute("aria-label", `Show ${item.title || `picture ${index + 1}`}`);
      button.addEventListener("click", () => showPicture(index));

      image.loading = index < 3 ? "eager" : "lazy";
      image.src = item.src;
      image.alt = "";

      button.append(image);
      li.append(button);
      thumbnailList.append(li);
    });
  }

  function showPicture(index) {
    if (!visiblePictures.length) {
      previousButton.disabled = true;
      nextButton.disabled = true;
      carouselOpen.disabled = true;
      carouselPosition.textContent = "0 / 0";
      carouselTitle.textContent = "No pictures available";
      return;
    }

    currentIndex = (index + visiblePictures.length) % visiblePictures.length;
    const item = visiblePictures[currentIndex];
    const title = item.title || "Untitled";

    carouselImage.src = item.src;
    carouselImage.alt = pictureAlt(item);
    carouselTitle.textContent = title;
    carouselPosition.textContent = `${currentIndex + 1} / ${visiblePictures.length}`;
    carouselOpen.setAttribute("aria-label", `Open ${title}`);
    carouselOpen.disabled = false;

    previousButton.disabled = visiblePictures.length < 2;
    nextButton.disabled = visiblePictures.length < 2;

    Array.from(thumbnailList.querySelectorAll(".picture-carousel-thumbnail")).forEach((button, buttonIndex) => {
      const isCurrent = buttonIndex === currentIndex;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-current", isCurrent ? "true" : "false");

      if (isCurrent) {
        const centeredLeft = button.offsetLeft - ((thumbnailList.clientWidth - button.offsetWidth) / 2);
        thumbnailList.scrollTo({ behavior: "smooth", left: Math.max(0, centeredLeft) });
      }
    });
  }

  function updateHash() {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = activeFilter === "all" ? "" : activeFilter;
    history.replaceState(null, "", nextUrl);
  }

  function selectFilter(filter, options = {}) {
    if (!collectionCopy[filter]) return;

    activeFilter = filter;
    visiblePictures = filter === "all"
      ? allPictures
      : allPictures.filter((item) => item.collection === filter);
    currentIndex = 0;

    filterButtons.forEach((button) => {
      const isActive = button.dataset.pictureFilter === filter;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    renderThumbnails();
    renderGrid();
    showPicture(0);

    if (options.updateHash !== false) {
      updateHash();
    }
  }

  previousButton.addEventListener("click", () => showPicture(currentIndex - 1));
  nextButton.addEventListener("click", () => showPicture(currentIndex + 1));
  carouselOpen.addEventListener("click", () => openPicture(visiblePictures[currentIndex]));

  carousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPicture(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      showPicture(currentIndex + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      showPicture(0);
    } else if (event.key === "End") {
      event.preventDefault();
      showPicture(visiblePictures.length - 1);
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => selectFilter(button.dataset.pictureFilter));
  });

  const pictureDataUrl = window.__withSiteRelease
    ? window.__withSiteRelease("./data/pictures.json")
    : "./data/pictures.json";

  fetch(pictureDataUrl)
    .then((response) => response.ok ? response.json() : {})
    .then((payload) => {
      allPictures = normalizeCollections(payload);
      const initialFilter = window.location.hash.slice(1).toLowerCase();
      selectFilter(collectionCopy[initialFilter] ? initialFilter : "all", { updateHash: false });
    })
    .catch(() => {
      allPictures = [];
      visiblePictures = [];
      renderThumbnails();
      renderGrid();
      previousButton.disabled = true;
      nextButton.disabled = true;
      carouselTitle.textContent = "Pictures unavailable";
    });
}());
