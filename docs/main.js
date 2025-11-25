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
  const categoryOrder = summaryData
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((row) => row.emoji);

  const trace = {
    type: "box",
    orientation: "h",
    x: expandedData.map((row) => row.score),
    y: expandedData.map((row) => row.emoji),
    marker: { color: "rgba(72, 104, 255, 0.35)" },
    line: { color: "rgba(72, 104, 255, 0.9)" },
    hovertemplate: "%{y}: score %{x}<extra></extra>",
    boxpoints: "outliers",
    jitter: 0,
    whiskerwidth: 0.4,
    quartilemethod: "inclusive",
    meanline: { visible: true, width: 2, color: "rgba(72, 104, 255, 1)" },
    boxmean: true,
  };

  const layout = {
    title: { text: "Emoji Sentiment Boxplot", font: { size: 20 } },
    margin: { l: 140, r: 20, t: 60, b: 60 },
    xaxis: {
      side: "top",
      tickmode: "array",
      tickvals: [1, 2, 3, 4, 5, 6, 7],
      ticktext: [
        "1 · Very negative",
        "2 · Negative",
        "3 · Somewhat negative",
        "4 · Neutral",
        "5 · Somewhat positive",
        "6 · Positive",
        "7 · Very positive",
      ],
      range: [0.5, 7.5],
    },
    yaxis: {
      categoryorder: "array",
      categoryarray: categoryOrder,
      automargin: true,
      autorange: "reversed",
    },
    height: 200 + categoryOrder.length * 28,
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
  };

  Plotly.newPlot("boxplot-chart", [trace], layout, { responsive: true });
}

loadData().catch((error) => {
  console.error("Failed to load emoji data", error);
});

