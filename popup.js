var now = new Date(); // current date
var yesterday = (function(d){ d.setDate(d.getDate()-1); return d} )(new Date); // yesterday
var page_pressed = 'stats-page-button'; // current page button pressed
var graph_pressed = 'today-graph'; // current graph button pressed
var userinput_datakey = now.toDateString(); // User input from button, defaults to today
var currentPage = document.getElementById('stats-page');
var chart; // chart defined above in order to allow updates
var block_list = [];

// Update popup when activated
window.onload = function () {
    update_page();
    
    // Clear all storage
    document.getElementById('sp-clear-storage').onclick = function () {
        chrome.storage.local.clear();
        update_stats_page(userinput_datakey); // refresh page
    }
}
// General function to update page -- redirects to the current page
function update_page() {
    if (page_pressed == 'stats-page-button') {
        update_stats_page(userinput_datakey);
    } else if (page_pressed == 'block-page-button') {
        update_block_page();
    } else if (page_pressed == 'settings-page-button') {

    }
}

function update_block_page() {
    // var block_input_submit = document.getElementById('block-input-submit');

    // = document.getElementById('block-input-bar').value;

}

// Update stats page html
function update_stats_page(datakey) {

    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {

        // GET BASE URL

        var base_url = (new URL(tabs[0].url)).hostname; // stores URL hostname in base_url

        // Get all statistics from all sites (don't need older days, but need to collect all objects)
        chrome.storage.local.get(null, function(items) {


            var sitenum = Object.keys(items).length; // The number of sites currently in database

            var all_sites_object = {}; // Holds seconds for all sites for datakey input
            for (var i = 0; i < sitenum; i++) {
                var site = Object.keys(items)[i]; // Run through data for each site
                var sitedata = items[site];
                if (sitedata[datakey] != null) {
                    all_sites_object[site] = sitedata[datakey];
                }
            }

            document.getElementById('expand-sitetrack-container').style.display = 'none'; // set default to none

            // Default position if no data entered -- only after 'clear storage'
            if (Object.keys(all_sites_object).length == 0) {

                document.getElementById('chart-holder').style.display = 'none';
                document.getElementById('no-data-motiv').style.display = 'block';

                // colors of graph, randomly choose for top border of quote
                var colors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 206, 86)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)'];
                document.getElementById('ndm-quote-container').style.borderTopColor = colors[Math.floor((Math.random()*5))];

                // Get random number (between 0-94, 95 quotes exist), and choose random quote from list
                var quote_text = all_quotes[Math.floor((Math.random()*95))]; // currently contains quote and author -- must separate
                var quote_author = quote_text.substring(quote_text.lastIndexOf('-'));
                quote_text = quote_text.substring(0, quote_text.lastIndexOf('-'));

                document.getElementById('ndm-quote-text').innerHTML = quote_text;
                document.getElementById('ndm-quote-author').innerHTML = quote_author;

                // Reset HTML elements in both the -e class and the regular sitetrack list
                var sitetrack = document.getElementById('sp-sitetrack-storage-e');
                sitetrack.innerHTML = '';
                sitetrack = document.getElementById('sp-sitetrack-storage');
                // Set to no data found
                sitetrack.innerHTML = "<div class='sitetrack-empty'>No data found!</div>";

            } else {

                document.getElementById('chart-holder').style.display = 'block';
                document.getElementById('no-data-motiv').style.display = 'none';

                var all_sites_object = {}; // Holds seconds for all sites for today
                for (var i = 0; i < sitenum; i++) {
                    var site = Object.keys(items)[i]; // Run through data for each site
                    var sitedata = items[site];
                    if (sitedata[datakey] != null) {
                        all_sites_object[site] = sitedata[datakey];
                    }
                }

                // Reset HTML elements in both the -e class and the regular sitetrack list
                var sitetrack = document.getElementById('sp-sitetrack-storage-e');
                sitetrack.innerHTML = '';
                sitetrack = document.getElementById('sp-sitetrack-storage');
                sitetrack.innerHTML = '';
                
                var site_stats_whole = sort_object_by_value(all_sites_object); // Sort the data by time

                display_chart(site_stats_whole); // Create graph based on input data

                for (var i = 0; i < sitenum; i++) {
                    var site = Object.keys(site_stats_whole)[i];

                    // Enumerate the times for all sites, given aggregate and each date tracked

                    var seconds = Object.values(site_stats_whole)[i];
                    var value = secondstodhms(seconds);
                    var dhms = '';
                    if (value[0] != 0) { dhms += value[0] + 'd, '; }
                    if (value[1] != 0) { dhms += value[1] + 'h, '; }
                    if (value[2] != 0) { dhms += value[2] + 'm, '; }
                    dhms += value[3] + 's';

                    var aggregate = aggregate_time(site_stats_whole);
                    var percentage = Math.round(seconds/aggregate * 1000) / 10;

                    // site length cut to preserve structure
                    var cut_site = site;
                    if (site.length > 20) {
                        cut_site = site.substring(0, 17) + '...';
                    }

                    // If 10+ items exist, add to separate 'hidden' div and add in 'expand' element
                    if (i == 10) {
                        sitetrack = document.getElementById('sp-sitetrack-storage-e');
                        document.getElementById('expand-sitetrack-container').style.display = 'block';
                    }

                    // Add to popup with following class structure in place
                    sitetrack.innerHTML += "<div class='sitetrack-element'><div class='site-dot' id='site-dot" + i
                        + "'></div><span class='sitetrack-url'><a href='http://" + site + "' target='_blank'>"
                        + cut_site + "</a>" + ": </span><span class='sitetrack-percentage'>" 
                        + percentage + "%, " + "</span><span class='sitetrack-dhms'>" + dhms + "</span></div>";

                    // who knows? hard code in before? use i to differentiate?
                    var site_dot = document.getElementById('site-dot' + i);
                    if (i == 0) { site_dot.style.background = 'rgb(255, 99, 132)'; }
                    else if (i == 1) { site_dot.style.background = 'rgb(54, 162, 235)'; }
                    else if (i == 2) { site_dot.style.background = 'rgb(255, 206, 86)'; }
                    else if (i == 3) { site_dot.style.background = 'rgb(75, 192, 192)'; }
                    else if (i == 4) { site_dot.style.background = 'rgb(153, 102, 255)'; }
                    else { site_dot.style.background = 'rgb(128, 128, 128)'; }

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

// Display chart, input 'time_range' to find by day, yesterday, and all-time. ADD THIS OR SMTHNG
function display_chart(site_stats_whole) {

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
        site_stats['other'] = remainder;
    }
    
    var site_stats_percent = convert_to_percent(site_stats);
    var ctx = document.getElementById('chart').getContext('2d');
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

// Submit button for website input
var block_input_submit = document.getElementById('block-input-submit');
block_input_submit.addEventListener('click', function() { 

    var block_input = document.getElementById('block-input-bar').value;
    // Invalid url regex -- checks losely to catch simple user error
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    var parser = document.createElement('a');
    if (pattern.test(block_input) && block_input.includes('.')) {
        parser.href = "http://" + block_input;
        document.getElementById('block-input-bar').style.borderBottomColor = '#aaaaaa';
        block_list[block_list.length] = parser.hostname;
        document.getElementById('block-input-notification').innerHTML = "<b>" + parser.hostname + "</b> has been successfully added!";
        document.getElementById('block-input-bar').style.borderBottomColor = 'green';
    } else if (block_input != '') {
        // Turn bar red to show invalid URL
        document.getElementById('block-input-bar').style.borderBottomColor = 'rgb(255,99,132)';
        document.getElementById('block-input-notification').innerHTML = "The URL you have entered is invalid -- review the 𝐢 tooltip for formatting rules.";
    }
    

}, false);

// The buttons and event listeners
var stats_page_button = document.getElementById('stats-page-button');
var block_page_button = document.getElementById('block-page-button');
var settings_page_button = document.getElementById('settings-page-button');
stats_page_button.addEventListener('click', function() { change_pressed(this.id);  }, false);
block_page_button.addEventListener('click', function(){ change_pressed(this.id); }, false);
settings_page_button.addEventListener('click', function(){ change_pressed(this.id); }, false);

// The pages (to change 'display' setting)
var stats_page = document.getElementById('stats-page');
var block_page = document.getElementById('block-page');
var settings_page = document.getElementById('settings-page');

// Input pages into object
var page_elements = {};
page_elements['stats-page-button'] = stats_page;
page_elements['block-page-button'] = block_page;
page_elements['settings-page-button'] = settings_page;

// Chart buttons
var today_graph = document.getElementById('today-graph');
var yesterday_graph = document.getElementById('yesterday-graph');
var all_time_graph = document.getElementById('all-time-graph');
today_graph.addEventListener('click', function(){ change_pressed(this.id); }, false);
yesterday_graph.addEventListener('click', function(){ change_pressed(this.id); }, false);
all_time_graph.addEventListener('click', function(){ change_pressed(this.id); }, false);
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
        update_stats_page(userinput_datakey);
    } else if (element_id.includes('page')) {
        document.getElementById(page_pressed).style.background = unpressed;
        currentPage.style.display = 'none'; // change display -> 'none' for current page
        page_pressed = element_id;
        currentPage = page_elements[page_pressed];
        currentPage.style.display = 'block';
    }

    // then flip the *new* pressed object to blue
    document.getElementById(element_id).style.background = pressed;
}

var expand_sitetrack = document.getElementById('expand-sp-sitetrack')
var sitetrack_e_display = 'none';

expand_sitetrack.addEventListener('click', function() {
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


// String of 95 inspirational quotes for 'no data found'. (Simplest way to store data.)
var all_quotes = ["Only I can change my life. No one can do it for me. - Carol Burnett", 
"Good, better, best. Never let it rest. 'Til your good is better and your better is best. - St. Jerome", 
"Life is 10% what happens to you and 90% how you react to it. - Charles R. Swindoll", 
"Failure will never overtake me if my determination to succeed is strong enough. - Og Mandino", 
"Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence. - Helen Keller", 
"Change your life today. Don't gamble on the future, act now, without delay. - Simone de Beauvoir", 
"With the new day comes new strength and new thoughts. - Eleanor Roosevelt", 
"The past cannot be changed. The future is yet in your power. - Unknown", 
"It always seems impossible until it's done. - Nelson Mandela", 
"It does not matter how slowly you go as long as you do not stop. - Confucius", 
"Set your goals high, and don't stop till you get there. - Bo Jackson", 
"You can't cross the sea merely by standing and staring at the water. - Rabindranath Tagore", 
"We should not give up and we should not allow the problem to defeat us. - A. P. J. Abdul Kalam", 
"Always do your best. What you plant now, you will harvest later. - Og Mandino",
"If you can dream it, you can do it. - Walt Disney", 
"The secret of getting ahead is getting started. - Mark Twain", 
"Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time. - Thomas A. Edison", 
"Problems are not stop signs, they are guidelines. - Robert H. Schuller", 
"If you want to conquer fear, don't sit home and think about it. Go out and get busy. - Dale Carnegie", 
"If you fell down yesterday, stand up today. - H. G. Wells", 
"Setting goals is the first step in turning the invisible into the visible. - Tony Robbins", 
"Keep your eyes on the stars, and your feet on the ground. - Theodore Roosevelt", 
"A creative man is motivated by the desire to achieve, not by the desire to beat others. - Ayn Rand", 
"Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort. - Paul J. Meyer", 
"Inflation destroys savings, impedes planning, and discourages investment. That means less productivity and a lower standard of living. - Kevin Brady", 
"Productivity is being able to do things that you were never able to do before. - Franz Kafka", 
"If we boost productivity, we can improve economic growth. - Tony Abbott", 
"Advanced technology changes the way we work and the skills we need, but it also boosts productivity and creates new jobs. - Alain Dehaze", 
"Profitability is coming from productivity, efficiency, management, austerity, and the way to manage the business. - Carlos Slim", 
"Genius is one percent inspiration and ninety-nine percent perspiration. - Thomas A. Edison", 
"Inspiration comes from within yourself. One has to be positive. When you're positive, good things happen. - Deep Roy", 
"Any job very well done that has been carried out by a person who is fully dedicated is always a source of inspiration. - Carlos Ghosn", 
"I take random inspiration from everywhere. - Edward Enninful", 
"You can't wait for inspiration. You have to go after it with a club. - Jack London", 
"I no have education. I have inspiration. If I was educated, I would be a damn fool. - Bob Marley", 
"I always dreamt of holding the bat and winning games for India. That was my inspiration to take up cricket. - Virat Kohli", 
"We shall draw from the heart of suffering itself the means of inspiration and survival. - Winston Churchill", 
"Inspiration comes from everywhere: books, art, people on the street. It is an interior process for me. - Colleen Atwood", 
"The peacock has become one of my regular sources of inspiration from nature. - Matthew Williamson", 
"I go to somewhere I haven't been and just watch people and colors. That's my inspiration. - RM", 
"We're always in the middle of two energies. Gravity is sinking you down; inspiration is pulling you up. - Mandy Ingber", 
"Excellence endures and sustains. It goes beyond motivation into the realms of inspiration. - Azim Premji", 
"Inspiration exists, but it has to find us working. - Pablo Picasso", 
"A dream doesn't become reality through magic; it takes sweat, determination and hard work. - Colin Powell", 
"Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing or learning to do. - Pele", 
"Success is the result of perfection, hard work, learning from failure, loyalty, and persistence. - Colin Powell", 
"There are no secrets to success. It is the result of preparation, hard work, and learning from failure. - Colin Powell", 
"Self-belief and hard work will always earn you success. - Virat Kohli", 
"Perseverance is the hard work you do after you get tired of doing the hard work you already did. - Newt Gingrich", 
"Success isn't always about greatness. It's about consistency. Consistent hard work leads to success. Greatness will come. - Dwayne Johnson", 
"Without hard work, nothing grows but weeds. - Gordon B. Hinckley", 
"There is no substitute for hard work. Never give up. Never stop believing. Never stop fighting. - Hope Hicks", 
"The road to success is not easy to navigate, but with hard work, drive and passion, it's possible to achieve the American dream. - Tommy Hilfiger", 
"Luck is great, but most of life is hard work. - Iain Duncan Smith", 
"Without hard work and discipline it is difficult to be a top professional. - Jahangir Khan", 
"Once you have commitment, you need the discipline and hard work to get you there. - Haile Gebrselassie", 
"The fruit of your own hard work is the sweetest. - Deepika Padukone", 
"Hard work without talent is a shame, but talent without hard work is a tragedy. - Robert Half", 
"I learned the value of hard work by working hard. - Margaret Mead", 
"There is no substitute for hard work. - Thomas A. Edison", 
"There is no substitute for hard work. - Thomas A. Edison", 
"Opportunities are usually disguised as hard work, so most people don't recognize them. - Ann Landers", 
"Put your heart, mind, and soul into even your smallest acts. This is the secret of success. - Swami Sivananda", 
"Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill", 
"Your positive action combined with positive thinking results in success. - Shiv Khera", 
"Some people dream of success, while other people get up every morning and make it happen. - Wayne Huizenga", 
"Coming together is a beginning; keeping together is progress; working together is success. - Edward Everett Hale", 
"Always be yourself, express yourself, have faith in yourself, do not go out and look for a successful personality and duplicate it. - Bruce Lee", 
"Success is where preparation and opportunity meet. - Bobby Unser", 
"Without continual growth and progress, such words as improvement, achievement, and success have no meaning. - Benjamin Franklin", 
"Try not to become a man of success, but rather try to become a man of value. - Albert Einstein", 
"Happiness lies in the joy of achievement and the thrill of creative effort. - Franklin D. Roosevelt", 
"A strong, positive self-image is the best possible preparation for success. - Joyce Brothers", 
"Communication - the human connection - is the key to personal and career success. - Paul J. Meyer", 
"Failure is the key to success; each mistake teaches us something. - Morihei Ueshiba", 
"Success is not a good teacher, failure makes you humble. - Shah Rukh Khan", 
"Success consists of going from failure to failure without loss of enthusiasm. - Winston Churchill", 
"There is only one happiness in this life, to love and be loved. - George Sand", 
"The greatest gift of life is friendship, and I have received it. - Hubert H. Humphrey", 
"Smile in the mirror. Do that every morning and you'll start to see a big difference in your life. - Yoko Ono", 
"Death is not the greatest loss in life. The greatest loss is what dies inside us while we live. - Norman Cousins", 
"Lighten up, just enjoy life, smile more, laugh more, and don't get so worked up about things. - Kenneth Branagh", 
"Because of your smile, you make life more beautiful. - Thich Nhat Hanh", 
"Live life to the fullest, and focus on the positive. - Matt Cameron", 
"It's all about quality of life and finding a happy balance between work and friends and family. - Philip Green", 
"My family is my life, and everything else comes second as far as what's important to me. - Michael Imperioli", 
"Life is the art of drawing without an eraser. - John W. Gardner", 
"Life is full of happiness and tears; be strong and have faith. - Kareena Kapoor Khan", 
"In three words I can sum up everything I've learned about life: it goes on. - Robert Frost", 
"There are two great days in a person's life - the day we are born and the day we discover why. - William Barclay", 
"Loneliness adds beauty to life. It puts a special burn on sunsets and makes night air smell better. - Henry Rollins", 
"Be happy for this moment. This moment is your life. - Omar Khayyam", 
"The biggest adventure you can take is to live the life of your dreams. - Oprah Winfrey", 
"Life is like riding a bicycle. To keep your balance, you must keep moving. - Albert Einstein"];