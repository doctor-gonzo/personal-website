(function () {
  const list = document.querySelector("[data-tweet-list]");
  if (!list) return;

  const source = list.dataset.src || "./data/tweets/public-posts.json";
  const thoughtModeButtons = Array.from(document.querySelectorAll("[data-thought-mode]"));
  const thoughtPanels = Array.from(document.querySelectorAll("[data-thought-panel]"));
  const searchInput = document.querySelector("[data-tweet-search]");
  const yearSelect = document.querySelector("[data-tweet-year]");
  const clearButton = document.querySelector("[data-tweet-clear]");
  const filterCount = document.querySelector("[data-tweet-filter-count]");

  let allPosts = [];
  let postsById = new Map();

  function selectThoughtMode(mode, options = {}) {
    const selectedPanel = thoughtPanels.find((panel) => panel.dataset.thoughtPanel === mode);

    if (!selectedPanel) return;

    thoughtModeButtons.forEach((button) => {
      const isSelected = button.dataset.thoughtMode === mode;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });

    thoughtPanels.forEach((panel) => {
      panel.hidden = panel !== selectedPanel;
    });

    if (options.updateHash !== false) {
      const nextUrl = new URL(window.location.href);
      nextUrl.hash = mode;
      history.replaceState(null, "", nextUrl);
    }
  }

  thoughtModeButtons.forEach((button, index) => {
    button.addEventListener("click", () => selectThoughtMode(button.dataset.thoughtMode));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextButton = thoughtModeButtons[(index + direction + thoughtModeButtons.length) % thoughtModeButtons.length];
      nextButton.focus();
      selectThoughtMode(nextButton.dataset.thoughtMode);
    });
  });

  const initialThoughtMode = window.location.hash.slice(1).toLowerCase();
  if (initialThoughtMode === "tweets" || initialThoughtMode === "posts") {
    selectThoughtMode(initialThoughtMode, { updateHash: false });
  }

  function clearList() {
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
  }

  function appendEmpty(message) {
    clearList();
    const item = document.createElement("li");
    item.textContent = message;
    list.appendChild(item);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function getTweetYear(tweet) {
    if (!tweet.createdAt) return "";
    const date = new Date(tweet.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return String(date.getFullYear());
  }

  function normalizedTweetText(tweet) {
    const urlText = Array.isArray(tweet.urls)
      ? tweet.urls.map((url) => [url.displayUrl, url.display_url, url.expandedUrl, url.expanded_url].filter(Boolean).join(" ")).join(" ")
      : "";
    return `${tweet.text || ""} ${urlText}`.toLowerCase();
  }

  function isStatusUrl(value) {
    return /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^/]+\/status\/\d+/i.test(value || "");
  }

  function extractStatusId(value) {
    const match = String(value || "").match(/\/status\/(\d+)/);
    return match ? match[1] : "";
  }

  function normalizedStatusUrl(value) {
    const id = extractStatusId(value);
    return id ? id : String(value || "");
  }

  function displayStatusUrl(value) {
    try {
      const url = new URL(value);
      return `${url.hostname}${url.pathname}`;
    } catch {
      return value || "Quoted tweet";
    }
  }

  function parseTweetUrl(value) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      const statusIndex = parts.indexOf("status");

      if (statusIndex > 0 && parts[statusIndex + 1]) {
        return {
          handle: parts[statusIndex - 1],
          id: parts[statusIndex + 1],
          url: url.href
        };
      }
    } catch {
      return {
        handle: "",
        id: "",
        url: value || ""
      };
    }

    return {
      handle: "",
      id: "",
      url: value || ""
    };
  }

  function getQuotedTweet(tweet) {
    if (tweet.quotedTweet && (tweet.quotedTweet.url || tweet.quotedTweet.id)) {
      return tweet.quotedTweet;
    }

    if (!Array.isArray(tweet.urls)) return null;

    const ownStatus = normalizedStatusUrl(tweet.url);
    const quoteUrl = tweet.urls.find((item) => {
      const expandedUrl = item.expandedUrl || item.expanded_url || item.shortUrl || "";
      return isStatusUrl(expandedUrl) && normalizedStatusUrl(expandedUrl) !== ownStatus;
    });

    if (!quoteUrl) return null;

    const url = quoteUrl.expandedUrl || quoteUrl.expanded_url || quoteUrl.shortUrl;

    return {
      id: extractStatusId(url),
      url,
      displayUrl: quoteUrl.displayUrl || quoteUrl.display_url || displayStatusUrl(url),
      shortUrl: quoteUrl.shortUrl || quoteUrl.url || ""
    };
  }

  function displayText(tweet) {
    let text = tweet.text || "";

    if (Array.isArray(tweet.media)) {
      tweet.media.forEach((media) => {
        if (media.shortUrl) {
          text = text.replace(media.shortUrl, "");
        }
      });
    }

    const quotedTweet = getQuotedTweet(tweet);
    if (quotedTweet && quotedTweet.shortUrl) {
      text = text.replace(quotedTweet.shortUrl, "");
    }

    return text.trim();
  }

  function expandedHref(tweet, value) {
    const url = Array.isArray(tweet.urls)
      ? tweet.urls.find((item) => item.shortUrl === value || item.url === value)
      : null;

    return url?.expandedUrl || url?.expanded_url || value;
  }

  function appendLinkedText(parent, text, tweet) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);

    parts.forEach((part) => {
      if (!part) return;

      if (/^https?:\/\//.test(part)) {
        const link = document.createElement("a");
        link.href = expandedHref(tweet, part);
        link.textContent = part;
        parent.appendChild(link);
        return;
      }

      parent.appendChild(document.createTextNode(part));
    });
  }

  function ensureTweetDialog() {
    let dialog = document.getElementById("tweet-dialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "tweet-dialog";
    dialog.id = "tweet-dialog";
    dialog.setAttribute("aria-labelledby", "tweet-dialog-title");
    dialog.innerHTML = [
      '<form method="dialog">',
      '<button class="tweet-dialog-close" type="submit">Close</button>',
      "</form>",
      '<img class="tweet-dialog-image" id="tweet-dialog-image" alt="">',
      '<h2 id="tweet-dialog-title">Attachment</h2>',
      '<p id="tweet-dialog-details"></p>',
      '<p><a id="tweet-dialog-link" href="#">Open attachment</a></p>'
    ].join("");

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function openTweetDialog(media) {
    const dialog = ensureTweetDialog();
    const image = dialog.querySelector("#tweet-dialog-image");
    const title = dialog.querySelector("#tweet-dialog-title");
    const details = dialog.querySelector("#tweet-dialog-details");
    const link = dialog.querySelector("#tweet-dialog-link");

    const href = media.expandedUrl || media.url;

    image.src = media.url || "";
    image.alt = media.displayUrl || "Tweet attachment";
    title.textContent = media.type ? `Attachment: ${media.type}` : "Attachment";
    details.textContent = media.displayUrl || "";
    details.hidden = !details.textContent;
    link.href = href;

    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function appendQuotedTweet(parent, tweet) {
    const quotedTweet = getQuotedTweet(tweet);
    if (!quotedTweet || (!quotedTweet.url && !quotedTweet.id)) return;

    const quotedPost = quotedTweet.id ? postsById.get(String(quotedTweet.id)) : null;
    const href = quotedTweet.url || `https://x.com/i/status/${quotedTweet.id}`;
    const parsed = parseTweetUrl(href);
    const card = document.createElement("article");
    card.className = "tweet-quote";

    const header = document.createElement("span");
    header.className = "tweet-quote-header";

    const label = document.createElement("span");
    label.className = "tweet-quote-label";
    label.textContent = "Quoted tweet";
    header.appendChild(label);

    const open = document.createElement("a");
    open.href = href;
    open.className = "tweet-quote-open";
    open.textContent = "Open \u2197";
    header.appendChild(open);

    card.appendChild(header);

    if (quotedPost) {
      const dateText = formatDate(quotedPost.createdAt);
      const title = document.createElement("strong");
      title.className = "tweet-quote-title";
      title.textContent = "Charlie Thompson";
      card.appendChild(title);

      if (dateText) {
        const meta = document.createElement("span");
        meta.className = "tweet-quote-meta";
        meta.textContent = dateText;
        card.appendChild(meta);
      }

      const text = document.createElement("span");
      text.className = "tweet-quote-text";
      text.textContent = displayText(quotedPost);
      card.appendChild(text);
    } else {
      const title = document.createElement("strong");
      title.className = "tweet-quote-title";
      title.textContent = parsed.handle ? `@${parsed.handle}` : "Quoted tweet";
      card.appendChild(title);

      const meta = document.createElement("span");
      meta.className = "tweet-quote-meta";
      meta.textContent = parsed.handle ? "Original on Twitter" : (quotedTweet.displayUrl || displayStatusUrl(href));
      card.appendChild(meta);
    }

    parent.appendChild(card);
  }

  function appendTweet(tweet) {
    const item = document.createElement("li");
    item.className = "tweet-item";

    const header = document.createElement("div");
    header.className = "tweet-header";

    const author = document.createElement("strong");
    author.textContent = "Charlie Thompson";
    header.appendChild(author);

    const handle = document.createElement("span");
    handle.textContent = " @charlie______t";
    header.appendChild(handle);

    const dateText = formatDate(tweet.createdAt);
    if (dateText) {
      const date = document.createElement("span");
      date.className = "tweet-date";
      date.textContent = ` · ${dateText}`;
      header.appendChild(date);
    }

    if (tweet.url) {
      const external = document.createElement("a");
      external.href = tweet.url;
      external.className = "tweet-external-link faExternal";
      external.textContent = "\u2197";
      external.title = "Open on Twitter";
      external.setAttribute("aria-label", "Open on Twitter");
      header.appendChild(external);
    }

    item.appendChild(header);

    const text = document.createElement("p");
    text.className = "tweet-text";
    appendLinkedText(text, displayText(tweet), tweet);
    item.appendChild(text);

    appendQuotedTweet(item, tweet);

    if (Array.isArray(tweet.media) && tweet.media.length > 0) {
      const mediaGrid = document.createElement("div");
      mediaGrid.className = `tweet-media tweet-media-${Math.min(tweet.media.length, 4)}`;

      tweet.media.slice(0, 4).forEach((media) => {
        const link = document.createElement("a");
        link.href = media.expandedUrl || media.url;
        link.className = "tweet-media-link";
        link.addEventListener("click", (event) => {
          event.preventDefault();
          openTweetDialog(media);
        });

        const image = document.createElement("img");
        image.src = media.url;
        image.alt = media.displayUrl || "Tweet image";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.className = "tweet-image";

        image.addEventListener("error", () => {
          link.classList.add("tweet-media-link-broken");
          image.remove();
          link.textContent = media.displayUrl || "Open image";
        });

        link.appendChild(image);
        mediaGrid.appendChild(link);
      });

      item.appendChild(mediaGrid);
    }

    list.appendChild(item);
  }

  function getFilteredPosts() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    const year = yearSelect?.value || "";

    return allPosts.filter((post) => {
      if (query && !normalizedTweetText(post).includes(query)) return false;
      if (year && getTweetYear(post) !== year) return false;
      return true;
    });
  }

  function renderFilteredTweets() {
    const posts = getFilteredPosts();

    clearList();

    if (posts.length === 0) {
      appendEmpty("No tweets match.");
    } else {
      posts.forEach(appendTweet);
    }

    if (filterCount) {
      filterCount.textContent = `Showing ${posts.length} of ${allPosts.length}`;
    }
  }

  function populateYearFilter(posts) {
    if (yearSelect) {
      const currentValue = yearSelect.value;
      const years = [...new Set(posts.map(getTweetYear).filter(Boolean))].sort((a, b) => Number(b) - Number(a));

      yearSelect.replaceChildren();

      const allOption = document.createElement("option");
      allOption.value = "";
      allOption.textContent = "All years";
      yearSelect.appendChild(allOption);

      years.forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      });

      yearSelect.value = currentValue;
    }
  }

  function bindControls() {
    [searchInput, yearSelect].forEach((control) => {
      if (!control) return;
      control.addEventListener("input", renderFilteredTweets);
      control.addEventListener("change", renderFilteredTweets);
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (yearSelect) yearSelect.value = "";
        renderFilteredTweets();
      });
    }
  }

  fetch(source)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${source}`);
      }
      return response.json();
    })
    .then((archive) => {
      const posts = Array.isArray(archive.posts) ? archive.posts : [];

      if (posts.length === 0) {
        appendEmpty("No imported tweets yet.");
        return;
      }

      allPosts = [...posts].sort((a, b) => {
        const aTime = Date.parse(a.createdAt) || 0;
        const bTime = Date.parse(b.createdAt) || 0;
        return bTime - aTime;
      });
      postsById = new Map(allPosts.map((post) => [String(post.id), post]));
      bindControls();
      populateYearFilter(allPosts);
      renderFilteredTweets();
    })
    .catch(() => {
      appendEmpty("No imported tweets yet.");
    });
})();
