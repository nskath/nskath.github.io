// script.js
let sceneNumber = 1;
let selectedMetric = "Anxiety";
let dataset = [];
const width = 800, height = 500, margin = { top: 50, right: 40, bottom: 50, left: 60 };

const svg = d3.select("#viz")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Scene containers (reused)
function clearSVG() {
  svg.selectAll("*").remove();
}

// Load the data (linked to real CSV structure)
d3.csv("data/digital_diet_mental_health.csv").then(data => {
  dataset = data.map(d => ({
    screenTime: +d["Daily Screen Time (hours)"],
    anxiety: +d["Do you often feel anxious or stressed? (0 - No, 1 - Yes)"],
    depression: +d["Have you ever felt symptoms of depression? (0 - No, 1 - Yes)"],
  })).filter(d => !isNaN(d.screenTime));

  updateScene(sceneNumber);
});

function updateScene(scene) {
  clearSVG();

  if (scene === 1) drawScene1();
  else if (scene === 2) drawScene2();
  else drawScene3();

  document.getElementById("metricSelectLabel").style.display = (scene === 3) ? "inline" : "none";
}

document.getElementById("nextBtn").addEventListener("click", () => {
  sceneNumber = Math.min(sceneNumber + 1, 3);
  updateScene(sceneNumber);
});

document.getElementById("metricSelect").addEventListener("change", (e) => {
  selectedMetric = e.target.value;
  updateScene(sceneNumber);
});

function drawScene1() {
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const bins = d3.bin().value(d => d.screenTime).thresholds(x.ticks(12))(dataset);
  const y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(bins)
    .enter().append("rect")
    .attr("x", d => x(d.x0) + 1)
    .attr("y", d => y(d.length))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", d => y(0) - y(d.length))
    .attr("fill", "#2196f3");

  const annotations = d3.annotation()
    .annotations([{
      note: { label: "Majority over 4 hours daily", title: "Heavy Usage" },
      x: x(5),
      y: y(d3.max(bins, d => d.length)),
      dx: 40,
      dy: -70
    }]);

  svg.append("g").call(annotations);
}

function drawScene2() {
  const grouped = d3.rollups(dataset, v => ({
    anxiety: d3.mean(v, d => d.anxiety),
    depression: d3.mean(v, d => d.depression)
  }), d => Math.floor(d.screenTime));

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, 1])
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d => d + "h"));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  svg.selectAll(".bar.anxiety")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar anxiety")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1].anxiety))
    .attr("width", x.bandwidth() / 2)
    .attr("height", d => y(0) - y(d[1].anxiety))
    .attr("fill", "#f44336");

  svg.selectAll(".bar.depression")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar depression")
    .attr("x", d => x(d[0]) + x.bandwidth() / 2)
    .attr("y", d => y(d[1].depression))
    .attr("width", x.bandwidth() / 2)
    .attr("height", d => y(0) - y(d[1].depression))
    .attr("fill", "#9c27b0");

  const annotations = d3.annotation()
    .annotations([{
      note: { label: "Symptoms increase beyond 4h", title: "Risk Threshold" },
      x: x(5),
      y: y(0.4),
      dx: 50,
      dy: -60
    }]);

  svg.append("g").call(annotations);
}

function drawScene3() {
  const yMetric = selectedMetric.toLowerCase();
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(dataset)
    .enter().append("circle")
    .attr("cx", d => x(d.screenTime))
    .attr("cy", d => y(d[yMetric]))
    .attr("r", 4)
    .attr("fill", "#4caf50")
    .append("title")
    .text(d => `Screen Time: ${d.screenTime}h\n${selectedMetric}: ${d[yMetric]}`);
}
