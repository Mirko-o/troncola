Troncola = {};

!function(Troncola) {

// Variabili Private

	var reference_system = {
		"x" : 0,
		"y" : 0,
		"width" : 100,
		"height" : 100
	};

	var camera = {
		"tx" : 0,
		"ty" : 0,
		"sc" : 1
	}

	var graph = undefined;				// Oggetto che rappresenta il grafo
	var side_bar = undefined;			// Oggetto del dom
	var renderer = undefined;			// Oggetto che permette la stampa su canvas
	var dragging = undefined;			// Id del nodo in fase dragging
	var font_size = 18;					// Dimensione font in px

	CanvasRenderingContext2D.prototype.clear = CanvasRenderingContext2D.prototype.clear || function(preserveTransform) {
		if (preserveTransform) {
			this.save();
			this.setTransform(1, 0, 0, 1, 0, 0);
		}

		this.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if (preserveTransform) {
			this.restore();
		}   
	};

	var Troncola = {
		
// Variabili Pubbliche
		
		"size_scale":		0.33,		// Fattore di scala per i nodi
		"stroke_width":		4,			// Spessore linee
		"label_font_name":	"arial",	// Font dei label dei nodi

// Funzioni

		"draw_graph": function(filename) {
			
		// Eventi

			function wheel(event) {
				var delta = event.deltaY / 100;
				camera.sc += delta;
				if (camera.sc < 0.3) camera.sc = 0.3;
				else if (camera.sc > 2) camera.sc = 2;
				draw();
			}

			function mousedown(event) {
				if (!dragging) {
					var mx = (event.clientX - camera.tx) / camera.sc,
						my = (event.clientY - camera.ty) / camera.sc;

					var nodes = graph.nodes,
						length = nodes.length,
						i = 0,
						flag = false;

					while (!flag && i < length) {
						if (nodes[i].inside(mx, my, Troncola.size_scale)) {
							flag = true;
							dragging = {
								"id": i,
								"dragx": event.clientX,
								"dragy": event.clientY
							}
						}
						i++;
					}

					if (!flag) {
						dragging = {
							"id": "camera",
							"dragx": event.clientX,
							"dragy": event.clientY
						}
					} else {
						node_selected(i - 1);
					}
				}
			}

			function mousemove(event) {
				if (dragging) {
					var dx = event.clientX - dragging.dragx,
						dy = event.clientY - dragging.dragy;

					dragging.dragx += dx;
					dragging.dragy += dy;

					if (dragging.id === "camera") {
						camera.tx += dx;
						camera.ty += dy;
					} else {
						var node = graph.nodes[dragging.id];
						node.x += dx / camera.sc;
						node.y += dy / camera.sc;
						node_selected(dragging.id);
					}

					draw();
				}
			}

			function mouseup(event) {
				if (dragging) {
					dragging = undefined;
				}
			}

			function mouseout(event) { dragging = undefined; }

		// Selezione ogetti

			function node_selected(i) {
				var node = graph.nodes[i],
					title = "",
					desc = "";

				if (node.is_op) {
					title += node.name;

					switch(node.name) {
						case "OR": {
							desc += "<p>La causa è uno o più dei geni entranti</p>";
							break;
						}
						case "XOR": {
							desc += "<p>La causa è uno soltato tra i geni entranti</p>";
							break;
						}
						case "AND": {
							desc += "<p>Le cause sono tutti i geni entranti</p>";
							break;
						}
					}
				} else {
					title += "<a href=\""+ NCBIGeneQueryURL(node.name, "human") +"\" target=\"_blank\">" + node.name + "</a>";
					desc += "tipo: " + node.type + "\n";
				}

				update_sidebar(title, desc);
			}

			function edge_selected(i) {
				var edge = graph.edges[i],
					title = "<p>Edge tra " + edge.target.name + " e " + edge.target.name + "</p>",
					desc = "<p>descrizione</p>";

				update_sidebar(title, desc);
			}

			function update_sidebar(title, desc) {
				side_bar.getElementsByClassName("title")[0].innerHTML =  title;
				side_bar.getElementsByClassName("desc")[0].innerHTML = desc;
			}

		// Stampa grafico

			function draw() {

				function draw_arrow(source, target) {
					var tx = target.x,
						ty = target.y,
						dx = tx - source.x,
						dy = ty - source.y,
						width = target.width * Troncola.size_scale,
						length = 30;
						angle = Math.abs(Math.atan(dy / dx)),
						delta = -.8;

					if (dx < 0 && dy < 0) {
						angle = Math.PI + angle;
					} else if (dx < 0 && dy > 0) {
						angle = Math.PI - angle;
					} else if (dx > 0 && dy < 0) {
						angle = Math.PI * 2 - angle;
					}

					var	sin = Math.sin(angle),
						cos = Math.cos(angle),
						sinl = Math.sin(angle + delta),
						cosl = Math.cos(angle + delta),
						sinr = Math.sin(angle - delta),
						cosr = Math.cos(angle - delta);

					tx -= width * cos;
					ty -= width * sin;

					renderer.moveTo(tx, ty);
					renderer.lineTo(tx + length * sinl, ty - length * cosl);
					renderer.moveTo(tx, ty);
					renderer.lineTo(tx - length * sinr, ty + length * cosr);
					/*renderer.fillStyle = "#FF00FF"
					renderer.font = "20px Arial";
					renderer.fillText("" + angle / Math.PI * 180, tx, ty);*/
				}

				renderer.save();
				renderer.clear();
				renderer.font = font_size + "px " + Troncola.label_font_name;

				!function(m) {
					console.log(m.sc+" 0 "+m.tx+"\n0 "+m.sc+" "+m.ty+"\n0 0 1");
					renderer.transform(m.sc, 0, 0, m.sc, m.tx, m.ty);
				} (camera);

				graph.edges.forEach(function(e) {
					renderer.beginPath();
					renderer.moveTo(e.source.x, e.source.y);
					renderer.lineTo(e.target.x, e.target.y);
					renderer.lineWidth = e.weight * 2 / camera.sc;
					renderer.strokeStyle = e.color;
					if (e.arrow === "True") {
						draw_arrow(e.source, e.target);
					}
					if (e.line === "Dash") {
						renderer.setLineDash([10, 10]);
					} else {
						renderer.setLineDash([]);
					}
					renderer.stroke();
				});

				graph.nodes.forEach(function(n) {
					renderer.fillStyle = n.fillcolor;
					renderer.lineWidth = n.borderwidth * 2 / camera.sc;
					renderer.strokeStyle = n.bordercolor;

					if (n.is_op) {
						var bwidth = n.width * Troncola.size_scale * 1.2;
						var owidth = n.width * Troncola.size_scale * 0.4;

						renderer.beginPath();
						renderer.moveTo(n.x + bwidth, n.y);
						renderer.lineTo(n.x, n.y + bwidth);
						renderer.lineTo(n.x - bwidth, n.y);
						renderer.lineTo(n.x, n.y - bwidth);
						renderer.lineTo(n.x + bwidth, n.y);
						renderer.fill();
						renderer.stroke();

						// draw operator symbol
						renderer.beginPath();

						switch(n.name) {
							case "XOR": {
								renderer.moveTo(n.x - owidth, n.y - owidth);
								renderer.lineTo(n.x + owidth, n.y + owidth);
								renderer.moveTo(n.x - owidth, n.y + owidth);
								renderer.lineTo(n.x + owidth, n.y - owidth);
								break;
							}
							case "OR": {
								renderer.arc(n.x, n.y, owidth * 1.15, 0, 2 * Math.PI);
								break;
							}
							case "AND": {
								renderer.moveTo(n.x, n.y - owidth * 1.15);
								renderer.lineTo(n.x, n.y + owidth * 1.15);
								renderer.moveTo(n.x - owidth * 1.15, n.y);
								renderer.lineTo(n.x + owidth * 1.15, n.y);
								break;
							}
						}

						renderer.stroke();
					} else {
						renderer.beginPath();
						renderer.arc(n.x, n.y, n.width * Troncola.size_scale, 0, 2 * Math.PI);
						renderer.fill();
						renderer.stroke();
						renderer.fillStyle = n.fontcolor;
						renderer.fillText(n.name, n.x - font_size * n.name.length / 3, n.y + font_size / 2);
					}
				});

				renderer.restore();
			}

		// Generazione grafico
		
			function make_graph(graph_tag, keys) {

				function arrayObjectIndexOf(myArray, property, searchTerm) {	
					for(var i = 0, len = myArray.length; i < len; i++) {
						if (myArray[i][property] === searchTerm) return i;
					}
					return -1;
				}

				var graph = {};
				
				var graph_attr = [].slice.call(graph_tag.querySelectorAll("data"))	// estraggo attributi del grafo
				.filter(function(tag) {
					return tag.parentElement.tagName === "graph";
				});
				
				graph_attr.forEach(function(tag) {						// associo agli attributi del grafo i relativi valori
					var key = keys.graph[tag.getAttribute("key")];
					var value = tag.textContent;
					if (key.type === "double")
						value = +value;
					graph[key.name] = value;
				});
				
				var nodes = [].map.call(graph_tag.querySelectorAll("node"), function(tag) { // per ogni nodo
					var node = {
						"id": tag.getAttribute("id")
					};
					
					var node_attr = [].slice.call(tag.querySelectorAll("data"));	// estraggo attributi del nodo

					node_attr.forEach(function(tag) {					// associo agli attributi del nodo i relativi valori
						var key = keys.node[tag.getAttribute("key")];
						var value = tag.textContent;
						if (key.type === "double")
							value = +value;
						node[key.name] = value;
					});

					var name = node.name;
					node.is_op = (name === "OR" || name === "XOR" || name === "AND");
					node.inside = function(x, y, scale) {
						function mag(x, y) {
							return Math.sqrt(x * x + y * y);
						}

						return mag(x - this.x, y - this.y) < this.width *  scale;
					};

					return node;
				});
				
				var edges = [].map.call(graph_tag.querySelectorAll("edge"), function(tag) {	// per ogni arco
					var edge = {
						"source": arrayObjectIndexOf(nodes, "id", tag.getAttribute("source")),
						"target": arrayObjectIndexOf(nodes, "id", tag.getAttribute("target"))
					};
					
					var edge_attr = [].slice.call(tag.querySelectorAll("data"));	// estraggo attributi dell'arco

					edge_attr.forEach(function(tag) {					// associo agli attributi dell'arco i relativi valori
						var key = keys.edge[tag.getAttribute("key")];
						var value = tag.textContent;
						if (key.type === "double")
							value = +value;
						edge[key.name] = value;
					});
					
					return edge;
				});
				
				graph.nodes = nodes;
				graph.edges = edges;
				return graph;
			}
			
			function cola_position_graph(graph) {
				var d3cola = cola.d3adaptor()
				  .avoidOverlaps(true)
				  .size([document.body.offsetWidth, document.body.offsetHeight]);

				d3cola
 				  .nodes(graph.nodes)
				  .links(graph.edges)
				  .flowLayout("y", 100)
				  .symmetricDiffLinkLengths(70)
				  .start(50, 15, 5)
				  .stop();
			}

			function NCBIGeneQueryURL(gene, organism) {
				var url = "http://www.ncbi.nlm.nih.gov/gene/?term=";
				
				if (gene)
				{
					url += gene.split("_")[0] + "[SYM]";
				}
				
				if (organism)
				{
					url += organism + "[ORGN]";
				}

				return url;
			}

		// Util

			function max(array, extractor) {
				var res = extractor(array[0]), temp;
				for (var i = 1; i < array.length; i++) {
					temp = extractor(array[i]);
					if (temp > res) {
						res = temp;
					}
				}
				return res;
			}

			function min(array, extractor) {
				var res = extractor(array[0]), temp;
				for (var i = 1; i < array.length; i++) {
					temp = extractor(array[i]);
					if (temp < res) {
						res = temp;
					}
				}
				return res;
			}

		// Codice
			
			// Load XML and generate graph object
			
			d3.xml(filename, function(error, data) {
				if (error || data === null) {
					alert("Errore durante il caricamento del file \"" + filename + "\"");
					return;
				}
				
				var temp = [].map.call(data.querySelectorAll("key"), function(tag) {
					return {
						"id": tag.getAttribute("id"),
						"for": tag.getAttribute("for"),
						"name": tag.getAttribute("attr.name"),
						"type": tag.getAttribute("attr.type")
					};
				});
				
				var keys = {		// keys conterrà le chiavi del documento xml, viene usato per generare gli attributi del grafico
					"graph": {},
					"node": {},
					"edge": {}
				};
				
				temp.forEach(function(key) {
					switch (key.for) {
						case "graph": {
							keys.graph[key.id] = {
								"name": key.name,
								"type": key.type
							}
							break;
						}
						case "node": {
							keys.node[key.id] = {
								"name": key.name,
								"type": key.type
							}
							break;
						}
						case "edge": {
							keys.edge[key.id] = {
								"name": key.name,
								"type": key.type
							}
							break;
						}
					}
				});

				graph = make_graph(data.querySelector("graph"), keys);	// genero il grafico con relativi attributi

				cola_position_graph(graph);		// posiziono i nodi con un certo criterio

				var minx = min(graph.nodes, function(n) { return n.x - n.width / 2; }),
					miny = min(graph.nodes, function(n) { return n.y - n.width / 2; }),
					maxx = max(graph.nodes, function(n) { return n.x + n.width / 2; }) - minx,
					maxy = max(graph.nodes, function(n) { return n.y + n.width / 2; }) - miny;

				graph.nodes.forEach(function(n) {
					n.x -= minx + maxx / 2;
					n.y -= miny + maxy / 2;
				});

				reference_system.x = maxx / 2;
				reference_system.y = maxy / 2;
				reference_system.width = maxx;
				reference_system.height = maxy;

			// Init canvas

				var canvas = document.getElementById("graph_container");

				canvas.setAttribute("width", canvas.offsetWidth);
				canvas.setAttribute("height", canvas.offsetHeight);

				renderer = canvas.getContext("2d");
				side_bar = document.getElementById("side_bar");

				camera.sc = canvas.offsetWidth / reference_system.width;
				camera.tx = - minx * 1.2;
				camera.ty = - miny * 0.42;

				draw();
				update_sidebar("<p>Nessun nodo selezionato</p>",
							   "<p>Seleziona un nodo per avere maggiori informazioni</p>");

				canvas.onmouseup = mouseup;
				canvas.onmousedown = mousedown;
				canvas.onmousemove = mousemove;
				canvas.onmouseout = mouseout;
				canvas.onwheel = wheel;
			});
		}
	};
	
	// Crea l'oggetto Troncola a livello globale
	if (typeof define === "function" && define.amd)
		this.Troncola = Troncola, define(Troncola);
	else
		if (typeof module === "object" && module.exports) module.exports = Troncola;
	else
		this.Troncola = Troncola;
} (Troncola);
