var intervalSecondsCount;

function update_timing() {
    
    chrome.tabs.query({"active": true, "currentWindow": true }, function (tabs) {

        // GET BASE URL

        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url

        // Remove early components only if the domain is 'normal'
        if (base_url.includes(".")) {
            base_url = base_url.split("."); // Splits components based on '.' location
            var shortened_base_url = [base_url[base_url.length - 2], base_url[base_url.length - 1]]; // gets last two array values
            base_url = shortened_base_url.join("."); // re-joins base_url with '.'
        }

        // COUNT TIME ON SITE, AGGREGATE AND DAY

        clearInterval(intervalSecondsCount); // Clear interval to prevent multiple processes
        intervalSecondsCount = setInterval(function () {

            var now = new Date(); // Represents the current date

            // Only update time if popup is not activated
            chrome.windows.getCurrent(function(browser){

                // Browser.focused accounts for if Google Chrome is focused AND if extension is up (if it is, browser is not focused)
                if (browser.focused) {

                    // Get current times and continuously update those by one (every second)
                    chrome.storage.local.get({[base_url]: {'aggregate': 0, [now.toDateString()]: 0}}, function (result) {
                        var sitedata = result[base_url];
                        sitedata['aggregate'] = result[base_url]['aggregate'] + 1;
                        sitedata[now.toDateString()] = result[base_url][now.toDateString()] + 1;

                        // var all_aggregate = result['all-aggregate'] + 1; // Total aggregate seconds across all sites
                        
                        chrome.storage.local.set({[base_url]: sitedata}); // Set new second counts in chrome.storage
                        // chrome.storage.local.set({'all-aggregate': all_aggregate});
                    });
                }
          
            });
            
        }, 1000);
    });

}

update_timing(); // Call the update time function

// When tab changes, update app
chrome.tabs.onActivated.addListener(function () {
    // Restart timer loop with new url
    update_timing();
});

// When URL on same tab changes, update app
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Since the onUpdated function fires multiple times, update it only on !undefined
    var url = changeInfo.url;
    if (url !== undefined) {
        // Restart timer loop with new url
        update_timing();
    }
});