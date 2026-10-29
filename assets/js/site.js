(function () {
  "use strict";

  /* ---------- 顶部导航：滚动状态 ---------- */
  var header = document.getElementById("site-header");

  function updateHeader() {
    if (!header) return;
    header.setAttribute("data-scrolled", window.scrollY > 8 ? "true" : "false");
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  var navClose = document.querySelector(".nav-close");

  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    if (navToggle) navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (mobileNav) mobileNav.setAttribute("aria-hidden", open ? "false" : "true");
    if (open && navClose) navClose.focus();
    if (!open && navToggle) navToggle.focus();
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      setNav(!document.body.classList.contains("nav-open"));
    });
  }

  if (navClose) {
    navClose.addEventListener("click", function () {
      setNav(false);
    });
  }

  if (mobileNav) {
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
      });
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
    }
  });

  /* ---------- 产品一览：Tab ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tour-tab"));

  function selectTab(index, moveFocus) {
    tabs.forEach(function (tab, i) {
      var selected = i === index;
      var panel = document.getElementById(tab.getAttribute("aria-controls"));
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (panel) panel.hidden = !selected;
    });
    if (moveFocus && tabs[index]) tabs[index].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      selectTab(i, false);
    });

    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  /* ---------- FAQ：同时只开一个 ---------- */
  var faqs = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));
  faqs.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqs.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- 代码块复制 ---------- */
  var isZh = /^zh/i.test(document.documentElement.lang || "zh");
  var copyDoneLabel = isZh ? "已复制" : "Copied";
  var copyFailLabel = isZh ? "复制失败" : "Copy failed";
  var copyButtons = Array.prototype.slice.call(document.querySelectorAll("[data-copy]"));

  copyButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var block = button.closest(".code-block");
      var code = block ? block.querySelector("code") : null;
      if (!code || !navigator.clipboard) return;

      var label = button.getAttribute("data-copy-label") || (isZh ? "复制" : "Copy");
      navigator.clipboard.writeText(code.textContent).then(function () {
        button.textContent = copyDoneLabel;
        button.classList.add("is-done");
        window.setTimeout(function () {
          button.textContent = label;
          button.classList.remove("is-done");
        }, 1800);
      }).catch(function () {
        button.textContent = copyFailLabel;
      });
    });
  });

  /* ---------- 滚动显现 ---------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  if ("IntersectionObserver" in window && revealItems.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* ---------- 下载：直接指向 GitHub 最新版本的安装包 ---------- */
  var DL_REPO = "Xiakeming97/lingka-releases";
  var DL_API = "https://api.github.com/repos/" + DL_REPO + "/releases/latest";
  var DL_PAGE = "https://github.com/" + DL_REPO + "/releases/latest";
  var DL_ASSET_PREFIX = "https://github.com/" + DL_REPO + "/releases/download/";
  var DL_CACHE_KEY = "lingka:latest-release";
  var DL_CACHE_TTL = 10 * 60 * 1000;

  var dlLinks = Array.prototype.slice.call(document.querySelectorAll("[data-download]"));
  var dlStatus = document.querySelector("[data-download-status]");
  var dlState = null;
  var dlLoading = null;
  var dlMode = "loading";

  if (dlLinks.length) {
    var ASSET_RULES = {
      windows: [/^Lingka-Setup-.*\.exe$/i],
      "mac-arm64": [/^Lingka-.*-arm64\.dmg$/i, /^Lingka-.*-arm64\.zip$/i],
      "mac-x64": [/^Lingka-.*-x64\.dmg$/i, /^Lingka-.*-x64\.zip$/i]
    };

    function pickAsset(assets, patterns) {
      for (var p = 0; p < patterns.length; p += 1) {
        for (var i = 0; i < assets.length; i += 1) {
          var url = assets[i] && assets[i].browser_download_url;
          if (typeof url !== "string") continue;
          if (url.indexOf(DL_ASSET_PREFIX) !== 0) continue;
          if (patterns[p].test(assets[i].name || "")) return url;
        }
      }
      return null;
    }

    function readCache() {
      try {
        var raw = window.sessionStorage.getItem(DL_CACHE_KEY);
        if (!raw) return null;
        var cached = JSON.parse(raw);
        if (!cached || !cached.expires || cached.expires < Date.now()) return null;
        return cached.state || null;
      } catch (error) {
        return null;
      }
    }

    function writeCache(state) {
      try {
        window.sessionStorage.setItem(
          DL_CACHE_KEY,
          JSON.stringify({ expires: Date.now() + DL_CACHE_TTL, state: state })
        );
      } catch (error) {
        /* 隐私模式禁用存储：不影响本次下载 */
      }
    }

    function setStatus(message) {
      if (!dlStatus) return;
      dlStatus.textContent = message || "";
      dlStatus.hidden = !message;
    }

    function applyState(state) {
      if (!state || !state.assets) return;
      dlState = state;
      dlMode = "ready";
      dlLinks.forEach(function (link) {
        var url = state.assets[link.getAttribute("data-download")];
        if (!url) return;
        link.setAttribute("href", url);
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.setAttribute("data-ready", "true");
      });
      setStatus("");
    }

    function showFallback(message) {
      dlState = null;
      dlMode = "fallback";
      setStatus(message);
      dlLinks.forEach(function (link) {
        link.removeAttribute("data-ready");
        link.setAttribute("href", DL_PAGE);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener");
      });
    }

    function loadRelease() {
      if (dlState) return Promise.resolve(dlState);
      if (dlLoading) return dlLoading;
      if (!("fetch" in window)) {
        showFallback(isZh ? "当前浏览器不支持自动解析版本，请在 GitHub 下载" : "This browser can't resolve the version — download from GitHub");
        return Promise.resolve(null);
      }

      dlLoading = window
        .fetch(DL_API, { headers: { Accept: "application/vnd.github+json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.json();
        })
        .then(function (data) {
          var assets = Array.isArray(data.assets) ? data.assets : [];
          var state = { assets: {} };

          Object.keys(ASSET_RULES).forEach(function (key) {
            var url = pickAsset(assets, ASSET_RULES[key]);
            if (url) state.assets[key] = url;
          });

          if (!state.assets.windows && !state.assets["mac-arm64"] && !state.assets["mac-x64"]) {
            throw new Error("latest release has no matching installer");
          }

          applyState(state);
          writeCache(state);
          return state;
        })
        .catch(function (error) {
          if (window.console && window.console.warn) {
            window.console.warn("[lingka] 最新版本解析失败，回退到 GitHub Releases：", error);
          }
          showFallback(isZh ? "暂时获取不到版本号，已回退到 GitHub 下载" : "Couldn't fetch the version — falling back to GitHub");
          return null;
        })
        .then(function (state) {
          dlLoading = null;
          return state;
        });

      return dlLoading;
    }

    dlLinks.forEach(function (link) {
      link.addEventListener("click", function (event) {
        /* 已解析成功或已明确回退时，交给链接本身的 href / target 走 */
        if (dlMode !== "loading") return;

        event.preventDefault();

        loadRelease().then(function () {
          if (dlMode === "ready" && link.getAttribute("href")) {
            window.location.href = link.getAttribute("href");
            return;
          }
          /* 解析失败：回退到 GitHub Releases 页面（此处已离开点击手势，弹窗可能被拦截） */
          window.location.href = DL_PAGE;
        });
      });
    });

    var cachedState = readCache();
    if (cachedState) {
      applyState(cachedState);
    } else {
      loadRelease();
    }
  }
})();
