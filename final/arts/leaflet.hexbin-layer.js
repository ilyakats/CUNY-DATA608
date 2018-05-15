L.HexLayer = L.Layer.extend({
    includes: L.Evented.prototype,

    options: {
        minZoom: 0,
        maxZoom: 18,
        padding: 100
    },

    initialize: function (data, options) {
        var options = L.setOptions(this, options);
        this._layout = d3.hexbin().radius(this.options.radius);
        this._data = data;
        this._levels = {};
    },

    onAdd: function (map) {
        this._map = map;
        this._initContainer();
        map.on({
            'moveend': this._update
        }, this);
        this._update();
    },

    onRemove: function (map) {
		this._container._groups[0][0].parentNode.removeChild(this._container._groups[0][0]);
        map.off({
            'moveend': this._update
        }, this);
        this._container = null;
        this._map = null;
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _initContainer: function () {
        var overlayPane = this._map.getPanes().overlayPane;
        if (!this._container || overlayPane.empty) {
            // TODO: Add optional ID attribute in the case of multiple layers.
            this._container = d3.select(overlayPane)
                .append('svg')
                .attr('class', 'leaflet-layer leaflet-zoom-hide');
        }
    },

    _update: function () {
        if (!this._map) { return; }

        var zoom = this._map.getZoom();

        if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
            return;
        }
        var padding = this.options.padding,
            bounds = this._translateBounds(d3.geoBounds(this._data));
            width = bounds.getSize().x + (2 * padding),
            height = bounds.getSize().y + (2 * padding),
            margin_top = bounds.min.y - padding,
            margin_left = bounds.min.x - padding;

        this._layout.size([width, height]);
        this._layout.radius(this.options.radius);
        this._container.attr("width", width).attr("height", height)
            .style("margin-left", margin_left + "px").style("margin-top", margin_top + "px");

        if (!(zoom in this._levels)) {
            this._levels[zoom] = this._container.append("g").attr("class", "zoom-" + zoom);
            this._createHexagons(this._levels[zoom]);
            this._levels[zoom].attr("transform", "translate(" + -margin_left + "," + -margin_top + ")");
        }
        this._setLevel(zoom);
    },

    _setLevel: function (zoom) {
        if (this._currentLevel) {
            this._currentLevel.style("display", "none");
        }
        this._currentLevel = this._levels[zoom];
        this._currentLevel.style("display", "inline");
    },

    _createHexagons: function (container) {
        var tooltipHTML = "",
        	layout = this._layout,
            data = this._data.features.map(function (d) {
                return this._project(d.geometry.coordinates, d.properties);
            }, this),
            bins = layout(data),
            hexagons = container.selectAll(".hexagon").data(bins);

		var tooltip = d3.select("body").append("div")
					.attr("class", "tooltip")
					.style("opacity", 0);

        // Create hexagon elements when data is added.
        var path = hexagons.enter().append("path")
        		.attr("class", "hexagon")
        		.attr("d", function (d) { return "M" + d.x + "," + d.y + layout.hexagon(); })
		        .on("mouseover", function(d) {
					console.log(d);
					tooltip.transition().duration(300).style("opacity", 1);
					if (d.length == 1) {
						tooltipHTML = d[0][2].name+"<br>"+d[0][2].address+"<p>"+
							"Artwork: "+d[0][2].events[0]+"<br>"+
							"Concerts: "+d[0][2].events[1]+"<br>"+
							"Dance: "+d[0][2].events[2]+"<br>"+
							"Films: "+d[0][2].events[3]+"<br>"+
							"Theater: "+d[0][2].events[4]+"<br>"+
							"Other: "+d[0][2].events[5];
					} else {
						tooltipHTML = "Number of schools: "+d.length+"<br>"+
							"Total events: "+d3.sum(d, function(d) { return d[2].events.reduce(function(a, b) { return a+b; });});
					}
					tooltip.html(tooltipHTML)
						.style("top", (d3.event.pageY-25) + "px")
                		.style("left", (d3.event.pageX+10) + "px");
				})
				.on("mouseout", function(d) {
					tooltip.transition().duration(500).style("opacity", 0);
				});
		this._applyStyle(path);
    },

    _applyStyle: function (hexagons) {
        if ('applyStyle' in this.options) {
            this.options.applyStyle.call(this, hexagons);
        }
    },

    _project: function (x, prop) {
        var point = this._map.latLngToLayerPoint([x[1], x[0]]);
        return [point.x, point.y, prop];
    },

    _translateBounds: function (d3_bounds) {
        var nw = this._project([d3_bounds[0][0], d3_bounds[1][1]]),
            se = this._project([d3_bounds[1][0], d3_bounds[0][1]]);
        return L.bounds(nw, se);
    }
});

L.hexLayer = function (data, options) {
    return new L.HexLayer(data, options);
};
