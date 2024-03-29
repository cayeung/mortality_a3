
function Graph(argsMap) {

	var self = this;
	var margin = [15, 15, 30, 80]; // margins (top, right, bottom, left)
	var width, height;	
	
	
	var containerId, container, data;

	var graph;
	var x, yLeft, xAxis, yAxisLeft;
	var allLines, lines, lineEquation, linesIndex = -1;
	var regression = 'linear'; // can be pow, log, linear
	
	var isOnGraph = false;
	var trackerContainer, trackerLine, trackerLineXOffset, trackerLineYOffset, trackerLineGroup;

	var _init = function() {
		containerId = getElement(argsMap, 'containerId');
		container = document.querySelector('#' + containerId);

		data = parseData(getElement(argsMap, 'data'));
		
		buildGraph()

	}
	
	var getElement = function(argsMap, key) {
		return argsMap[key]
	}

	var parseData = function(dataMap) {
		//everything is in epoch time. must convert years to epoch time
		var start = new Date(getElement(dataMap, 'start'))
		var end = new Date(getElement(dataMap, 'end'))
		var step = getElement(dataMap, 'step')	
		var names = getElement(dataMap, 'names');
		
		var axis = []
		var colors = getElement(dataMap, 'colors');
		var maxValues = [];
		names.forEach(function (v, i) {
				axis[i] = "left";
		})
		
		var values = getElement(dataMap, 'values')
		var copy = [];
		values.forEach(function (v, i) {
			copy[i] = v.slice(0);
			maxValues[i] = d3.max(copy[i])
		})

		return {
			"start" : start,
			"end" : end,
			"step" : step,
			"names": names,
			"values" : copy,
			"axis" : axis,
			"colors": colors,
			"scale" : regression,
			"maxValues" : maxValues,
		}
	}

	var redrawAxes = function(withTransition) {
		buildAxes();

		graph.selectAll("g .x.axis").transition()
		.duration(800)
		.ease("linear")
		.call(xAxis)				  

			
		graph.selectAll("g .y.axis.left").transition()
		.duration(800)
		.ease("linear")
		.call(yAxisLeft)
		
		linesIndex  =-1;

		graph.selectAll("g .lines path")
		.transition()
			.duration(800)
			.ease("linear")
			.attr("d", lineEquation)
			.attr("transform", null);

	}

	var buildAxes = function() {
		var maxY = d3.max(data.maxValues);
		//debug("initY => maxregression: " + maxregressionLeft);
		var numAxisLabels = 6;
		if(regression == 'linear') {
			yLeft = d3.scale.linear().domain([50, maxY]).range([height, 0]).nice();
		}else if(regression == 'power') {
			yLeft = d3.scale.pow().exponent(0.3).domain([0, maxY]).range([height, 0]).nice();	
		} 
		yAxisLeft = d3.svg.axis().scale(yLeft).ticks(numAxisLabels).orient("left");
		
		x = d3.time.scale().domain([data.start, data.end]).range([0, width]);
		xAxis = d3.svg.axis().scale(x);
	}



	var buildGraph = function() {

		width = $("#" + containerId).width() - margin[1] - margin[3]; // width
		height = $("#" + containerId).height() - margin[0] - margin[2]; // height

		trackerLineXOffset = margin[3]+$(container).offset().left;
		trackerLineYOffset = margin[0]+$(container).offset().top;

		graph = d3.select("#" + containerId).append("svg:svg")
				.attr("class", "line-graph")
				.attr("width", width + margin[1] + margin[3])
				.attr("height", height + margin[0] + margin[2])	
				.append("svg:g")
					.attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");

		buildAxes()		

		graph.append("svg:g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);

		graph.append("svg:g")
			.attr("class", "y axis")
			.attr("transform", "translate(-10,0)")
			.call(yAxisLeft);

		lineEquation = d3.svg.line()
			
			.x(function(d,i) { 
				return x(data.start.getTime() + (data.step*i));
			})
			.y(function(d, i) { 
				
				return yLeft(d);
			})
			
		lines = graph.append("svg:g")
				.attr("class", "lines")
				.selectAll("path")
				.data(data.values);

		$(container).mouseleave(function(event) {
			mouseNotInGraph(event);
		})

		$(container).mousemove(function(event) {
			mouseInGraph(event);
		})		


		allLines = lines.enter().append("g");

		allLines.append("path")
				.attr("stroke", function(d, i) {
					return data.colors[i];
				})
				.attr("fill", "none")
				.attr("d", lineEquation) 
				.on('mouseover', function(d, i) {
					mouseOnLineAction(d, i);
				});

		trackerLineGroup = graph.append("svg:g")
							.attr("class", "hover-line");

		trackerLine = trackerLineGroup
			.append("svg:line")
				.attr("x1", 10).attr("x2", 10) 
				.attr("y1", 0).attr("y2", height); 

		createRegressionLabels();
		createLabels();		

	}

	var createLabels = function() {

		var labelSet = graph.append("svg:g")
				.attr("class", "legend-group")
			.selectAll("g")
				.data(data.names)
			.enter().append("g")
				.attr("class", "legend-labels");

		labelSet.append("svg:text")
				.attr("class", "legend name")
				.text(function(d, i) {
					return d;
				})
				.attr("fill", function(d, i) {
					return data.colors[i];
				})
				.attr("y", function(d, i) {
					return height+30;
				})

		labelSet.append("svg:text")
				.attr("class", "legend value")
				.attr("fill", function(d, i) {
					return data.colors[i];
				})
				.attr("y", function(d, i) {
					return height+30;
				})

	}

	var createRegressionLabels = function() {
		var totalLength = 0;		
		// append a group to contain all lines
		var buttonGroup = graph.append("svg:g")
				.attr("class", "scale-button-group")
			.selectAll("g")
				.data([['linear','Linear'], ['power','Power']])
			.enter().append("g")
				.attr("class", "scale-buttons")
			.append("svg:text")
				.attr("class", "scale-button")
				.text(function(d, i) {
					return d[1];
				})
				.attr("font-size", "12") // this must be before "x" which dynamically determines width
				.attr("fill", function(d) {
					if(d[0] == regression) {
						return "black";
					} else {
						return "blue";
					}
				})
				.classed("selected", function(d) {
					if(d[0] == regression) {
						return true;
					} else {
						return false;
					}
				})
				.attr("x", function(d, i) {
					var currLen = totalLength;
					totalLength += this.getComputedTextLength()+5;
					return currLen;
				})
				.attr("y", -4)
				.on('click', function(d, i) {
					clickOnRegression(this, d, i);
				});
	}

	this.switch = function (scale) {
		regression = scale;
		redrawAxes(true);
		
		$(container).trigger('Graph:configModification')
	}

	var clickOnRegression = function(button, buttonData, index) {
		if(index == 0) {
			self.switch('linear');
		} else if(index == 1) {
			self.switch('power');
		}
	}

	var mouseOnLineAction = function(lineData, index) {
		isOnGraph = true;
	}
	
	var mouseNotInGraph = function(event) {	
		isOnGraph = false;
	}

	var mouseInGraph = function(event) {	
		var mouseX = event.pageX-trackerLineXOffset;
		var mouseY = event.pageY-trackerLineYOffset;

		
		if(mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
			trackerLine.classed("hide", false);
			trackerLine.attr("x1", mouseX).attr("x2", mouseX)

			displayXLabels(mouseX)

			isOnGraph = true;
		} else { //mouse is outside of the graph and therefore must be ignored
			mouseNotInGraph(event)
		}
	}

	var displayXLabels = function(xPosition, withTransition) {
		var animate = false;

		var date;
		var labelLengths = [];
		graph.selectAll("text.legend.value")
		.text(function(d, i) {
			var xValues = getValueForX(xPosition, i);
			date = xValues.date;
			return xValues.value;
		})
		.attr("x", function(d, i) {
			labelLengths[i] = this.getComputedTextLength();
		})

		// position label names
		var totalLength = 0;
		var labelTracker = [];
		graph.selectAll("text.legend.name")
				.attr("x", function(d, i) {
					var currLen = totalLength;
					totalLength += this.getComputedTextLength()+4+labelLengths[i]+8;
					labelTracker[i] = currLen + this.getComputedTextLength()+5;
					return currLen;
				})

		graph.selectAll("text.legend.value")
		.attr("x", function(d, i) {
			return labelTracker[i];
		})

		graph.selectAll("g.legend-group g")
			.attr("transform", "translate(" + (width-totalLength) +",0)")
	}

	var getValueForX = function(xPosition, dataSeriesIndex) {
		var val = data.values[dataSeriesIndex]

		var xcoord = x.invert(xPosition);
		var index = (xcoord.getTime() - data.start) / data.step;
		index = Math.round(index);

		var v = val[index];


		return {value: v.toString()};
	}

	_init();
};