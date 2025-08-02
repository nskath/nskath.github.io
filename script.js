let sceneNumber = 1;
let selectedMetric = "mentalHealthRating";
let dataset = [];
const width = 800, height = 500, margin = { top: 50, right: 40, bottom: 50, left: 60 };

const svg = d3.select("#viz")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

function clearSVG() {
  svg.selectAll("*").remove();
}

d3.csv("data/mental_health_and_technology_usage_2024.csv").then(data => {
  dataset = data.map(d => ({
    id: d.id,
    age: +d.age,
    gender: d.gender,
    dailyHoursOnTech: +d.daily_hours_on_technology,
    mentalHealthRating: +d.mental_health_rating,
    productivity: +d.productivity_score,
    sleepHours: +d.sleep_hours,
    stressLevel: +d.stress_level,
    socialMediaUse: d.social_media_use
  })).filter(d => !isNaN(d.dailyHoursOnTech));

  updateScene(sceneNumber);
});

function updateScene(scene) {
  clearSVG();
  if (scene === 1) drawIntro();
  else if (scene === 2) drawBinnedBar("dailyHoursOnTech", "mentalHealthRating", "Higher Tech Use Correlates With Lower Mental Health", "Avg Mental Health Rating");
  else if (scene === 3) drawBinnedBar("dailyHoursOnTech", "stressLevel", "Stress Level Increases With Tech Use", "Avg Stress Level");
  else if (scene === 4) drawBinnedBar("dailyHoursOnTech", "sleepHours", "More Tech Use Means Less Sleep", "Avg Sleep Hours");
  else drawInteractiveScene();
  document.getElementById("metricSelectLabel").style.display = (scene === 5) ? "inline" : "none";
}

document.getElementById("nextBtn").addEventListener("click", () => {
  sceneNumber = Math.min(sceneNumber + 1, 5);
  updateScene(sceneNumber);
});

document.getElementById("metricSelect").addEventListener("change", (e) => {
  selectedMetric = e.target.value;
  updateScene(sceneNumber);
});

function drawIntro() {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 - 30)
    .attr("text-anchor", "middle")
    .style("font-size", "22px")
    .style("font-weight", "bold")
    .text("How Technology Use Impacts Mental Health");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Explore how screen time relates to stress, sleep, and well-being.");
}

function drawBinnedBar(xKey, yKey, title, yAxisLabel) {
  const binSize = 1;
  const bins = d3.bin()
    .domain([0, d3.max(dataset, d => d[xKey])])
    .thresholds(d3.range(0, d3.max(dataset, d => d[xKey]) + binSize, binSize))
    .value(d => d[xKey])(dataset);

  const binAverages = bins.map(bin => ({
    bin: bin.x0,
    avg: d3.mean(bin, d => d[yKey])
  })).filter(d => !isNaN(d.avg));

  const x = d3.scaleBand()
    .domain(binAverages.map(d => d.bin))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(binAverages, d => d.avg)]).nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(title);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d => `${d}-${+d + binSize}`));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 15)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(yAxisLabel);

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height - 10})`)
    .style("text-anchor", "middle")
    .text("Daily Tech Usage (hours)");

  svg.selectAll("rect")
    .data(binAverages)
    .enter().append("rect")
    .attr("x", d => x(d.bin))
    .attr("y", d => y(d.avg))
    .attr("width", x.bandwidth())
    .attr("height", d => height - margin.bottom - y(d.avg))
    .attr("fill", "#42a5f5");
}

function drawInteractiveScene() {
  drawBinnedBar("dailyHoursOnTech", selectedMetric, `Tech Use vs ${metricLabel(selectedMetric)}`, metricLabel(selectedMetric));
}

function metricLabel(metricKey) {
  const labels = {
    mentalHealthRating: "Mental Health Rating",
    productivity: "Productivity Score",
    sleepHours: "Sleep Hours",
    stressLevel: "Stress Level"
  };
  return labels[metricKey] || metricKey;
}