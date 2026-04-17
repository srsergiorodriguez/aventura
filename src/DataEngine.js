export default class DataEngine {
  constructor(options) {
    this.options = options;
    this.data = [];
    this.metaKeys = [];
  }

  // 1. Data Injection: Adds ind_ scenes to the standard scenes object
  setupDataScenes(scenes, data, metaKeys) {
    if (typeof d3 === 'undefined') {
      console.warn("Aventura: D3 library is required to use the Data Engine visualizations.");
      return scenes;
    }

    this.data = JSON.parse(JSON.stringify(data));
    this.metaKeys = metaKeys || [];

    for (const d of this.data) {
      if (d.ID === undefined) {
        console.error("Aventura: All data must have a unique 'ID' key.");
        break;
      }
      
      // Inject the individual item scene
      scenes[`ind_${d.ID}`] = {
        text: d.CONT || '',
        meta: d.ID, // We use this later to display the metaKeys (ficha técnica)
        dataScene: true, // Flags this so StoryUI knows to inject a "Go Back" button dynamically
        options: [] 
      };
      
      if (d.IMGURL) scenes[`ind_${d.ID}`].image = d.IMGURL;
      if (d.URL) scenes[`ind_${d.ID}`].url = d.URL;
    }

    return scenes;
  }

  // 2. Filter Logic
  _filterData(filterRules) {
    let filtered = this.data;
    if (!filterRules) return filtered;

    const parseBool = (v) => v === "true" ? true : v === "false" ? false : v;

    for (const f of filterRules) {
      const [key, comp, val] = f;
      const target = parseBool(val);
      
      if (comp === "=" || comp === "==" || comp === "===") {
        filtered = filtered.filter(d => parseBool(d[key]) == target);
      } else if (comp === "<") {
        filtered = filtered.filter(d => parseBool(d[key]) < target);
      } else if (comp === ">") {
        filtered = filtered.filter(d => parseBool(d[key]) > target);
      }
    }
    return filtered;
  }

  // 3. Visualization Router
  renderViz(vizConfig, width, height, onNavigate) {
    const filteredData = this._filterData(vizConfig.filter);
    
    if (vizConfig.type === 'compare') {
      return this._compareViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    } else if (vizConfig.type === 'scatter') {
      return this._scatterViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    } else if (vizConfig.type === 'pack') {
      return this._packViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    }
    return null;
  }

  // --- D3 SVG VISUALIZATIONS ---

  _compareViz(data, id1, id2, width, height, onNavigate) {
    const filtered = [data.find(d => d.ID == id1), data.find(d => d.ID == id2)].filter(Boolean);
    
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    const w = (width / 2) * 0.8;
    
    svg.selectAll("image")
      .data(filtered)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", w)
      .attr("x", (d, i) => (i * (width / 2)) + (width / 4) - (w / 2))
      .attr("y", height * 0.1)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    return svg.node();
  }

  _scatterViz(data, vx, vy, width, height, onNavigate) {
    const size = this.options.vizImageSize || 50;
    const margin = {l: 0.2 * width, r: 0.1 * width, t: 0.1 * height, b: 0.1 * height};
    const wm = width - margin.l - margin.r;
    const hm = height - margin.t - margin.b;

    const domainX = [...new Set(data.map(d => d[vx]))];
    const domainY = [...new Set(data.map(d => d[vy]))];
    
    const scaleX = d3.scalePoint().domain(domainX).range([0, wm]).padding(0.5).round(true);
    const scaleY = d3.scalePoint().domain(domainY).range([0, hm]).padding(0.5).round(true);

    // Initialize node positions
    const nodes = data.map(d => ({
      ...d,
      x: scaleX(d[vx]) + margin.l,
      y: scaleY(d[vy]) + margin.t
    }));

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    // Draw Axes
    const axes = svg.append("g").attr("fill", "var(--av-text)").attr("font-size", "14px").attr("text-anchor", "middle");
    domainX.forEach(d => axes.append("text").attr("x", margin.l + scaleX(d)).attr("y", margin.t + hm + 20).text(d));
    axes.append("line").attr("x1", margin.l).attr("y1", margin.t + hm).attr("x2", margin.l + wm).attr("y2", margin.t + hm).attr("stroke", "var(--av-text)");

    domainY.forEach(d => axes.append("text").attr("x", margin.l - 10).attr("y", margin.t + scaleY(d)).attr("text-anchor", "end").attr("dominant-baseline", "middle").text(d));
    axes.append("line").attr("x1", margin.l).attr("y1", margin.t).attr("x2", margin.l).attr("y2", margin.t + hm).attr("stroke", "var(--av-text)");

    // Draw Nodes
    const nodeGroup = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", size)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    // Physics Simulation (Live Animation!)
    d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(5))
      .force("collide", d3.forceCollide(size * 0.6))
      .on("tick", () => {
        nodeGroup
          .attr("x", d => d.x - (size/2))
          .attr("y", d => d.y - (size/2));
      });

    return svg.node();
  }

  _packViz(data, h1, h2, width, height, onNavigate) {
    const size = this.options.vizImageSize || 40;
    
    const groups = d3.rollup(data, v => v.length, d => d[h1], d => d[h2]);
    const root = d3.hierarchy(groups, ([key, value]) => value.size && Array.from(value))
      .sum(([,value]) => value)
      .sort((a, b) => b.value - a.value);

    d3.pack().size([width, height]).padding(20)(root);

    // Map leaves back to data
    const nodes = [];
    for (const f of data) {
      for (const d of root.leaves()) {
        if (f[h1] === d.parent.data[0] && f[h2] === d.data[0]) {
          nodes.push({ ...f, targetX: d.x, targetY: d.y });
        }
      }
    }

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    // Draw bounding circles
    const scheme = ["rgba(0,0,0,0)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.1)"];
    svg.append("g")
      .selectAll("circle")
      .data(root.descendants())
      .join("circle")
      .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
      .attr("fill", d => scheme[d.depth] || scheme[2])
      .attr("stroke", "var(--av-text)")
      .attr("stroke-opacity", 0.2);

    // Labels
    svg.append("g").attr("fill", "var(--av-text)").attr("font-size", "12px").attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants().filter(d => d.depth === 1 || d.depth === 2))
      .join("text")
      .attr("x", d => d.x).attr("y", d => d.y - d.r - 5)
      .text(d => d.data[0]);

    // Draw Nodes
    const nodeGroup = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", size)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    // Physics Simulation (Live Animation!)
    d3.forceSimulation(nodes)
      .force("x", d3.forceX(d => d.targetX).strength(0.5))
      .force("y", d3.forceY(d => d.targetY).strength(0.5))
      .force("collide", d3.forceCollide(size * 0.6))
      .on("tick", () => {
        nodeGroup
          .attr("x", d => d.x - (size/2))
          .attr("y", d => d.y - (size/2));
      });

    return svg.node();
  }
}