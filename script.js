// script.js
let sceneNumber = 1;
let selectedMetric = "mental_health_score";
let dataset = [];
const width = 800, height = 500, margin = { top: 50, right: 40, bottom: 50, left: 60 };

const svg = d3.select("#viz")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

function clearSVG() {
  svg.selectAll("*").remove();
}

d3.csv("data/digital_diet_mental_health.csv").then(data => {
  dataset = data.map(d => ({
    userId: d.user_id,
    gender: d.gender,
    screenTime: +d.daily_screen_time_hours,
    moodRating: +d.mood_rating,
    stressLevel: +d.stress_level,
    mentalHealth: +d.mental_health_score
  })).filter(d => !isNaN(d.screenTime) && !isNaN(d.moodRating) && !isNaN(d.stressLevel) && !isNaN(d.mentalHealth));

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

function genderColor(gender) {
  if (gender.toLowerCase().includes("male")) return "#42a5f5";
  if (gender.toLowerCase().includes("female")) return "#ec407a";
  return "#7e57c2";
}

function drawScene1() {
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, 10]).range([height - margin.bottom, margin.top]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(dataset)
    .enter().append("circle")
    .attr("cx", d => x(d.screenTime))
    .attr("cy", d => y(d.moodRating))
    .attr("r", 4)
    .attr("fill", d => genderColor(d.gender))
    .append("title")
    .text(d => `Screen Time: ${d.screenTime}h\nMood: ${d.moodRating}\nGender: ${d.gender}`);

  const annotations = d3.annotation()
    .annotations([{
      note: { label: "Mood worsens after 6h", title: "Mood Decline" },
      x: x(7),
      y: y(4),
      dx: 60,
      dy: -70
    }]);

  svg.append("g").call(annotations);
}

function drawScene2() {
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, 10]).range([height - margin.bottom, margin.top]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(dataset)
    .enter().append("circle")
    .attr("cx", d => x(d.screenTime))
    .attr("cy", d => y(d.stressLevel))
    .attr("r", 4)
    .attr("fill", d => genderColor(d.gender))
    .append("title")
    .text(d => `Screen Time: ${d.screenTime}h\nStress: ${d.stressLevel}\nGender: ${d.gender}`);

  const annotations = d3.annotation()
    .annotations([{
      note: { label: "Stress spikes beyond 6h", title: "Elevated Stress" },
      x: x(7),
      y: y(7),
      dx: 50,
      dy: -50
    }]);

  svg.append("g").call(annotations);
}

function drawScene3() {
  const x = d3.scaleLinear().domain([0, 12]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, 10]).range([height - margin.bottom, margin.top]);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  svg.selectAll("circle")
    .data(dataset)
    .enter().append("circle")
    .attr("cx", d => x(d.screenTime))
    .attr("cy", d => y(d.mentalHealth))
    .attr("r", 4)
    .attr("fill", d => genderColor(d.gender))
    .append("title")
    .text(d => `Screen Time: ${d.screenTime}h\nMental Health Score: ${d.mentalHealth}\nGender: ${d.gender}`);

  const annotations = d3.annotation()
    .annotations([{
      note: { label: "Low scores common with higher screen time", title: "Mental Health Decrease" },
      x: x(8),
      y: y(3),
      dx: 50,
      dy: -40
    }]);

  svg.append("g").call(annotations);
}
