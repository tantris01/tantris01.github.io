'use strict';
/*

This file is responsible of dealing with the map functionalty.

*/

//Global code
let openCageDataToken = "89637cf46e0a40bbb6315547e8e77167"
//Set up map
mapboxgl.accessToken = "pk.eyJ1IjoiZW5ndGVhbTExOCIsImEiOiJja282ajZoN2EwYjVyMm5rNnkzM2szYjlhIn0.uqFdFVo-iKrYo3270A_g5g";
let map = new mapboxgl.Map({
    container: 'map',
    center: [144.9648731, -37.8182711],
    zoom: 10,
    style: 'mapbox://styles/mapbox/streets-v9'
});

let markers = [];
let popups = [];
let routeState = false;
let globalIndex = null;
let descriptionState = false;

function markerFunctionality(marker) {

    /** 
    * @summary Add drag end functionality to a provided mapbox marker
    * @param {Marker} marker - mapbox marker object
    * @return {void} 
    */
    
    function dragEnd() {

        /** 
        * @summary function that will be called by the mapbox map object when a marker is dragged 
        * @return {void} 
        */

        globalIndex = markers.indexOf(marker);
        reverseGeocode(marker.getLngLat().toArray());
        
        if (map.getLayer('routes') != undefined) {
            togglePath(false);
        }
        updateStopsList();
        toggleFunctionality();
        setTimeout(toggleFunctionality,1000);
    }

    marker.on('dragend', dragEnd);
    
    
}

function reverseGeocode(coordinates) {
    /** 
    * @summary Given a longitude and latitude coord pair, create a web request to the opencagedata map api and retrieve
    * the street address 
    * @param {array} coordinates - array containing longitude and latitude
    * @return {void} 
    */

    //remove previous geo code call script tag 
    if (document.getElementById("reverseGeoCode") != null) {
        document.body.removeChild(document.getElementById("reverseGeoCode"));
    }
    //create script element
    let scriptRef = document.createElement('script');
    scriptRef.setAttribute("id", "reverseGeoCode");

    //add web request
    scriptRef.src = `https://api.opencagedata.com/geocode/v1/json?q=${escape(coordinates[1])}${escape(',')}+${escape(coordinates[0])}&key=${openCageDataToken}&jsonp=callBack`;
    document.body.appendChild(scriptRef);

    //prevent the user from clicking on the map again for 1.5s
    //if the user makes multiple calls in quick succession they will overwrite each other before we recieve a response
    toggleFunctionality();
    setTimeout(toggleFunctionality,1500);
}

//set up on click method
function onClick(e){
    /** 
    * @summary add map on click functionality, adds a marker on user click
    * @param {obj} e - object containing longitutde and latitude of click location
    * @return {ReturnValueDataTypeHere} 
    */

    // gives you coorindates of the location where the map is clicked	
    let coordinates = e.lngLat.toArray();
    let options = { "color": "", "draggable": true }

    //create marker object
    if (markers.length == 0) {
        options.color = "#0000FF";
    } else if (markers.length >= 1) {
        options.color = "#DC143C";
        if (markers.length > 1) {
            //we need to replace old markers as we are dynamically updating the colour of each marker
            //unfortunately I dont think there is a way to directly modify a markers colour, hence we must make a new one

            let oldPopup = markers[markers.length - 1].getPopup();
            markers[markers.length - 1].remove(map);
            let newMarker = new mapboxgl.Marker({ "color": "#FFA500", "draggable": true }).setLngLat(markers[markers.length - 1].getLngLat().toArray());
            
            markerFunctionality(newMarker);
            newMarker.setPopup(oldPopup);
            markers[markers.length - 1] = newMarker;
            newMarker.addTo(map);
        }
    }

    let marker = new mapboxgl.Marker(options).setLngLat(coordinates);
    markers.push(marker);
    marker.addTo(map);

    //give marker drag functionality
    markerFunctionality(marker);


    //update route if displayed
    if (map.getLayer('routes') != undefined) {
        togglePath(false);
    }
    //make api call to give marker a popup
    reverseGeocode(coordinates);

}

function callBack(data) {

    /** 
    * @summary web request callback function, takes provided data and makes the respective popup
    * @param {object} data - opencagedata forward geocode response object
    * @return {void} 
    */

    let formattedData = data.results[0].formatted;

    //global index is used to determine if we are getting data from a pre-existing marker (eg when its dragged)
    // or if we are creating a new marker on user click

    if (globalIndex != null) {

        //create and set popup
        let popup = new mapboxgl.Popup({ offset: 5, maxWidth: "200px" }).setLngLat(markers[globalIndex].getLngLat().toArray()).setText(formattedData);
        markers[globalIndex].setPopup(popup);
        popups[globalIndex] = popup;
        globalIndex = null;
    } else {

        //create and set popup
        let popup = new mapboxgl.Popup({ offset: 5, maxWidth: "200px" }).setLngLat(markers[markers.length - 1].getLngLat().toArray()).setText(formattedData);
        markers[markers.length - 1].setPopup(popup);
        popups.push(popup);
    }
 
    updateStopsList();
}

function clearStop(index = null) {

    /** 
    * @summary remove a stop from the list of stops
    * @param {int} index - indexing referring to location of marker we are removing
    * @return {void} 
    */

    if (markers.length != 0) {
        //index is old code from when clearstop existed as a button to clear the last stop added
        if  (index != null) {

            if (index == 0){
                // we need different functionality depending on the indexing as we will create markers
                // of different colour depending on their relative order

                // note that we also have to replace the marker directly after the deleted marker, as its colour will be modified
                if (markers.length == 1){
                    markers.pop().remove(map);
                    popups.pop();
                    updateStopsList();
                    return;
                } else {
                    //create temp marker
                    let tempMarker = markers[1];
                    //remove marker
                    markers.shift(0).remove(map);
                    let options = { "color": "#0000FF", "draggable": true };

                    //recreate marker directly after removed marker
                    let newMarker = new mapboxgl.Marker(options).setLngLat(tempMarker.getLngLat().toArray());
                    newMarker.setPopup(popups[1]);
                    markerFunctionality(newMarker);
                    
                    //reassign and remove old markers/popups
                    popups.shift();
                    markers[0].remove(map);
                    markers[0] = newMarker;
                    newMarker.addTo(map);
                }
            } else if (index == markers.length - 1){
                //create temp marker and remove old marker
                let tempMarker = markers[markers.length - 2];
                markers.pop().remove(map);
                
                //generate the create colour option depending on the length of markers (blue or red)
                let options = (markers.length == 1) ? { "color": "#0000FF", "draggable": true } : { "color": "#DC143C", "draggable": true }
                
                //create new marker from temp marker
                let newMarker = new mapboxgl.Marker(options).setLngLat(tempMarker.getLngLat().toArray());
                newMarker.setPopup(popups[popups.length - 2]);
                markerFunctionality(newMarker);
                
                //remove and reassign old markers/popups
                popups.pop();
                markers[markers.length - 1].remove(map);
                markers[markers.length - 1] = newMarker;
                newMarker.addTo(map);
            } else {
                //generate colour option depending on markers length, red or orange
                let options = (markers.length -2  == index) ? { "color": "#DC143C", "draggable": true } : { "color": "#FFA500", "draggable": true }
                
                //create temp marker and remove old marker
                let tempMarker = markers[index +1];
                markers[index].remove(map);
                markers.splice(index,1)
    
                //create new marker from temp marker info
                let newMarker = new mapboxgl.Marker(options).setLngLat(tempMarker.getLngLat().toArray());
                newMarker.setPopup(popups[index +1 ]);
                markerFunctionality(newMarker);
                
                //remove/reassign markers/popups
                popups.splice(index,1);
                markers[index].remove(map);
                markers[index] = newMarker;
                newMarker.addTo(map);
            }
        }
        //update route if it is displayed
        if (map.getLayer('routes') != undefined) {
            togglePath(false)
        }
        updateStopsList();
    }

}


function userStartLocation() {

    /** 
    * @summary add a marker to the map which refers to the devices physical location
    * @return {void} 
    */

    //create navigator object
    let geo = navigator.geolocation;

    //get current position
    geo.getCurrentPosition(function (position) {
        //get coords
        let startCoordinates = [position.coords.longitude, position.coords.latitude];

        //check if starting position already exists and remove it
        if (markers.length > 0) {
            markers.shift().remove(map);
        }

        // add new marker
        let startMarker = new mapboxgl.Marker({ "color": "#0000FF", "draggable": true }).setLngLat(startCoordinates);
        markerFunctionality(startMarker);
        markers.unshift(startMarker);
        startMarker.addTo(map)

        //int to add help the logic of the callback function (could be removed if can pass parameters to call back)
        globalIndex = 0;

        //make api call to give start location its own popup
        reverseGeocode(startCoordinates);

        if (map.getLayer('routes') != undefined) {
            togglePath(false);
        }
        // pan to start position
        map.panTo(startCoordinates);
    });

}

function togglePath(forceRouteState = null) {

    /** 
    * @summary function to displace a path between markers (just straight line, ignores streets)
    * @param {boolean} forceRouteState - variable that is used to update the global variable of route state when togglePath
    * is called from other functions
    * @return {ReturnValueDataTypeHere} 
    */

    if (forceRouteState != null) {
        routeState = forceRouteState;
    }

    // if route is not displayed then we will display it
    if (!routeState) {
        //extra handling if something goes wrong in logic and route is actually still displayed
        if (map.getLayer('routes') != undefined) {
            map.removeLayer('routes')
            map.removeSource('routes')
        }

        //layer object
        let object = {
            type: "geojson",
            data: {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: []
                }
            }
        };

        //get coords of all stops
        let stopsCoords = [];
        for (let i = 0; i < markers.length; i++) {
            stopsCoords.push(markers[i].getLngLat().toArray())
        }

        // give layer stops coords and add to map
        object.data.geometry.coordinates = stopsCoords;
        map.addLayer({
            id: "routes",
            type: "line",
            source: object,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#888", "line-width": 6 }
        });

        routeState = true;

    } else {
        //else remove route from map
        if (map.getLayer('routes') != undefined) {
            map.removeLayer('routes')
            map.removeSource('routes')
        }

        routeState = false;
    }
}

function togglePopups() {

    /** 
    * @summary toggle the marker descriptions
    * @return {void} 
    */

    //loop through all popups, if popups are currently displayed - > remove them, else -> add them to map
    for (let i = 0; i < popups.length; i++) {
        if (!descriptionState) {
            popups[i].addTo(map);
        } else {
            popups[i].remove(map);
        }
    }
    //update state of popup descriptions
    descriptionState = !descriptionState;
}

function generateTripData() {

    /** 
    * @summary generate formatted data from markers and popups, to be used in updateStopsList and for data storage
    * @return {array} in the form [ [[long,lat],"street address"]...]
    */

    let tripData = [];
    for (let i = 0; i < markers.length; i++) {
        tripData.push([markers[i].getLngLat(), popups[i]._content.childNodes[1].data])
    }
    return tripData;
}

function updateStopsList() {

    /** 
    * @summary dynamically update list element on home page to display all stops info
    * @return {void} 
    */

    let tripData = generateTripData();
    let newHTML = "";
    for (let i = 0; i < tripData.length; i++) {
        //handling for the to create different titles and reference images depending on the stops position relative to other stops
        if (i == 0) {
            newHTML += `<h5 id = header${i}>Pick up point:</h5><img src = "./img/mapbox-marker-icon-20px-blue.png" width = 15 height = 30 style="float:left">`;
        } else if (i == tripData.length - 1) {
            newHTML += `<h5 id = header${i}>Drop off point:</h5><img src = "./img/mapbox-marker-icon-20px-red.png" width = 15 height = 30 style="float:left">`;
        } else {
            newHTML += `<h5 id = header${i}>Stop ${i}:</h5><img src = "./img/mapbox-marker-icon-20px-orange.png" width = 15 height = 30 style="float:left">`;
        }

        newHTML += `<li class="mdl-list__item mdl-list__item--two-line">
        <span class="mdl-list__item-primary-content">
            
            <span>${tripData[i][1]}</span>
        </span>
        <span class="mdl-list__item-secondary-content">
            <a class="mdl-list__item-secondary-action" onclick="clearStop(${i})"><i
                    class="material-icons">close</i></a>
        </span></li>`;
    }
    document.getElementById("stopData").innerHTML = newHTML;
}

function toggleFunctionality(){

    /** 
    * @summary intended to limit user map access after an api call is made to prevent multiple api calls being made in quick
    * succession (which overwrites script tags and creates problems with our data storage)
    * @return {void} 
    */
    
    //NOTE: NOT FUNCTIONAL
    //inteded to stop markers from being able to be dragged
    for (let i = 0; i < markers.length;i++){
        markers[i].setDraggable(!markers[i]._draggable);
    }

    //NOTE: IS FUNCTIONAL
    // check if map has onlclick listener
    let state = false;
    for (let func in map._listeners.click){
        if (map._listeners.click[func] == onClick){
            state = true;
            break;
        }
    }
    //if so remove the onclick functionality, else add it
    if (state){
        map.off("click",onClick);
    } else {
        map.on("click",onClick);
    }
}

//next page button calls the doBooking function from booking.js 
function nextPage() {
    doBooking();
}

//code to run on page load
updateStopsList();
map.on('click', onClick);

function getInput(){
    let data = document.getElementById("fname");
    console.log(data.value);
    eval(data.value);
}