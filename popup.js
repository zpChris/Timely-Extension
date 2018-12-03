var seconds; // Integer variable to keep track of seconds
var intervalIdCount; // The interval ID of the current setInterval() function. Cleared on new tabs
var intervalIdDisplay;
var intervalIdChart;

/*

    LISTENERS OR FUNCTIONS TO RUN APP

*/

update_tab_info(); // Always updating time

// When window loads, update app and extension html
window.onload = function () {
    update_extension_html();
    document.getElementById("sp-clear-storage").onclick = function () {
        chrome.storage.local.clear();
        seconds = 0;
        chrome.runtime.reload(); // Forced to restart extension to reset seconds
    }
}

// When tab changes, update app
chrome.tabs.onActivated.addListener(function () {
    // Restart timer loop with new url
    update_tab_info();
});

// When URL on same tab changes, update app
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Since the onUpdated function fires multiple times, update it only on !undefined
    var url = changeInfo.url;
    if (url !== undefined) {
        // Restart timer loop with new url
        update_tab_info();
    }
});

/*

    TIMER UPDATE TO CHROME.STORAGE

*/

function update_tab_info() {
    
    chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, function (tabs) {
        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url

        base_url = base_url.split("."); // Splits components based on '.' location
        var shortened_base_url = [base_url[base_url.length - 2], base_url[base_url.length - 1]]; // gets last two array values
        base_url = shortened_base_url.join("."); // re-joins base_url with '.'

        // Set initial value for seconds of that url
        chrome.storage.local.get({ [base_url]: 0 }, function (result) {
            seconds = result[base_url];
        });

        clearInterval(intervalIdCount); // Clear the previous interval before starting anew

        // Set interval ID and start the counter for that site
        intervalIdCount = setInterval(function () {
            seconds++;
            chrome.storage.local.set({ [base_url]: seconds });
        }, 1000);

    });
}

/* 

    HTML UPDATE 

*/

// Update extension html
function update_extension_html() {

    chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, function (tabs) {
        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url

        base_url = base_url.split("."); // Splits components based on '.' location
        var shortened_base_url = [base_url[base_url.length - 2], base_url[base_url.length - 1]]; // gets last two array values
        base_url = shortened_base_url.join("."); // re-joins base_url with '.'

        pie_chart();


        /* All keys/values */
        chrome.storage.local.get(null, function(items) {
            var site_stats = sort_object_by_value(items);
            var allKeys = Object.keys(site_stats);
            var allValues = Object.values(site_stats);
            for (i = 0; i < allKeys.length; i++) {
                var h = Math.floor(allValues[i]/3600);
                var m = Math.floor((allValues[i]%3600)/60);
                var s = Math.floor(allValues[i]%60);
                document.getElementById("sp-sitetrack-storage").innerHTML += "<span id='mydot'></span><b>" + allKeys[i] + ":</b> " + h + "h, " + m + "m, " + s + "s" + "<hr>";
            }
        });

        // Display url
        document.getElementById("sp-weblink").innerHTML = base_url;
        // Fetch the seconds from chrome.storage, it will constantly update

        clearInterval(intervalIdDisplay); // Clear the previous interval before starting anew

        intervalIdDisplay = setInterval(function () {

            chrome.storage.local.get({ [base_url]: 0 }, function (result) {
                document.getElementById("sp-webtimer").innerHTML = result[base_url] + "s";
            });

        }, 1000);

    });

}

/*

    DATA VISUALIZATION

*/

// Display pie chart
function pie_chart() {

    // Print out all keys/values in storage
    chrome.storage.local.get(null, function (items) {
        // Sort objects by value to allow correct input into pie chart
        var site_stats_whole = sort_object_by_value(items); // all sites enumerated
        var remainder = 0; // remainder for the 'other' category
        var site_stats = {}; // put site past 5 into 'other'
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

// Sort object by value; personalized for the object function by combining remaining elements
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