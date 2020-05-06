(function() {
  var margin = {top:50, left:50, right:50, bottom:50},
  height = 520 - margin.top - margin.bottom,
  width  = 910 - margin.left - margin.right;

  var svg = d3.select("#map")
            .append("svg")
            .attr("height", height + margin.top + margin.bottom)
            .attr("width", width + margin.left + margin.right)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top +")");

  d3.json("world-110m.json")
  .then(ready)

  /* create a projection, 
  make it center, zoom in supported */
  var projection = d3.geoNaturalEarth1()
      .translate([width/2, height/2])
      .scale(200)
      .precision(0.1)

  /* create a path using projection */
  var path = d3.geoPath()
      .projection(projection)

  var graticule = d3.geoGraticule();

  function ready (data){
    console.log(data)

    var countries = topojson.feature(data, data.objects.countries).features

    console.log(countries)

    /* add a path for each country */
    svg.selectAll(".country")
        .data(countries)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", path)
        .on('mouseover', function(c){
          d3.select(this).classed("selected", true)
        })
        .on('mouseout', function(c){
          d3.select(this).classed("selected", false)
        });
    svg.append("path")
        .datum(topojson.mesh(data, data.objects.countries, (a, b) => a !== b))
        .attr("class", "boundary")
        .attr("d", path);
    svg.append("path")
        .datum(graticule)
        .attr("class", "lines")
        .attr("d", path);
    
  }
})();