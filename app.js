const DATASET = "Datasets/bbc_news_preprocessed_UMAP.csv";
const plotConfig = { responsive: true, displayModeBar: false };
const stopWords = new Set("a about after all also an and are as at be been being but by can could do for from had has have he her his how i in into is it its more new not of on one or our out over said she so some than that the their them there they this to two up was we were what when where which who will with would you your".split(" "));
const topicGroups = new Map();
let topics = [];

const topicColor = topic => `hsla(${topic * 137.5 % 360}, 65%, 48%, .7)`;
const baseLayout = title => ({
  template: "simple_white",
  title: { text: title, x: .5, font: { size: 15 } },
  font: { size: 10, color: "black" }
});

function drawHistogram(data, title) {
  const counts = data.reduce((months, article) => {
    months.set(article.shortPubDate, (months.get(article.shortPubDate) || 0) + 1);
    return months;
  }, new Map());
  const dates = [...counts.keys()].sort();

  Plotly.react("histogram", [{
    type: "bar",
    x: dates,
    y: dates.map(date => counts.get(date)),
    marker: { color: "red" },
    hovertemplate: "Publication Date: %{x}<br>Document Count: %{y}<extra></extra>"
  }], {
    ...baseLayout(title),
    xaxis: { title: "Publication Date (Month)" },
    yaxis: { title: "Document Count" }
  }, plotConfig);
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function drawWordCloud(topicName, articles) {
  const svg = document.querySelector("#cloud svg");
  const frequencies = new Map();

  articles.forEach(article => {
    const words = article.docs.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    words.forEach(word => {
      if (!stopWords.has(word)) frequencies.set(word, (frequencies.get(word) || 0) + 1);
    });
  });

  document.querySelector("#cloud p").textContent = `Word Cloud - ${topicName}`;
  document.querySelector("#cloud img").style.display = "none";
  svg.style.display = "block";

  const words = [...frequencies].sort((a, b) => b[1] - a[1]).slice(0, 42);
  const maxFrequency = words[0][1];
  const boxes = [];

  svg.innerHTML = words.map(([word, count], index) => {
    const size = 11 + 42 * Math.pow(count / maxFrequency, .65);
    const rotation = index > 8 && index % 9 === 0 ? 90 : 0;
    let x, y, box;

    for (let step = 0; step < 500; step++) {
      const angle = step * .38;
      const radius = step * .65;
      x = 300 + Math.cos(angle) * radius * 1.5;
      y = 175 + Math.sin(angle) * radius * .8;
      const width = rotation ? size : word.length * size * .55;
      const height = rotation ? word.length * size * .55 : size;
      box = {
        left: x - width / 2 - 3,
        right: x + width / 2 + 3,
        top: y - height / 2 - 3,
        bottom: y + height / 2 + 3
      };

      const inside = box.left > 5 && box.right < 595 && box.top > 5 && box.bottom < 345;
      if (inside && !boxes.some(placed => overlaps(box, placed))) {
        boxes.push(box);
        break;
      }
      box = null;
    }

    if (!box) return "";
    return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${index < 8 ? 700 : 400}" fill="hsl(${8 + index * 1.2}, ${85 - index % 3 * 12}%, ${34 + index % 4 * 9}%)" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation} ${x} ${y})">${word}</text>`;
  }).join("");
}

function selectTopic(topicName) {
  const articles = topicGroups.get(topicName);
  drawHistogram(articles, `Document Count by Month - ${topicName}`);
  drawWordCloud(topicName, articles);

  Plotly.restyle("umap", {
    "marker.opacity": topics.map(([name]) => name === topicName ? 1 : .08),
    "marker.size": topics.map(([name]) => name === topicName ? 8 : 5)
  });
}

Papa.parse(DATASET, {
  download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
  complete: ({ data }) => {
    data.forEach(article => {
      if (!topicGroups.has(article.topicName)) topicGroups.set(article.topicName, []);
      topicGroups.get(article.topicName).push(article);
    });

    topics = [...topicGroups.entries()].sort((a, b) => a[1][0].topics - b[1][0].topics);
    const traces = topics.map(([name, articles]) => ({
      type: "scattergl",
      mode: "markers",
      name,
      x: articles.map(article => article.x),
      y: articles.map(article => article.y),
      text: articles.map(article => `${article.title}<br>${article.description}`),
      customdata: articles.map(() => name),
      hoverinfo: "text",
      marker: { color: topicColor(articles[0].topics), size: 6 }
    }));
    const annotations = topics.map(([text, articles]) => ({
      text,
      showarrow: false,
      x: articles.reduce((sum, article) => sum + article.x, 0) / articles.length,
      y: articles.reduce((sum, article) => sum + article.y, 0) / articles.length
    }));

    Plotly.newPlot("umap", traces, {
      ...baseLayout("Documents and Topics"),
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations
    }, plotConfig);

    drawHistogram(data, "Document Count by Month - All Topics");
    document.querySelector("#umap").on("plotly_click", event => selectTopic(event.points[0].customdata));
    document.querySelector("#umap").on("plotly_doubleclick", () =>
      Plotly.restyle("umap", { "marker.opacity": 1, "marker.size": 6 })
    );
  }
});
