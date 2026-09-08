"""
visualize.py
-------------
Produces investigator-facing visual outputs:
  1. An interactive HTML link-chart (D3 force-directed graph) - node size by
     influence score, color by entity type, edge thickness by evidence weight.
  2. A static bar chart of top key players (matplotlib) for inclusion in
     PDF/Word case reports.
"""

from __future__ import annotations
import json
import networkx as nx
import matplotlib.pyplot as plt

TYPE_COLORS = {
    "PERSON": "#e63946",
    "ORG": "#457b9d",
    "LOCATION": "#2a9d8f",
    "VEHICLE": "#f4a261",
    "PHONE": "#8d99ae",
    "MONEY": "#6a4c93",
}

HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Criminal Network Link Chart</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<style>
  body {{ margin:0; font-family: -apple-system, Arial, sans-serif; background:#0f1117; color:#eee; }}
  #header {{ padding: 14px 20px; background:#161a23; border-bottom:1px solid #2a2f3a; }}
  #header h1 {{ font-size:16px; margin:0; }}
  #header p {{ font-size:12px; color:#9aa; margin:4px 0 0; }}
  .legend {{ display:flex; gap:14px; padding:8px 20px; font-size:11px; flex-wrap:wrap; }}
  .legend span {{ display:inline-flex; align-items:center; gap:5px; }}
  .swatch {{ width:10px; height:10px; border-radius:50%; display:inline-block; }}
  svg {{ width:100vw; height:calc(100vh - 90px); background:#0f1117; }}
  .link {{ stroke:#555; }}
  .node text {{ fill:#eee; font-size:10px; pointer-events:none; }}
  .tooltip {{ position:absolute; background:#1c2029; border:1px solid #333; padding:6px 10px;
              border-radius:6px; font-size:12px; pointer-events:none; opacity:0; }}
</style>
</head>
<body>
<div id="header">
  <h1>Criminal Network Analysis - Link Chart</h1>
  <p>Node size = investigative influence score &nbsp;|&nbsp; edge thickness = number of corroborating records</p>
</div>
<div class="legend">{legend_html}</div>
<div class="tooltip" id="tooltip"></div>
<svg></svg>
<script>
const graph = {graph_json};

const svg = d3.select("svg");
const width = window.innerWidth, height = window.innerHeight - 90;
const tooltip = d3.select("#tooltip");

const sim = d3.forceSimulation(graph.nodes)
  .force("link", d3.forceLink(graph.links).id(d => d.id).distance(90).strength(0.4))
  .force("charge", d3.forceManyBody().strength(-260))
  .force("center", d3.forceCenter(width/2, height/2))
  .force("collide", d3.forceCollide(d => 8 + d.score*30));

const link = svg.append("g").selectAll("line")
  .data(graph.links).join("line")
  .attr("class","link")
  .attr("stroke-width", d => Math.min(1 + d.weight*1.5, 8));

const node = svg.append("g").selectAll("g")
  .data(graph.nodes).join("g")
  .call(d3.drag()
    .on("start", (e,d)=>{{ if(!e.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }})
    .on("drag", (e,d)=>{{ d.fx=e.x; d.fy=e.y; }})
    .on("end", (e,d)=>{{ if(!e.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }}));

node.append("circle")
  .attr("r", d => 6 + d.score*28)
  .attr("fill", d => d.color)
  .attr("stroke", "#fff").attr("stroke-width", 1)
  .on("mouseover", (e,d) => {{
      tooltip.style("opacity",1)
        .html(`<b>${{d.id}}</b><br/>type: ${{d.type}}<br/>influence score: ${{d.score.toFixed(3)}}`);
  }})
  .on("mousemove", (e) => tooltip.style("left", (e.pageX+12)+"px").style("top",(e.pageY+8)+"px"))
  .on("mouseout", () => tooltip.style("opacity",0));

node.append("text")
  .attr("dy", -12).attr("text-anchor","middle")
  .text(d => d.id);

sim.on("tick", () => {{
  link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
      .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
  node.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
}});
</script>
</body>
</html>
"""


def export_interactive_html(G: nx.Graph, influence_scores: dict, path: str):
    max_score = max([influence_scores.get(n, 0) for n in G.nodes()] + [1e-6])
    nodes = []
    for n, data in G.nodes(data=True):
        raw_score = influence_scores.get(n, 0)
        nodes.append({
            "id": n,
            "type": data.get("type", "UNKNOWN"),
            "color": TYPE_COLORS.get(data.get("type", "UNKNOWN"), "#999"),
            "score": round(raw_score / max_score, 4) if max_score else 0,
        })
    links = [
        {"source": u, "target": v, "weight": d.get("weight", 1)}
        for u, v, d in G.edges(data=True)
    ]
    graph_json = json.dumps({"nodes": nodes, "links": links})
    legend_html = "".join(
        f'<span><span class="swatch" style="background:{c}"></span>{t}</span>'
        for t, c in TYPE_COLORS.items()
    )
    html = HTML_TEMPLATE.format(graph_json=graph_json, legend_html=legend_html)
    with open(path, "w") as f:
        f.write(html)


def plot_top_players(ranked_players: list[dict], path: str):
    names = [p["entity"] for p in ranked_players][::-1]
    scores = [p["influence_score"] for p in ranked_players][::-1]
    plt.figure(figsize=(7, 4.5))
    plt.barh(names, scores, color="#e63946")
    plt.xlabel("Composite Influence Score")
    plt.title("Top Ranked Key Players in Network")
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
