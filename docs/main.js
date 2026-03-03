const SUMMARY_URL = "data/emoji_summary.json";
const BOX_URL = "data/emoji_scores_expanded.json";

const tableBody = document.querySelector("#emoji-table tbody");
const searchInput = document.querySelector("#table-search");
const buildDateEl = document.querySelector("#build-date");

let summaryData = [];
let expandedData = [];
let sortKey = "count";
let sortDirection = "desc";
let filterQuery = "";

const numberFormatter = new Intl.NumberFormat("en-US");
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const sentimentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

async function loadData() {
  const [summaryResp, boxResp] = await Promise.all([fetch(SUMMARY_URL), fetch(BOX_URL)]);
  summaryData = await summaryResp.json();
  expandedData = await boxResp.json();

  buildDateEl.textContent = new Date().toLocaleDateString();
  attachSortHandlers();
  attachSearchHandler();
  renderTable();
  renderBoxplot();
}

function attachSortHandlers() {
  document.querySelectorAll("#emoji-table thead th").forEach((th) => {
    const key = th.dataset.sort;
    if (!key) return;
    th.addEventListener("click", () => {
      if (sortKey === key) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDirection = key === "rank" ? "asc" : "desc";
      }
      renderTable();
    });
  });
}

function attachSearchHandler() {
  searchInput.addEventListener("input", () => {
    filterQuery = searchInput.value.trim().toLowerCase();
    renderTable();
  });
}

function filterData() {
  if (!filterQuery) {
    return [...summaryData];
  }

  return summaryData.filter(
    (item) =>
      item.emoji.includes(filterQuery) ||
      item.name.toLowerCase().includes(filterQuery) ||
      item.name.replace(/\s+/g, "").includes(filterQuery.replace(/\s+/g, ""))
  );
}

function sortData(data) {
  if (sortKey === "rank") {
    return data;
  }

  return data.sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    if (typeof a[sortKey] === "number") {
      return (a[sortKey] - b[sortKey]) * dir;
    }
    return a[sortKey].localeCompare(b[sortKey]) * dir;
  });
}

function renderTable() {
  const filtered = filterData();
  const sorted = sortData(filtered);

  tableBody.innerHTML = sorted
    .map((item, idx) => {
      const rank = idx + 1;
      return `
        <tr>
          <td class="metric">${rank}</td>
          <td class="emoji-cell" title="${item.name}">${item.emoji}</td>
          <td class="metric">${sentimentFormatter.format(item.sentiment_score)}</td>
          <td class="metric">${numberFormatter.format(item.count)}</td>
          <td class="metric">${percentFormatter.format(item.pos_ratio)}</td>
          <td class="metric">${percentFormatter.format(item.neu_ratio)}</td>
          <td class="metric">${percentFormatter.format(item.neg_ratio)}</td>
          <td class="metric">${sentimentFormatter.format(item.confidence_interval)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderBoxplot() {

  fetch(SUMMARY_URL)
  .then(response => response.json())
  .then(emojiData => {

    const colors = [
    "#d73027",
    "#f46d43",
    "#ffa500",
    "#ffff65",
    "#a6d96a",
    "#66bd63",
    "#1a9850"
  ];

  const categories = ["1","2","3","4","5","6","7"];
  const categoryNames = ["very negative","negative","somewhat negative","neutral","somewhat positive","positive","very positive"];


  const traces = categories.map((cat, i) => ({
    y: emojiData.map(d => d.emoji),
    x: emojiData.map(d => d.counts[cat] || 0),
    customdata: emojiData.map(d => d.counts[cat] || 0),
    name: ` ${categoryNames[i]} (${cat})`,
    type: "bar",
    orientation: "h",
    marker: { color: colors[i] },
    hovertemplate:
      "Emoji: %{y}<br>" +
      "Rating: " + cat + "<br>" +
      "Percentage: %{x:.1f}%<br>" +
      "Frequency: %{customdata}<extra></extra>"
  }));

  const shapes = emojiData.map((d, i) => {
  const center = (d.sentiment_score + 1) * 50;
  const ci = d.confidence_interval;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  return {
      type: "rect",
      xref: "x",
      yref: "y",
      x0: clamp(center + ci*100, 0, 100),
      x1: clamp(center - ci*100, 0, 100),
      y0: i - 0.4,
      y1: i + 0.4,
      fillcolor: "black",
      opacity: 0.6,
      line: { width: 0 },
      layer: "above"
      };
  });

  const layout = {
    barmode: "stack",
    barnorm: "percent",
    title: "Emoji Sentiment Distribution",
    height: 6000,
    margin: { l: 250 },
    xaxis: {
      title: "Percentage",
      showgrid: false
    },
    yaxis: {
      autorange: "reversed",
      automargin: true
    },
    shapes: shapes
  };


  Plotly.newPlot("boxplot-chart", traces, layout, { responsive: true });
})
}

loadData().catch((error) => {
  console.error("Failed to load emoji data", error);
});

