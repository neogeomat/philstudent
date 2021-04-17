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
    // debugger;
    bboxStr = bboxStr.slice(0, -1) + "'";

    opl.setQuery('way[building](' + bboxStr + ');(._;>;);out;>;');
    opl._sendRequest(drawnItems.getBounds());
});

var ol = new L.geoJSON();
ol.addTo(map);

var geocoder = L.Control.geocoder({
    collapsed: false,
    showResultIcons: true,
    defaultMarkGeocode: false,
});
geocoder.options.geocoder = L.Control.Geocoder.photon();
const Photon_adddress_structure = ['housenumber', 'type', 'street', 'locality', 'city', 'county', 'country'];
// geocoder.options.geocoder.options["reverseQueryParams"] = { format: "jsonv2" }; // only for nominatim
var opl = new L.OverPassLayer({
    minZoom: 20,
    debug: true,
    // query: 'way[building]({{bbox}});(._;>;);out;>;',
    // query: 'node(1);',
    minZoomIndicatorEnabled: false,
    noInitialRequest: true,
    beforeRequest: function() {
        // debugger;
        map.spin(true);
    },
    onError: function(xhr) { map.spin(false); },
    onTimeout: function(xhr) { map.spin(false); },
    onSuccess: function(data) {
        map.spin(false);
        // console.log(data);
        // console.log(osmtogeojson(data));
        ol.addData(osmtogeojson(data, {
            flatProperties: true
        }));
        $("#resultsTbl")[0].innerHTML = "";

        let header = "<td>Latitude</td><td>Longitude</td>";
        Photon_adddress_structure.forEach(entry => { header += `<td>${entry}</td>` });
        $("#resultsTbl").append($("<tr>").append(header));

        ol.getLayers().forEach(l => {
            // console.log(l.feature.properties);

            let osmid = l.feature.id.split('/');
            sleep(1000).then(() => {
                geocoder.options.geocoder.reverse(l.getCenter(), 90000000, response => {
                    let row = "<tr>";
                    row += "<td>" + l.getCenter().lat.toFixed(6) + "</td><td>" + l.getCenter().lng.toFixed(6) + "</td>";
                    for (item in Photon_adddress_structure) {
                        row += "<td>" + response[0].properties[Photon_adddress_structure[item]] + "</td>"
                            // console.log(response[0].properties[Photon_adddress_structure[item]]);
                    }
                    row += "</tr>";

                    $("#resultsTbl").append(row);
                    l.geocodeResult = response;
                    // console.log(response);
                    // console.log(response);
                    // debugger;
                });
            });
            // debugger;
        });
        // debugger;
    }
});

map.addLayer(opl);

function saveFile() {
    let items = [];
    ol.getLayers().forEach(l => {
        items.push(Object.assign(l.geocodeResult[0].properties, l.geocodeResult[0].center));
    });
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    // const header = Object.keys(items[0])
    header = Photon_adddress_structure;
    header = header.concat(Object.keys(ol.getLayers()[0].geocodeResult[0].center));
    const csv = [
        header.join(','), // header row first
        ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n')

    console.log(csv);
    var blob = new Blob([csv], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "test.csv");
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