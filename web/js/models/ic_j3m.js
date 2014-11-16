var app = app || {};//global Backbone

jQuery(document).ready(function($) {
	/* BACKBONE MODELS */

	app.InformaCamJ3MHeader = Backbone.Model.extend({
		urlRoot: '/j3mheader',
	});

	app.InformaCamJ3MStripped = Backbone.Model.extend({
		urlRoot: '/j3mretrieve',
	});

	app.InformaCamJ3MTimeStampedData = Backbone.Model.extend({
		initialize: function(options) {
			this.urlRoot = options.urlRoot;
		},
		parse: function(response) {
			this.set({values: response}, {silent: true});
			return response;
		},
	});

	/* BACKBONE VIEWS */

	app.InformaCamJ3MHeaderView = Backbone.View.extend({
		el: $('#ic_j3mheader_view_holder'),
		template: getTemplate("j3m_header.html"),
		render: function() {
			json = this.model.toJSON().data;
			json.URL = document.URL;
			json.genealogy.dateFormatted = moment(Number(json.genealogy.dateCreated)).format("MM/DD/YYYY HH:mm:ss")
			html = Mustache.to_html(this.template, json);
			this.$el.html(html);
			$('#submission_permalink').click(function() {
				this.select();
			});
			return this;
		},
	});

	app.InformaCamJ3MTimeseriesMapView = Backbone.View.extend({
		initialize: function(options) {
			this.maps = [];
			this.header = options.header;
		},
		render: function() {
			this.$el.prepend('<h2>' + this.header + '</h2>');
			this.json = {values: this.model.get("values")};
			this.loadMap('mapOverview', [this.json.values[0]], 4);
			this.loadMap('mapZoom', this.json.values, 19);

			return this;
		},
		
		loadMap: function(mapID, values, zoom) {
			$('#' + mapID).addClass("rendered");
			this.maps[mapID] = L.map(mapID).setView([values[0].gps_lat, values[0].gps_long], zoom);
			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
			}).addTo(this.maps[mapID]);
			
			if (values.length > 1) {
				latlngs = _.map(values, function(latlong){ return [latlong.gps_lat,latlong.gps_long]; });
				L.polyline(latlngs, {color: 'red', weight:2}).addTo(this.maps[mapID]);
				var myIcon = L.icon({
					iconUrl: '/web/images/ic_map_icon.png',
					iconRetinaUrl: '/web/images/ic_map_icon.png',
					iconSize: [5, 5]
        		});
			} else {
				var myIcon = L.icon({
					iconUrl: '/web/images/ic_map_icon.png',
					iconRetinaUrl: '/web/images/ic_map_icon.png',
					iconSize: [18, 18]
        		});
			}

			_.each(values, function(latlong) {
				timestamp = moment(Number(latlong.timestamp)).format("MM/DD/YYYY HH:mm:ss");
				L.marker([latlong.gps_lat,latlong.gps_long]).setIcon(myIcon).addTo(this.maps[mapID])
				.bindPopup(timestamp);
			}, this);
		},
	});
	
	app.InformaCamJ3MLineChartMultiView = Backbone.View.extend({
		initialize: function(options) {
			this.model.get('pressureAltitude').bind('change', this.render, this);
			this.model.get('lightMeter').bind('change', this.render, this);
			this.model.get('GPSAccuracy').bind('change', this.render, this);
			this.model.get('GPSBearing').bind('change', this.render, this);
			this.model.get('Accelerometer').bind('change', this.render, this);
			this.model.get('pressureHPAOrMBAR').bind('change', this.render, this);
		},
		render: function(model) {
			var data = model.get("values");
			var div_id = model.urlRoot.substring(1);
			$("#" + div_id + "_check, label[for='" + div_id + "_check']").addClass("rendered");
			$("#" + div_id + "_check").change(function() {
				if (this.checked) {
					$('path.' + div_id).show();
					$('g.y.axis.' + div_id).show();
				} else {
					$('path.' + div_id).hide();
					$('g.y.axis.' + div_id).hide();
				}
			});
			
			var margin = {top: 20, right: 20, bottom: 30, left: 50},
			totalWidth = 960, totalHeight = 500,
			width = totalWidth - margin.left - margin.right,
			height = totalHeight - margin.top - margin.bottom;

			//lump all Y vals into one array for determining domain
			this.allYVals = [];
			_.each(model.get("keys"), function(key) {
				this.allYVals = this.allYVals.concat(_.pluck(data, key));
			}, this);

			var x = d3.time.scale()
				.range([0, width]);

			var y = d3.scale.linear()
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.tickFormat(d3.time.format('%H:%M:%S.%L'));

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left");

			var svg = d3.select(this.el).insert("svg", '#graph_controls')
				.attr({width: totalWidth,
				height:totalHeight,
				viewBox: "0 0 " + totalWidth + " " + totalHeight})
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			x.domain(d3.extent(data, function(d) { return d.timestamp; }));
		
			if (d3.min(this.allYVals) < 0) {
				y.domain(d3.extent(this.allYVals));
			} else {
				y.domain([0, d3.max(this.allYVals)]);
			}

			if (this.$el.find('svg').length == 1) {
				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);
			}

			svg.append("g")
				.attr("class", "y axis " + div_id)
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", ".71em")
				.style("text-anchor", "end")
				.text(this.yLabel);

			_.each(model.get("keys"), function(key) {
				var line = d3.svg.line()
					.interpolate("basis")
					.x(function(d) { return x(d.timestamp); })
					.y(function(d) { return y(d[key]); });
					
				svg.append("path")
					.datum(data)
					.attr("class", "line " + div_id + " " + key)
					.attr("d", line);
			}, model);

			scaleGraphs();
			
			return this;
		},
	});



	app.InformaCamJ3MAppView = Backbone.View.extend({
		el: '#ic_submission_view_holder',
		initialize: function() {
			this.headerView = new app.InformaCamJ3MHeaderView({
				model: new app.InformaCamJ3MHeader({
					id: app.docid
				})
			});

			this.gps_coordsView = new app.InformaCamJ3MTimeseriesMapView({
				model: new app.InformaCamJ3MTimeStampedData({
					urlRoot: '/GPSCoords',
					id: app.docid
				}),
				el: '#ic_gps_coords_view_holder',
				header: 'GPS Coordinates',
			});
			

			/* MULTI-VIEW LINE CHART */	
					// http://stackoverflow.com/questions/7385629/backbone-js-complex-views-combining-multiple-models
					// http://stackoverflow.com/questions/7734559/backbone-js-passing-2-models-to-1-view
			this.lineChartMultiView = new app.InformaCamJ3MLineChartMultiView({
				model: new Backbone.Model({
					pressureAltitude: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/pressureAltitude',
						id: app.docid,
						title: 'Pressure Altitude',
						keys: ['pressureAltitude'],
					}),
					lightMeter: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/lightMeter',
						id: app.docid,
						title: 'Light Meter',
						keys: ['lightMeterValue'],
					}),
					GPSAccuracy: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/GPSAccuracy',
						id: app.docid,
						title: 'GPS Accuracy',
						keys: ['gps_accuracy'],
					}),
					GPSBearing: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/GPSBearing',
						id: app.docid,
						title: 'GPS Bearing',
						keys: ['gps_bearing'],
					}),
					Accelerometer: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/Accelerometer',
						id: app.docid,
						title: 'Accelerometer',
						keys: ['acc_x', 'acc_y', 'acc_z', ],
					}),
					pressureHPAOrMBAR: new app.InformaCamJ3MTimeStampedData({
						urlRoot: '/pressureHPAOrMBAR',
						id: app.docid,
						title: 'pressureHPAOrMBAR',
						keys: ['pressureHPAOrMBAR', ],
					}),
				}),
				el: '#ic_linechart_view_holder',
			});	

			this.lineChartMultiView.model.get("pressureAltitude").fetch();
			this.lineChartMultiView.model.get("lightMeter").fetch();
			this.lineChartMultiView.model.get("GPSAccuracy").fetch();
			this.lineChartMultiView.model.get("GPSBearing").fetch();
			this.lineChartMultiView.model.get("Accelerometer").fetch();
			this.lineChartMultiView.model.get("pressureHPAOrMBAR").fetch();



			/* END MULTI-VIEW LINE CHART */	


			//LISTENERS
			
			views = [this.headerView, this.gps_coordsView, ];
			
			_.each(views, function(view) {
				this.listenTo(view.model, 'change', function() {
					view.$el.append(view.render().el);
				});
				view.model.fetch();
			}, this);
			
		},
	});


	function $c(foo) {
		console.log(foo);
	}
});

/*
think about these:

http://localhost:8888/GPSAccuracy/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/Accelerometer/4c20d05a772723f1b5e97166ca1f3709/
//acc_x, acc_y, acc_z
http://localhost:8888/DocumentWrapper/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/PitchRollAzimuth/f76f260fb500ac1a58e0c35c97d5361e/
//pitch, roll, azimuth, plus all 3 corrected
http://localhost:8888/VisibleWifiNetworks/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/j3mheader/4c20d05a772723f1b5e97166ca1f3709/


http://localhost:8888/GPSAccuracy/f76f260fb500ac1a58e0c35c97d5361e/
http://localhost:8888/GPSCoords/f76f260fb500ac1a58e0c35c97d5361e/


http://localhost:8888/GPSAccuracy/4c20d05a772723f1b5e97166ca1f3709/
http://localhost:8888/GPSBearing/4c20d05a772723f1b5e97166ca1f3709/
gps_bearing
http://localhost:8888/GPSCoords/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/lightMeter/f76f260fb500ac1a58e0c35c97d5361e/

http://localhost:8888/GPSAccuracy/f76f260fb500ac1a58e0c35c97d5361e/

http://localhost:8888/lightMeter/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/pressureAltitude/4c20d05a772723f1b5e97166ca1f3709/

http://localhost:8888/pressureHPAOrMBAR/4c20d05a772723f1b5e97166ca1f3709/
*/

