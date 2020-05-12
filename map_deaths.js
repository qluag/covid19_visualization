(function() {
  var margin = {top:50, left:50, right:50, bottom:50},
  height = 440 - margin.top - margin.bottom,
  width  = 795 - margin.left - margin.right;
  
  var div = d3
  .select("#wrapper")
  .append("div")
  .attr("class", "tooltip")
  .attr("opacity", 0);

  var origin;
  var svg = d3.select("#m2")
            .append("svg")
            .attr("id", "mapBG")
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top +")");
  /*          
  var canvasLayer = d3.select("#map")
            .append("canvas")
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right);

  var canvas = canvasLayer.node(),
      context = canvas.getContext("2d");
  */
  /* create a projection, 
  make it center, zoom in supported */
  var projection = d3.geoNaturalEarth1()
      .translate([width/2, height/2])
      .scale(170)


  /* create a path using projection */
  var path = d3.geoPath()
      .projection(projection)

  var graticule = d3.geoGraticule();

  var countryNames = d3.map();
  var countryID;
  var countries;

  var width_slider = 795;
  var height_slider = 50;

  //var deaths;
  var tdeaths;
  var timeseries;


  Promise.all([d3.json("world-110m.json"), d3.tsv("world-110m-country-names.tsv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv"),
    d3.csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv")])
  .then(updateMap)

  /* functions */
  function updateMap (data){
    console.log(data[0]) // map
    console.log(data[1]) // country names

    countries = topojson.feature(data[0], data[0].objects.countries).features;
    countryID = data[1];

    // center
    var centroids = countries.map(function (d){
    return path.centroid(d);
    });

    console.log(countries)
    //console.log(centroids)

    console.log(data[2]) // deaths cases
    console.log(data[3]) // US
    
    deaths_global = data[2].filter(function(d){
      if (d["Country/Region"] != "US"){
        return d;
      }
    })
    deaths_us = data[3];
  

    // as tidy data
    tdeaths_global = tidy(deaths_global, "deaths", false);
    tdeaths_us = tidy(deaths_us, "deaths", true);
    tdeaths = tdeaths_global.concat(tdeaths_us);
    console.log(tdeaths)

    // get time series
    var tmp = [];
    timeseries = tdeaths.filter(function (d){
      if (!tmp.includes(d.ymd)){
        tmp.push(d.ymd);
        return d.ymd;
      }
    });
    timeseries.sort((a, b) =>
        d3.ascending(a.date, b.date)
    )
    timeseries = timeseries.map(function (d){
      return d.ymd;
    })
    //console.log(timeseries)
    // the date of today
    d3.select("#final2").html(timeseries[timeseries.length-1]);

    /* add a path for each country */
    origin = svg.selectAll(".country")
        .data(countries)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .style("cursor", "hand")
        .on("mousemove", function(d){
    
      var areaName = findCounName(d.id);
      if (areaName != null){
        div.style("opacity", 0.8);
            div
              .html(
                "<b>"+ areaName + 
            "</b></br>deaths cases: <b>" +
            totalInCountry(areaName, 99) + 
            "</b> <br>"
              )
              .style("left", function() {
                if (d3.event.pageX > 780) {
                  return d3.event.pageX - 180 + "px";
                } else {
                  return d3.event.pageX + 23 + "px";
                }
              })
              .style("top", d3.event.pageY - 20 + "px");
      }
    })
        .on("mouseout", function() {
            return div.style("opacity", 0);
          })
        .on("mouseout", mouseout);


    svg.append("path")
        .datum(topojson.mesh(data[0], data[0].objects.countries, (a, b) => a !== b))
        .attr("class", "boundary")
        .attr("d", path);
    svg.append("path")
        .datum(graticule)
        .attr("class", "lines")
        .attr("d", path)
        .attr("opacity", 0.4);

    // ------SLIDER----- //
    
    var svg2 = d3
        .select("#slider2")
        .attr("class", "chart")
        .append("svg")
        .attr("width", width_slider)
        .attr("height", height_slider);
      var dateDomain = [0, timeseries.length - 1];


      var pointerdata = [
        {
          x: 0,
          y: 0
        },
        {
          x: 0,
          y: 25
        },
        {
          x: 25,
          y: 25
        },
        {
          x: 25,
          y: 0
        }
      ];
      var scale = d3.scaleLinear()
        .domain(dateDomain)
        .rangeRound([0, 770]);
      var x = d3.axisTop(scale)
        .tickFormat(function(d) {
          return d;
        })
        .tickSize(0)

      svg2
        .append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 15 + ",0)")
        .call(x);
      var drag = d3.drag()
        .subject(function() {
          return {
            x: d3.select(this).attr("x"),
            y: d3.select(this).attr("y")
          };
        })
        .on("start", dragstart)
        .on("drag", dragmove)
        .on("end", dragend);

      svg2
        .append("g")
        .append("rect")
        .attr("class", "slideraxis")
        .attr("width", width_slider)
        .attr("height", 7)
        .attr("x", 0)
        .attr("y", 16);
      var cursor = svg2
        .append("g")
        .attr("class", "move")
        .append("svg")
        .attr("x", width)
        .attr("y", 7)
        .attr("width", 30)
        .attr("height", 60);

      cursor.call(drag);
      var drawline = d3.line()
        .x(function(d) {
          return d.x;
        })
        .y(function(d) {
          return d.y;
        })
        .curve(d3.curveLinear);

      cursor
        .append("path")
        .attr("class", "cursor")
        .attr("transform", "translate(" + 7 + ",0)")
        .attr("d", drawline(pointerdata));

      cursor.on("mouseover", function() {
        d3.select(".move").style("cursor", "hand");
      });

      function dragmove() {
        var x = Math.max(0, Math.min(770, d3.event.x));
        d3.select(this).attr("x", x);
        var z = parseInt(scale.invert(x));
        
        //heatmap
        //heatMap(z);
        drawCircle(z);
      }

      function dragstart() {
        d3.select(".cursor").style("fill", "#CD5C5C");
      }

      function dragend() {
        d3.select(".cursor").style("fill", "");
      }
 
         

    
  }
  /* // not used, just for referrence
  function heatMap (index){
    var heat = simpleheat(canvas);
    // set [[x,y,data]...] format
    var deathsToday = tdeaths.filter(function(d){
      return d.ymd == timeseries[index];
    });
    
    // get projection of coordinates
    deathsToday.forEach(function (d){
      d.coords = projection([d.long, d.lat]);
    })
    //console.log(deathsToday);
    heat.data(deathsToday.map(function (d) {
      return [d.coords[0], d.coords[1], +d.total];
    }));
    
    heat.radius(5, 5); // point radius, blur radius
    heat.max(d3.max(deathsToday, d => +d.total));
    heat.draw(0.4); // draw on canvas, min opacity threshold
  }
  */
  
  // draw circle
  function drawCircle(index){
    // update toolyip
    origin
    .style("cursor", "hand")
    .on("mousemove", function(d){
      var areaName = findCounName(d.id);
      if (areaName != null){
        div.style("opacity", 0.8);
            div
              .html(
                "<b>"+ areaName + 
            "</b></br>deaths cases: <b>" +
            totalInCountry(areaName, index) + 
            "</b> <br>"
              )
              .style("left", function() {
                if (d3.event.pageX > 780) {
                  return d3.event.pageX - 180 + "px";
                } else {
                  return d3.event.pageX + 23 + "px";
                }
              })
              .style("top", d3.event.pageY - 20 + "px");
      }
    })
        .on("mouseout", function() {
            return div.style("opacity", 0);
          })
        .on("mouseout", mouseout);

  
    // update the specific date
    d3.select("#date").html(timeseries[index]);

    svg.select("#todayCircle").remove();
    var deathsToday = tdeaths.filter(function(d){
      return d.ymd == timeseries[index];
    });
    
    // get projection of coordinates
    deathsToday.forEach(function (d){
      d.coords = projection([d.long, d.lat]);
    })

    var min_max = d3.extent(deathsToday, function(d){
      return +d.total;
    });
    //console.log(min_max)
    var cal_r = d3.scaleSqrt()
      .domain(min_max)
      .range([2, 22]);


    svg.append("g")
      .attr("id", "todayCircle")
      .selectAll("circle")
      .data(deathsToday)
      .enter()
      .append("circle")
      .attr("cx", function(d){
        return d.coords[0];
      })
      .attr("cy", function(d){
        return d.coords[1];
      })
      .attr("r", function(d){
        return cal_r(d.total);
      })
      .attr("fill", "#e00606")
      .attr("fill-opacity", 0.4);
  }



  // wash the data 
  function tidy (data, type, us) {
  const t = data
    .map(d => {
      let prev = 0; // previous total, to compute diffs
      return (
        Object.keys(d)
          .filter(parseDateMDY)
          .map(k => {
            const total = +d[k],
              cases = total - prev;
            prev = total;
            if (us){
              return {
              type,
              country: d["Country_Region"],
              province_name: d["Province/State"],
              province: `${d["Country_Region"]}:${d["Province/State"]}`,
              lat: +d["Lat"],
              long: +d["Long_"],
              date: parseDateMDY(k),
              ymd: d3.timeFormat("%Y-%m-%d")(parseDateMDY(k)),
              cases,
              total
              };

            }
            else{
              return {
              type,
              country: d["Country/Region"],
              province_name: d["Province/State"],
              province: `${d["Country/Region"]}:${d["Province/State"]}`,
              lat: +d["Lat"],
              long: +d["Long"],
              date: parseDateMDY(k),
              ymd: d3.timeFormat("%Y-%m-%d")(parseDateMDY(k)),
              cases,
              total
              };

            }
            
          })
      );
    })
    .flat()
    .filter(d => d.total > 0);

  return t;
}

function findCounName(id){
      for (var i = 0; i < countryID.length; i++){
        if (countryID[i].id == id){
          return countryID[i].name;
        }
      }
      return null; //no matching name

    }
function totalInCountry(name, index){
  var date = timeseries[index];
  var total = 0;
  
  for (var i = 0; i < tdeaths.length; i++){
    if (tdeaths[i].country == name && tdeaths[i].ymd == date){
      total += tdeaths[i].total;
    }
    // US special case
    if (name == "United States" && tdeaths[i].country == "US"
     && tdeaths[i].ymd == date){
      total += tdeaths[i].total;
    }
    // Russia Special case
    if (name == "Russian Federation" && tdeaths[i].country == "Russia"
     && tdeaths[i].ymd == date){
      total += tdeaths[i].total;
    }
  }
  return total;
}

function mouseout(d) {
        d3.select(this)
          .attr("stroke-width", ".3")
          .attr("fill-opacity", "1");
        div.style("opacity", 0);
}



// parse helper vars
var parseDateMDY = d3.timeParse("%m/%d/%y")
})();