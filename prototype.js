let map = L.map("map").setView([27.7221598, 85.1929128], 17);

// add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

// FeatureGroup is to store editable layers
var drawnItems = new L.geoJSON();
map.addLayer(drawnItems);
var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polyline: false,
        marker: false,
        circlemarker: false,
        circle: false
    }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function(e) {
    var type = e.layerType;
    layer = e.layer;

    if (type === 'marker') {
        layer.bindPopup('A popup!');
    }
    // getPopn(layer);
    // layer.on('click', function() {
    //     console.log(e)
    //     getPopn(e.layer)
    // });
    // $("#resultsTbl").append($("<tr>").append($("<td>City</td><td>Population</td>")));
    drawnItems.addLayer(layer);
    let bboxStr = "poly:'";
    layer.getLatLngs()[0].forEach(p => {
        // console.log(p);
        bboxStr += `${p.lat.toFixed(6)} ${p.lng.toFixed(6)} `;
    });
    debugger;
    bboxStr = bboxStr.slice(0, -1) + "'";

    opl.setQuery('way[building](' + bboxStr + ');(._;>;);out;>;');
});

var ol = new L.geoJSON();
ol.addTo(map);

var geocoder = L.Control.geocoder({
    collapsed: false,
    showResultIcons: true,
    defaultMarkGeocode: false
});
geocoder.options.geocoder.options["reverseQueryParams"] = { format: "jsonv2" };
var opl = new L.OverPassLayer({
    minZoom: 20,
    debug: true,
    // query: 'way[building]({{bbox}});(._;>;);out;>;',
    query: 'node(1);',
    noInitialRequest: true,
    beforeRequest: function() {
        // debugger;
    },
    onSuccess: function(data) {
        console.log(data);
        console.log(osmtogeojson(data));
        ol.addData(osmtogeojson(data, {
            flatProperties: true
        }));
        $("#resultsTbl")[0].innerHTML = "";
        $("#resultsTbl").append($("<tr>").append($("<td>Latitude</td><td>Longitude</td><td>Address</td>")));
        ol.getLayers().forEach(l => {
            // console.log(l.feature.properties);

            let osmid = l.feature.id.split('/');
            // sleep(1000).then(() => {
            //     $.getJSON(`http://nominatim.openstreetmap.org/lookup?osm_ids=${osmid[0][0].toUpperCase()}${osmid[1]}&format=jsonv2`, { addressdetails: 1, email: "amrit.im@gmail.com" }).done(

            //         function(json) {
            //             let row = "<tr>";
            //             row += "<td>" + l.getCenter().lat.toFixed(6) + "</td><td>" + l.getCenter().lng.toFixed(6) + "</td>";
            //             for (item in json[0].address) {
            //                 row += "<td>" + json[0].address[item] + "</td>"
            //                 console.log(json[0].address[item]);
            //             }
            //             row += "</tr>";

            //             $("#resultsTbl").append(row);
            //             console.log(json);
            //             debugger;
            //         });
            // });
            sleep(1000).then(() => {
                geocoder.options.geocoder.reverse(l.getCenter(), 90000000, response => {
                    let row = "<tr>";
                    row += "<td>" + l.getCenter().lat.toFixed(6) + "</td><td>" + l.getCenter().lng.toFixed(6) + "</td>";
                    for (item in response[0].properties.address) {
                        row += "<td>" + response[0].properties.address[item] + "</td>"
                        console.log(response[0].properties.address[item]);
                    }
                    row += "</tr>";

                    $("#resultsTbl").append(row);
                    console.log(response);
                    // console.log(response);
                    debugger;
                });
            });
            // debugger;
        });
        // debugger;
    }
});

map.addLayer(opl);

function getPopn(layer) {
    var polygonStr = layer.getLatLngs()[0].map(p => '(' + p.lat + ',' + p.lng + ')').toString();
    $.get(`https://public.opendatasoft.com/api/records/1.0/search/?dataset=worldcitiespop&q=&sort=population&facet=country&geofilter.polygon=${polygonStr}`, function(data) {
        console.log(data);
        total_popn = 0;
        $("#resultsTbl")[0].innerHTML = "";
        $("#resultsTbl").append($("<tr>").append($("<td>City</td><td>Population</td>")));
        data.records.forEach(r => {
            console.log(r.fields.city)
            if (r.fields.population != null) {
                $("#resultsTbl").append("<tr><td>" + r.fields.city + "</td><td>" + r.fields.population + "</td></tr>");
                // marker = L.marker(L.GeoJSON.coordsToLatLng(r.geometry.coordinates));
                // marker.bindPopup(r.fields.city + "<br>" + r.fields.population);
                // drawnItems.addLayer(marker);
                total_popn += r.fields.population;
            }
        });
        layer.bindTooltip("Population:" + total_popn, { permanent: true, direction: "center", opacity: 0.5 })
    })
}

function saveFile() {
    var blob = new Blob([JSON.stringify(drawnItems.toGeoJSON())], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "test.geojson");
}

function dispFile(contents) {
    document.getElementById('contents').innerHTML = contents
}

function clickElem(elem) {
    // Thx user1601638 on Stack Overflow (6/6/2018 - https://stackoverflow.com/questions/13405129/javascript-create-and-save-file )
    var eventMouse = document.createEvent("MouseEvents")
    eventMouse.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    elem.dispatchEvent(eventMouse)
}

function openFile(func) {
    readFile = function(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var contents = e.target.result;
            // fileInput.func(contents);
            document.body.removeChild(fileInput);
            geoobj = L.geoJSON(JSON.parse(contents), {
                onEachFeature: onEachFeature
            });
            geoobj.eachLayer(l => {
                    console.log(l);
                    drawnItems.addLayer(l);
                })
                // drawnItems = L.geoJSON(JSON.parse(contents), {
                // onEachFeature: onEachFeature
                // }).addTo(map);
            $("#resultsTbl").append($("<tr>").append($("<td>City</td><td>Population</td>")));
            drawnItems.getLayers().forEach(layer => getPopn(layer));
        }
        reader.readAsText(file)
    }
    fileInput = document.createElement("input")
    fileInput.type = 'file'
    fileInput.style.display = 'none'
    fileInput.onchange = readFile
    fileInput.func = func
    document.body.appendChild(fileInput)
    clickElem(fileInput)
}

function onEachFeature(feature, layer) {
    //bind click
    layer.on('click', function(e) {
        // e = event
        console.log(e);
        console.log('Clicked feature layer ID: ' + feature);
        getPopn(e.target)
    });

}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}