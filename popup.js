var now = new Date();
var yesterday = (function(d){ d.setDate(d.getDate()-1); return d} )(new Date);
var head_pressed = "stats-head"; // current head button pressed
var graph_pressed = "today-graph"; // current graph button pressed
var userinput_datakey = now.toDateString(); // User input from button, defaults to today
var chart;

// Update popup when activated
window.onload = function () {
    update_extension_html(graph_pressed);
    // Clear all storage
    document.getElementById("sp-clear-storage").onclick = function () {
        chrome.storage.local.clear();
        // REFRESH SOMEHOW???
    }
}

// Update extension html
function update_extension_html(datakey) {

    chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, function (tabs) {

        // GET BASE URL

        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url
        // Remove early components only if the domain is 'normal'
        if (base_url.includes(".")) {
            base_url = base_url.split("."); // Splits components based on '.' location
            var shortened_base_url = [base_url[base_url.length - 2], base_url[base_url.length - 1]]; // gets last two array values
            base_url = shortened_base_url.join("."); // re-joins base_url with '.'
        }

        // Get all statistics from all sites (don't need older days, but need to collect all objects)
        chrome.storage.local.get(null, function(items) {

            var sitenum = Object.keys(items).length; // The number of sites currently in database

            var all_sites_object = {}; // Holds seconds for all sites for today
            for (var i = 0; i < sitenum; i++) {
                var site = Object.keys(items)[i]; // Run through data for each site
                var sitedata = items[site];
                if (sitedata[userinput_datakey] != null) {
                    all_sites_object[site] = sitedata[userinput_datakey];
                }
            }

            // Reset HTML elements in both the -e class and the regular sitetrack list
            var sitetrack = document.getElementById("sp-sitetrack-storage-e");
            sitetrack.innerHTML = "";
            sitetrack = document.getElementById("sp-sitetrack-storage");
            sitetrack.innerHTML = "";
            
            var site_stats_whole = sort_object_by_value(all_sites_object); // Sort the data by time

            pie_chart(site_stats_whole); // Create graph based on input data

            for (var i = 0; i < sitenum; i++) {
                var site = Object.keys(site_stats_whole)[i];

                // Enumerate the times for all sites, given aggregate and each date tracked

                var seconds = Object.values(site_stats_whole)[i];
                var value = secondstodhms(seconds);
                var dhms = "";
                if (value[0] != 0) { dhms += value[0] + "d, "; }
                if (value[1] != 0) { dhms += value[1] + "h, "; }
                if (value[2] != 0) { dhms += value[2] + "m, "; }
                dhms += value[3] + "s";

                var aggregate = aggregate_time(site_stats_whole);
                var percentage = Math.round(seconds/aggregate * 1000) / 10;

                // site length cut to preserve structure
                var cut_site = site;
                if (site.length > 20) {
                    cut_site = site.substring(0, 17) + "...";
                }

                if (i == 10) { sitetrack = document.getElementById("sp-sitetrack-storage-e"); }

                // Add to popup with following class structure in place
                sitetrack.innerHTML += "<div class='sitetrack-element'><div class='site-dot' id='site-dot" + i
                    + "'></div><span class='sitetrack-url'><a href='http://" + site + "' target='_blank'>"
                    + cut_site + "</a>" + ": </span><span class='sitetrack-percentage'>" 
                    + percentage + "%, " + "</span><span class='sitetrack-dhms'>" + dhms + "</span></div>";

                // who knows? hard code in before? use i to differentiate?
                var site_dot = document.getElementById("site-dot" + i);
                if (i == 0) { site_dot.style.background = 'rgb(255, 99, 132)'; }
                else if (i == 1) { site_dot.style.background = 'rgb(54, 162, 235)'; }
                else if (i == 2) { site_dot.style.background = 'rgb(255, 206, 86)'; }
                else if (i == 3) { site_dot.style.background = 'rgb(75, 192, 192)'; }
                else if (i == 4) { site_dot.style.background = 'rgb(153, 102, 255)'; }
                else { site_dot.style.background = 'rgb(128, 128, 128)'; }

            }


        });

    });

}

// Convert seconds to 'dhms', more readable form
function secondstodhms(seconds) {
    var d = Math.floor(seconds/86400);
    var h = Math.floor(seconds/3600);
    var m = Math.floor((seconds%3600)/60);
    var s = Math.floor(seconds%60);
    return [d, h, m, s];
}

// DATA VISUALIZATION

// Display pie chart, input 'time_range' to find by day, yesterday, and all-time. ADD THIS OR SMTHNG
function pie_chart(site_stats_whole) {

    // CONSOLIDATE REMAINDER AND PLACE INTO OTHER, CONVERT TO PERCENTAGE

    var remainder = 0; // remainder for the 'other' category
    var site_stats = {}; // put sites past 10 into 'other'
    var display_number = 5;
    for (i = 0; i < Object.keys(site_stats_whole).length; i++) {

        var key = Object.keys(site_stats_whole)[i];
        var value = Object.values(site_stats_whole)[i];
        if (i > display_number-1) {
            remainder += value;
        } else {
            site_stats[key] = value;
        }
    }
    if (remainder != 0) {
        site_stats["other"] = remainder;
    }
    
    var site_stats_percent = convert_to_percent(site_stats);
    var ctx = document.getElementById("chart").getContext('2d');
    if (chart == null) {
        chart = new Chart(ctx, {
            type: 'pie',
            options: {
                response: false,
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    callbacks: {
                        title: function (tooltipItem, data) {
                            return data.labels[tooltipItem[0]['index']];
                        },
                        label: function (tooltipItem, data) {
                            return data.datasets[0].data[tooltipItem['index']] + '%';
                        }
                    },
                    backgroundColor: '#FFF',
                    titleFontSize: 16,
                    titleFontColor: '#000',
                    bodyFontColor: '#000',
                    bodyFontSize: 14,
                    displayColors: false
                },
                title: {
                    display: true,
                    position: 'top',
                    text: 'Time Tracker'
                },
                legend: {
                    display: false
                }
            },
            data: {
                labels: Object.keys(site_stats_percent),
                datasets: [{
                    label: 'Seconds',
                    data: Object.values(site_stats_percent),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(128, 128, 128, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(128, 128, 128, 1)'
                    ],
                    borderWidth: 1
                }]
            }
        });
    } else {
        chart.data.labels = Object.keys(site_stats_percent);
        chart.data.datasets[0].data = Object.values(site_stats_percent);
        chart.update();
    }

}

// Sort object by value
function sort_object_by_value(items) {

    var sortable = [];
    for (var item in items) {
        sortable.push([item, items[item]]);
    }

    sortable.sort(function (a, b) {
        return b[1] - a[1];
    });

    var object = {};

    for (i = 0; i < sortable.length; i++) {
        var key = Object.values(sortable)[i][0];
        var value = Object.values(sortable)[i][1];
        object[key] = value;
    }

    return object;

}

// Convert to percentages, specialized for input above
function convert_to_percent(items) {
    var aggregate = 0;
    Object.values(items).forEach(function(item) {
        aggregate += item;
    });
    var object = {};
    Object.keys(items).forEach(function(item) {
        object[item] = Math.round(items[item]/aggregate * 1000) / 10;
    });
    return object;
}

// Get aggregate time for dataset
function aggregate_time(items) {
    var length = Object.keys(items);
    var aggregate = 0;
    Object.values(items).forEach(function(item) {
        aggregate += item;
    });
    return aggregate;
}

// BUTTON PRESSES AND CORRESPONDING FUNCTION ACTIVATION

var pressed = 'rgba(54, 162, 235, 0.2)';
var unpressed = 'white';

var stats_head = document.getElementById("stats-head");
var block_head = document.getElementById("block-head");
var settings_head = document.getElementById("settings-head");
stats_head.addEventListener("click", function() { change_pressed(this.id);  }, false);
block_head.addEventListener("click", function(){ change_pressed(this.id); }, false);
settings_head.addEventListener("click", function(){ change_pressed(this.id); }, false);

var today_graph = document.getElementById("today-graph");
var yesterday_graph = document.getElementById("yesterday-graph");
var all_time_graph = document.getElementById("all-time-graph");
today_graph.addEventListener("click", function(){ change_pressed(this.id); }, false);
yesterday_graph.addEventListener("click", function(){ change_pressed(this.id); }, false);
all_time_graph.addEventListener("click", function(){ change_pressed(this.id); }, false);
// Match the graph ids to the datakey inputs
var graph_elements = {};

graph_elements['today-graph'] = now.toDateString();
graph_elements['yesterday-graph'] = yesterday.toDateString();
graph_elements['all-time-graph'] = 'aggregate';

// connection between button and action. you can see which is currently pressed
function change_pressed(element_id) {
    if (element_id.includes('graph')) {
        // set past pressed element in 'graph' subset to white (undo previous 'pressed' action)
        document.getElementById(graph_pressed).style.background = unpressed;
        graph_pressed = element_id;
        userinput_datakey = graph_elements[graph_pressed];
    } else if (element_id.includes('head')) {
        document.getElementById(head_pressed).style.background = unpressed;
        head_pressed = element_id;
    }

    update_extension_html(graph_pressed);
    // then flip the *new* pressed object to blue
    document.getElementById(element_id).style.background = pressed;
}

var expand_sitetrack = document.getElementById('expand-sp-sitetrack')
var sitetrack_e_display = 'none';

expand_sitetrack.addEventListener("click", function() {
    if (sitetrack_e_display == 'none') { 
        sitetrack_e_display = 'block';
        expand_sitetrack.value = '▲';
        expand_sitetrack.style.marginTop = '-5px';
    } else { 
        sitetrack_e_display = 'none'; 
        expand_sitetrack.value = '▼';
        expand_sitetrack.style.marginTop = '0px';
    }
    document.getElementById('sp-sitetrack-storage-e').style.display = sitetrack_e_display;
});
