// Update popup when activated
window.onload = function () {
    update_extension_html();
    // Clear all storage
    document.getElementById("sp-clear-storage").onclick = function () {
        chrome.storage.local.clear();
    }
}

// Update extension html
function update_extension_html() {

    chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, function (tabs) {

        // GET BASE URL

        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url
        // Remove early components only if the domain is 'normal'
        if (base_url.includes(".")) {
            base_url = base_url.split("."); // Splits components based on '.' location
            var shortened_base_url = [base_url[base_url.length - 2], base_url[base_url.length - 1]]; // gets last two array values
            base_url = shortened_base_url.join("."); // re-joins base_url with '.'
        }

        pie_chart();

        // Get all statistics from all sites (don't need older days, but need to collect all objects)
        chrome.storage.local.get(null, function(items) {

            var sitenum = Object.keys(items).length; // The number of sites currently in database

            for (var i = 0; i < sitenum; i++) {
                var site = Object.keys(items)[i];
                
                var sitetrack = document.getElementById("sp-sitetrack-storage");
                sitetrack.innerHTML += "<div class='sitetrack-element'><div class='site-header'>" + site + "</div>";



                var sitedata = items[site];
                var sitedatalength = Object.keys(sitedata).length;

                // Enumerate the times for all sites, given aggregate and each date tracked
                for (var j = 0; j < sitedatalength; j++) {
                    var key = Object.keys(sitedata)[j];
                    var value = secondstodhms(Object.values(sitedata)[j]);
                    var dhms = "";
                    dhms += value[0] + "d, ";
                    dhms += value[1] + "h, ";
                    dhms += value[2] + "m, ";
                    dhms += value[3] + "s";
                    
                    // Add to popup with following class structure in place
                    sitetrack.innerHTML += "<div class='sitetrack-datapoint'><span class='key'>" + key + ": " +
                            "</span><span class='value'>" + dhms + "</span></div>";
                }

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

// Display pie chart
function pie_chart() {

    // Print out all keys/values in storage
    chrome.storage.local.get(null, function (items) {
        var now = new Date(); // Represents the current date
        console.log(items);
        // Sort objects by value to allow correct input into pie chart
        var sitenum = Object.keys(items).length; // The number of sites currently in database

        var all_sites_today = {}; // Holds seconds for all sites for today
        for (var i = 0; i < sitenum; i++) {
            var site = Object.keys(items)[i]; // Run through data for each site
            var sitedata = items[site];
            all_sites_today[site] = sitedata[now.toDateString()];
        }
        
        var site_stats_whole = sort_object_by_value(all_sites_today); // Sort the data by time

        // CONSOLIDATE REMAINDER AND PLACE INTO OTHER, CONVERT TO PERCENTAGES

        var remainder = 0; // remainder for the 'other' category
        var site_stats = {}; // put sites past 10 into 'other'
        var display_number = 10;
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

        var ctx = document.getElementById("myChart").getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'pie',
            options: {
                response: false,
                tooltips: {
                    enabled: true,
                    mode: 'single',
                    callbacks: {
                        title: function (tooltipItem, data) {
                            return data['labels'][tooltipItem[0]['index']];
                        },
                        label: function (tooltipItem, data) {
                            return data['datasets'][0]['data'][tooltipItem['index']] + '%, ';
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
                },
                animation: {
                    duration: 0,
                },
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

    });

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