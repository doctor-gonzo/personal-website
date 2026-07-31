(function () {
  if (window.__siteReleaseWatchdogInstalled) return;
  window.__siteReleaseWatchdogInstalled = true;

  const script = document.currentScript;
  const currentRelease = script && script.dataset.siteRelease;

  if (!script || !currentRelease) return;

  const releaseManifestUrl = new URL("./release.json", script.src);
  const minimumCheckInterval = 30 * 1000;
  const periodicCheckInterval = 5 * 60 * 1000;
  let activeCheck = null;
  let lastCheckStartedAt = 0;

  window.__SITE_RELEASE_ID__ = currentRelease;
  window.__withSiteRelease = function (input) {
    const url = new URL(input, document.baseURI);

    if (url.origin === window.location.origin) {
      url.searchParams.set("_site_release", currentRelease);
    }

    return url.href;
  };

  async function checkForRelease(options = {}) {
    const now = Date.now();

    if (!options.force && now - lastCheckStartedAt < minimumCheckInterval) {
      return;
    }

    if (activeCheck) return activeCheck;
    lastCheckStartedAt = now;

    activeCheck = (async function () {
      try {
        const requestUrl = new URL(releaseManifestUrl);
        requestUrl.searchParams.set("_release_check", String(now));

        const response = await fetch(requestUrl.href, {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) return;

        const manifest = await response.json();
        const latestRelease = typeof manifest.id === "string" ? manifest.id.trim() : "";

        if (!latestRelease || latestRelease === currentRelease) return;

        const destination = new URL(window.location.href);

        if (destination.searchParams.get("_site_release") === latestRelease) {
          return;
        }

        destination.searchParams.set("_site_release", latestRelease);
        window.location.replace(destination.href);
      } catch (_error) {
        // A failed check should never interrupt navigation or offline reading.
      } finally {
        activeCheck = null;
      }
    }());

    return activeCheck;
  }

  window.addEventListener("pageshow", function () {
    checkForRelease({ force: true });
  });

  window.addEventListener("online", function () {
    checkForRelease({ force: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      checkForRelease({ force: true });
    }
  });

  window.setInterval(checkForRelease, periodicCheckInterval);
}());
