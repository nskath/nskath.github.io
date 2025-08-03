let currentScene = 1;
let globalData = [];
let currentYear = 2022;
let selectedCountry = 'all';
let isDataLoaded = false;

async function loadData() {
    try {
        const csvUrl = 'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';        
        const response = await fetch(csvUrl);        
        const csvText = await response.text();
        const rawData = d3.csvParse(csvText);
        
        globalData = rawData
            .filter(d => {
                return d.year >= 1960 && d.year <= 2022 && d.co2 && d.population &&
                       d.iso_code && d.iso_code.length === 3 && 
                       !d.country.includes('income') && !d.country.includes('(') && d.country !== 'World';
            })
            .map(d => ({
                year: +d.year,
                country: d.country,
                emissions: +d.co2,
                population: +d.population,
                perCapita: +d.co2_per_capita || 0
            }))
            .filter(d => !isNaN(d.emissions) && !isNaN(d.population) && d.emissions > 0);
                
        isDataLoaded = true;
        showScene(currentScene);

    } catch (error) {
        console.error('Error');
    }
}

function showErrorMessage(message) {
    d3.selectAll('svg').selectAll('*').remove();
    d3.selectAll('svg').append('text').attr('x', 400).attr('y', 200).attr('text-anchor', 'middle')
        .attr('fill', '#ef4444').attr('font-size', '18px').text(message);
}

function getGlobalTotals() {
    const yearTotals = d3.rollup(globalData, v => d3.sum(v, d => d.emissions), d => d.year);
    return Array.from(yearTotals, ([year, emissions]) => ({year, emissions})).sort((a, b) => a.year - b.year);
}

function getTopCountries(year = 2022) {
    return globalData.filter(d => d.year === year).sort((a, b) => b.emissions - a.emissions).slice(0, 12);
}

function showScene(sceneNum) {
    d3.selectAll('.scene').classed('active', false);
    d3.select(`#scene${sceneNum}`).classed('active', true);
    currentScene = sceneNum;
    
    switch(sceneNum) {
        case 1: renderIntroChart(); break;
        case 2: renderTrendChart(); break;
        case 3: renderContributorsChart(); break;
        case 4: renderExploreChart(); setupExploreControls(); break;
    }
}
function nextScene() { if (currentScene < 4) showScene(currentScene + 1); }
function prevScene() { if (currentScene > 1) showScene(currentScene - 1); }

function renderIntroChart() {
    const svg = d3.select('#intro-chart');
    svg.selectAll('*').remove();
    
    const width = 800, height = 350;
    const globalTotals = getGlobalTotals();
    
    
    const startEmissions = globalTotals[0]?.emissions || 0;
    const endEmissions = globalTotals[globalTotals.length - 1]?.emissions || 0;
    const growthFactor = (endEmissions / startEmissions).toFixed(1);
    
    svg.append('text').attr('x', width / 2).attr('y', 30).attr('text-anchor', 'middle')
        .attr('fill', '#3b82f6').attr('font-size', '20px').attr('font-weight', 'bold')
        .text('Global CO₂ Emissions Overview');
    
    const margin = {top: 60, right: 40, bottom: 80, left: 60};
    const chartWidth = 400, chartHeight = 140;
    const chartG = svg.append('g').attr('transform', `translate(${(width - chartWidth) / 2 - 20}, ${margin.top})`);
    
    const xScale = d3.scaleLinear().domain([1960, 2022]).range([0, chartWidth]);
    const yScale = d3.scaleLinear().domain([0, d3.max(globalTotals, d => d.emissions)]).range([chartHeight, 0]);
    
    chartG.append('g').attr('class', 'axis').attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    chartG.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    
    chartG.append('text').attr('x', chartWidth / 2).attr('y', chartHeight + 35)
        .attr('text-anchor', 'middle').attr('fill', '#cbd5e1').attr('font-size', '12px').text('Year');
    chartG.append('text').attr('transform', 'rotate(-90)').attr('y', -40).attr('x', -chartHeight / 2)
        .attr('text-anchor', 'middle').attr('fill', '#cbd5e1').attr('font-size', '12px')
        .text('CO₂ (Billion Tons)');
    
    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.emissions)).curve(d3.curveMonotoneX);
    chartG.append('path').datum(globalTotals).attr('fill', 'none').attr('stroke', '#60a5fa')
        .attr('stroke-width', 3).attr('d', line);
    
    chartG.selectAll('.intro-point').data(globalTotals.filter((d, i) => i % 5 === 0))
        .enter().append('circle').attr('class', 'intro-point')
        .attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.emissions)).attr('r', 3)
        .attr('fill', '#60a5fa').attr('stroke', 'white').style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            showTooltip(event, `<strong>${d.year}</strong><br>${d.emissions.toFixed(1)} billion tons CO₂`);
        })
        .on('mouseout', hideTooltip);
    
    const statsY = margin.top + chartHeight + 70;
    const stats = [
        { label: '1960 Emissions', value: `${startEmissions.toFixed(0)}B`, x: width / 2 - 120 },
        { label: '2022 Emissions', value: `${endEmissions.toFixed(0)}B`, x: width / 2 },
        { label: 'Growth Factor', value: `${growthFactor}x`, x: width / 2 + 120 }
    ];
    
    stats.forEach(stat => {
        const g = svg.append('g');
        g.append('rect').attr('x', stat.x - 50).attr('y', statsY - 20).attr('width', 100).attr('height', 45)
            .attr('fill', 'rgba(59, 130, 246, 0.15)').attr('stroke', '#3b82f6').attr('rx', 5);
        g.append('text').attr('x', stat.x).attr('y', statsY - 5).attr('text-anchor', 'middle')
            .attr('fill', '#60a5fa').attr('font-size', '16px').attr('font-weight', 'bold').text(stat.value);
        g.append('text').attr('x', stat.x).attr('y', statsY + 12).attr('text-anchor', 'middle')
            .attr('fill', '#cbd5e1').attr('font-size', '10px').text(stat.label);
    });
}

function renderTrendChart() {
    const svg = d3.select('#trend-chart');
    svg.selectAll('*').remove();
    
    const width = 800, height = 400, margin = {top: 20, right: 30, bottom: 60, left: 80};
    const chartWidth = width - margin.left - margin.right, chartHeight = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const globalTotals = getGlobalTotals();
    
    if (globalTotals.length === 0) {
        g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight / 2).attr('text-anchor', 'middle')
            .attr('fill', '#ef4444').text('No data available');
        return;
    }
    
    const xScale = d3.scaleLinear().domain(d3.extent(globalTotals, d => d.year)).range([0, chartWidth]);
    const yScale = d3.scaleLinear().domain([0, d3.max(globalTotals, d => d.emissions)]).range([chartHeight, 0]);
    
    g.append('g').attr('class', 'grid').attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickSize(-chartHeight).tickFormat(''));
    g.append('g').attr('class', 'grid').call(d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(''));
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    
    g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight + 50).attr('text-anchor', 'middle')
        .attr('fill', '#cbd5e1').attr('font-size', '14px').text('Year');
    g.append('text').attr('transform', 'rotate(-90)').attr('y', -60).attr('x', -chartHeight / 2)
        .attr('text-anchor', 'middle').attr('fill', '#cbd5e1').attr('font-size', '14px')
        .text('CO₂ Emissions (Billion Tons)');
    
    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.emissions)).curve(d3.curveMonotoneX);
    g.append('path').datum(globalTotals).attr('fill', 'none').attr('stroke', '#3b82f6')
        .attr('stroke-width', 3).attr('d', line);
    
    const keyPoints = [
        {year: 1980, label: "Acceleration Begins"},
        {year: 2008, label: "Financial Crisis Dip"}, 
        {year: 2022, label: "Current Level"}
    ];
    
    keyPoints.forEach((point, i) => {
        const pointData = globalTotals.find(d => d.year === point.year);
        if (pointData) {
            g.append('circle').attr('class', 'annotation-circle')
                .attr('cx', xScale(pointData.year)).attr('cy', yScale(pointData.emissions)).attr('r', 5);
            const lineY = yScale(pointData.emissions) - 30 - (i * 25);
            g.append('line').attr('class', 'annotation-line')
                .attr('x1', xScale(pointData.year)).attr('y1', yScale(pointData.emissions))
                .attr('x2', xScale(pointData.year)).attr('y2', lineY);
            g.append('text').attr('class', 'chart-annotation').attr('x', xScale(pointData.year))
                .attr('y', lineY - 5).attr('text-anchor', 'middle').text(point.label);
        }
    });
    
    g.selectAll('.point').data(globalTotals.filter((d, i) => i % 3 === 0)).enter().append('circle')
        .attr('class', 'point').attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.emissions))
        .attr('r', 4).attr('fill', '#60a5fa').attr('stroke', 'white').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            showTooltip(event, `<strong>${d.year}</strong><br>${d.emissions.toLocaleString()} billion tons CO₂<br>Global Total`);
        })
        .on('mouseout', hideTooltip);
}

function renderContributorsChart() {
    const svg = d3.select('#contributors-chart');
    svg.selectAll('*').remove();
    
    const width = 800, height = 450, margin = {top: 20, right: 30, bottom: 90, left: 90};
    const chartWidth = width - margin.left - margin.right, chartHeight = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const topCountries = getTopCountries(2022);
    
    if (topCountries.length === 0) {
        g.append('text').attr('x', chartWidth / 2).attr('y', chartHeight / 2).attr('text-anchor', 'middle')
            .attr('fill', '#ef4444').text('No data available for 2022');
        return;
    }
    
    const xScale = d3.scaleBand().domain(topCountries.map(d => d.country)).range([0, chartWidth]).padding(0.15);
    const yScale = d3.scaleLinear().domain([0, d3.max(topCountries, d => d.emissions)]).range([chartHeight, 0]);
    const colorScale = d3.scaleSequential().domain([0, topCountries.length - 1]).interpolator(d3.interpolateViridis);
    
    g.append('g').attr('class', 'grid').call(d3.axisLeft(yScale).tickSize(-chartWidth).tickFormat(''));
    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale)).selectAll('text').attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end').attr('font-size', '10px');
    g.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    
    g.append('text').attr('transform', 'rotate(-90)').attr('y', -60).attr('x', -chartHeight / 2)
        .attr('text-anchor', 'middle').attr('fill', '#cbd5e1').attr('font-size', '14px')
        .text('CO₂ Emissions (Billion Tons)');
    
    g.selectAll('.bar').data(topCountries).enter().append('rect').attr('class', 'bar')
        .attr('x', d => xScale(d.country)).attr('width', xScale.bandwidth())
        .attr('y', d => yScale(d.emissions)).attr('height', d => chartHeight - yScale(d.emissions))
        .attr('fill', (d, i) => colorScale(i)).style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            showTooltip(event, `<strong>${d.country}</strong><br>${d.emissions.toLocaleString()} billion tons CO₂<br>${d.perCapita.toFixed(1)} tons per capita<br>Population: ${(d.population/1000000).toFixed(0)}M`);
        })
        .on('mouseout', hideTooltip);
    
    g.selectAll('.bar-label').data(topCountries.slice(0, 5)).enter().append('text')
        .attr('class', 'bar-label').attr('x', d => xScale(d.country) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.emissions) - 8).attr('text-anchor', 'middle').attr('fill', '#60a5fa')
        .attr('font-size', '11px').attr('font-weight', 'bold').text(d => d.emissions.toLocaleString());
}

function renderExploreChart() {
    const svg = d3.select('#explore-chart');
    svg.selectAll('*').remove();
    svg.append('g').attr('transform', 'translate(80,50)');
    updateExploreChart();
}

function updateExploreChart() {
    const svg = d3.select('#explore-chart g');
    svg.selectAll('*').remove();
    
    let data = selectedCountry === 'all' ? 
        getGlobalTotals().filter(d => d.year <= currentYear) : 
        globalData.filter(d => d.country === selectedCountry && d.year <= currentYear);
    
    if (data.length === 0) {
        svg.append('text').attr('x', 320).attr('y', 150).attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8').attr('font-size', '16px').text(`No data available for ${selectedCountry}`);
        return;
    }
    
    const width = 640, height = 300;
    const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.emissions)]).range([height, 0]);
    
    svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''));
    svg.append('g').attr('class', 'grid').call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    svg.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    
    svg.append('text').attr('x', width / 2).attr('y', height + 40).attr('text-anchor', 'middle')
        .attr('fill', '#cbd5e1').attr('font-size', '12px').text('Year');
    svg.append('text').attr('transform', 'rotate(-90)').attr('y', -50).attr('x', -height / 2)
        .attr('text-anchor', 'middle').attr('fill', '#cbd5e1').attr('font-size', '12px')
        .text('CO₂ Emissions (Billion Tons)');
    svg.append('text').attr('x', width / 2).attr('y', -15).attr('text-anchor', 'middle')
        .attr('fill', '#60a5fa').attr('font-size', '14px').attr('font-weight', 'bold')
        .text(selectedCountry === 'all' ? `Global CO₂ Emissions (1960-${currentYear})` : `${selectedCountry} CO₂ Emissions (1960-${currentYear})`);
    
    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.emissions)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('fill', 'none')
        .attr('stroke', selectedCountry === 'all' ? '#3b82f6' : '#ef4444').attr('stroke-width', 2).attr('d', line);
    
    svg.selectAll('.explore-point').data(data.filter((d, i) => i % 2 === 0)).enter().append('circle')
        .attr('class', 'explore-point').attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.emissions))
        .attr('r', 4).attr('fill', selectedCountry === 'all' ? '#60a5fa' : '#f87171')
        .attr('stroke', 'white').attr('stroke-width', 1).style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            const tooltipText = selectedCountry === 'all' ? 
                `<strong>Global Total (${d.year})</strong><br>${d.emissions.toLocaleString()} billion tons CO₂` :
                `<strong>${d.country} (${d.year})</strong><br>${d.emissions.toLocaleString()} billion tons CO₂<br>${d.perCapita ? d.perCapita.toFixed(1) + ' tons per capita' : ''}`;
            showTooltip(event, tooltipText);
        })
        .on('mouseout', hideTooltip);
}

function setupExploreControls() {    
    const countries = [...new Set(globalData.map(d => d.country))].sort();
    const select = d3.select('#country-select');
    select.selectAll('option:not([value="all"])').remove();
    select.selectAll('option.country-option').data(countries).enter().append('option')
        .attr('class', 'country-option').attr('value', d => d).text(d => d);
    
    const yearExtent = d3.extent(globalData, d => d.year);
    const yearSlider = d3.select('#year-range');
    yearSlider.attr('min', yearExtent[0]).attr('max', yearExtent[1]).attr('value', yearExtent[1]);
    currentYear = yearExtent[1];
    d3.select('#year-display').text(currentYear);
    
    select.on('change', function() { selectedCountry = this.value; updateExploreChart(); });
    yearSlider.on('input', function() { currentYear = +this.value; d3.select('#year-display').text(currentYear); updateExploreChart(); });
}

function resetExploration() {
    selectedCountry = 'all';
    d3.select('#country-select').property('value', 'all');
    d3.select('#year-display').text(currentYear);
    updateExploreChart();
}

function showTooltip(event, text) {
    d3.select('#tooltip').style('display', 'block').style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px').html(text);
}

function hideTooltip() { d3.select('#tooltip').style('display', 'none'); }

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});