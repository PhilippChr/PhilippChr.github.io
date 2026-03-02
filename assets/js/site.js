// Set current year in footer
(() => {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
})();


// Hide mail
(() => {
  const user = "philipp.christmann";
  const domain = "cispa.de";
  const el = document.getElementById("email");
  if (el) {
    const a = document.createElement("a");
    a.style = "color: var(--pc-accent)";
    a.href = "mailto:" + user + "@" + domain;
    a.textContent = user + "@" + domain;
    el.appendChild(a);
  }
})();


// Display publications
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("publist");
  if (!container) return;

  // Configure: how your name should be matched/highlighted
  const ME = {
    first: "Philipp",
    last: "Christmann",
  };

  // Define which BibTeX fields should be rendered as links (and their labels)
  const LINK_FIELDS = [
    { key: "preprint_url", label: "Preprint" },
    { key: "url", label: "Paper" },
    { key: "paper_url", label: "Paper" },
    { key: "website_url", label: "Website" },
    { key: "demo_url", label: "Demo" },
    { key: "code_url", label: "Code" },
    { key: "data_url", label: "Data" },
    { key: "video_url", label: "Video" },
    { key: "slides_url", label: "Slides" },
    { key: "poster_url", label: "Poster" },
    { key: "user_study_url", label: "User Study" },
  ];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Normalize author strings and highlight "ME"
  // Supports: "Philipp Christmann" and "Christmann, Philipp"
  function formatAuthors(authorsRaw) {
    if (!authorsRaw) return "";

    // bibtex-parse-js keeps author string as given; typical separator is " and "
    const parts = authorsRaw.split(/\s+and\s+/i).map(s => s.trim()).filter(Boolean);

    const meRegexes = [
      new RegExp(`^${ME.first}\\s+${ME.last}$`, "i"),
      new RegExp(`^${ME.last},\\s*${ME.first}$`, "i"),
      new RegExp(`^${ME.last},\\s*${ME.first}\\b`, "i"), // allow middle initials
      new RegExp(`^${ME.first}\\s+\\w+\\s+${ME.last}$`, "i"), // allow middle name
    ];

    const formatted = parts.map(a => {
      const aEsc = escapeHtml(a);

      const isMe = meRegexes.some(rx => rx.test(a));
      return isMe ? `<strong>${aEsc}</strong>` : aEsc;
    });

    // Join with commas, last separator with "and" is optional; commas are fine for academia
    return formatted.join(", ");
  }

  function firstNonEmpty(...vals) {
    for (const v of vals) {
      if (v && String(v).trim().length > 0) return String(v).trim();
    }
    return "";
  }

  function renderLinks(tags) {
    const items = [];

    for (const spec of LINK_FIELDS) {
      const val = tags[spec.key];
      if (!val) continue;

      // Avoid duplicate URLs across different keys
      const url = String(val).trim();
      if (!url) continue;
      // if (items.some(x => x.url === url)) continue;

      items.push({ label: spec.label, url });
    }

    if (items.length === 0) return "";

    // Render as small inline list with separators
    const linksHtml = items
      .map(
        (x) =>
          `<a href="${escapeHtml(x.url)}" target="_blank" rel="noopener">[${escapeHtml(x.label)}]</a>`
      )
      .join(`<span class="text-muted mx-1">·</span>`);

    return `<div class="pub-links mt-1 small">${linksHtml}</div>`;
  }

  try {
    const res = await fetch("assets/data/publications.bib", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch .bib: ${res.status}`);
    const bibtexText = await res.text();

    const entries = bibtexParse.toJSON(bibtexText);

    entries.reverse();
    // Sort by year desc; tie-breaker by title
    // entries.sort((a, b) => {
    //   const ya = parseInt(a.entryTags?.year || "0", 10);
    //   const yb = parseInt(b.entryTags?.year || "0", 10);
    //   if (yb !== ya) return yb - ya;
    //   const ta = (a.entryTags?.title || "").toLowerCase();
    //   const tb = (b.entryTags?.title || "").toLowerCase();
    //   return ta.localeCompare(tb);
    // });

    container.innerHTML = "";

    for (const entry of entries) {
      const tags = entry.entryTags || {};

      const title = firstNonEmpty(tags.title);
      const year = firstNonEmpty(tags.year);
      const venue = firstNonEmpty(tags.booktitle, tags.journal);

      const authorsHtml = formatAuthors(tags.author);

      // Title links: prefer "paper_url" or "url" if present
      const titleUrl = firstNonEmpty(tags.paper_url, tags.url);

      const item = document.createElement("div");
      item.className = "pubitem";

      const titleHtml = titleUrl
        ? `<a href="${escapeHtml(titleUrl)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>`
        : `${escapeHtml(title)}`;

      item.innerHTML = `
        <div class="pubtitle">${titleHtml}</div>
        <div class="pubmeta">
          <i><span class="pub-authors">${authorsHtml}</span></i>
          ${year ? `<span class="text-muted"> · ${escapeHtml(year)}</span>` : ""}
          ${venue ? `<span class="text-muted"> · ${escapeHtml(venue)}</span>` : ""}
        </div>
        ${renderLinks(tags)}
      `;

      container.appendChild(item);
    }
  } catch (e) {
    container.innerHTML = `<p class="text-danger">Failed to load publications.</p>`;
    console.error(e);
  }
});