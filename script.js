function SelectText(element) {

    var text = document.getElementById(element);    

	if (document.body.createTextRange) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(text);
		range.select();
    } else if (window.getSelection) { // Other browsers
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
	}
	
	// Copy the text to the clipboard
	document.execCommand("copy");

	// Deselect the text
	if (document.body.createTextRange) { // ms
		// ?
	} else {
		setTimeout(function() {
			selection.removeAllRanges();
		}, 200)
	}
}


socket = new WebSocket("wss://b.unavid.co.uk");
//socket = new WebSocket("ws://192.168.2.80:8080");

latency = 0;
uuid = 0;
sessionViewers = 1
sessionToken = "0"

function getTokenInput() {
	// Get form result including token
	const queryString = window.location.search;
	const parameters = new URLSearchParams(queryString);
	// Get parameter called t
	sessionToken = parameters.get("t")
	// If token undefined then default "0"
	if (sessionToken == null) {
		sessionToken = "0"
	}
	// Convert to lowercase and only allow letters and hyphens
	sessionToken = sessionToken.toLowerCase().replace(/[^a-z-]/g, "");
}

getTokenInput();

/*
	Can redirect to different page on reload
	window.onbeforeunload = function() {
		window.setTimeout(function () {
			window.location = "player.html?t=" + sessionToken
		}, 0);
		window.onbeforeunload = null; // necessary to prevent infinite loop, that kills your browser
	}
*/

// Returns true if string is json and safe to parse
function stringIsJSON(string) {
	try {
		JSON.parse(string);
	} catch (e) {
		return(false);
	}
	return(true);
}

function requestMediaChange() {
	var newSourceURL = document.getElementById("newMediaInput").innerHTML;

	socket.send(JSON.stringify({
		uuid: uuid,
		token: sessionToken,
		command: "requestMediaChange",
		sourceURL: newSourceURL,
	}));
}

// Set the status line above the video
function updateHeaderMessage() {
	document.getElementById("headerMessage").style.visibility = "visible";
	document.getElementById("player").style.visibility = "visible";
	document.getElementById("controls").style.visibility = "visible";

	// Get current session token from page
	oldSessionToken = document.getElementById("sessionToken").innerHTML;
	// Only update if it's changed to stop the deselection issue
	if (oldSessionToken != sessionToken) {
		document.getElementById("sessionToken").innerHTML = sessionToken;
	}

	// Update the session viewer (peers) count
	document.getElementById("sessionViewers").innerHTML = sessionViewers - 1;

	// Update the latency
	latency = Math.floor(latency)
	document.getElementById("sessionLatency").innerHTML = latency;
	if (latency < 300) {
		document.getElementById("sessionLatency").style = "color: green";
	} else {
		document.getElementById("sessionLatency").style = "color: red";
	}
}

hadFocus = 0;

$(function(){

	const progress = document.querySelector(".progress")
	const handle = document.querySelector(".handle")

	window.seekTo = function(e) {
		
		if (hadFocus == 1) {
			const percent = e.target.value;
			var newTime = Math.round(((percent / 100) * mainPlayer.duration) * 1000) / 1000;
			//mainPlayer.currentTime = newTime

			socket.send(JSON.stringify({
				uuid: uuid,
				token: sessionToken,
				command: "requestSeek",
				time: newTime,
			}));
		}
	}

	seekTo({
		target: document.querySelector("#seek-range")
	});
})

setInterval(function() {
	if (mainPlayer.duration > 0) {
		document.getElementById("seek-range").value = (mainPlayer.currentTime / mainPlayer.duration) * 100;
	} else {
		document.getElementById("seek-range").value = 0;
	}
}, 50);


// When connection opens
socket.onopen = function(e) {
	console.log("Connected")
};

var playing = 0;

function UIPlayPause() {
	console.log("Play/pause event")

	if (playing == 0) {
		// Send event to server
		socket.send(JSON.stringify({
			uuid: uuid,
			token: sessionToken,
			command: "requestPlayMedia",
			time: mainPlayer.currentTime,
		}));

		playing = 1;
	} else {
		// Send event to server
		socket.send(JSON.stringify({
			uuid: uuid,
			token: sessionToken,
			command: "requestPauseMedia",
			time: mainPlayer.currentTime,
		}));

		playing = 0;
	}
}

function UIGoToStart() {
	mainPlayer.currentTime = 0;
	console.log("Seek event")
	// Transmit event to server
	socket.send(JSON.stringify({
		uuid: uuid,
		token: sessionToken,
		command: "requestSeek",
		time: mainPlayer.currentTime,
	}));

	socket.send(JSON.stringify({
		uuid: uuid,
		token: sessionToken,
		command: "requestPauseMedia",
		time: mainPlayer.currentTime,
	}));

	playing = 0;
}

function UIChangeMedia() {
	console.log("Change media")
	var newURL = document.getElementById("newMediaInput").value;

	socket.send(JSON.stringify({
		uuid: uuid,
		token: sessionToken,
		command: "requestNewMediaSource",
		sourceURL: newURL,
	}));
}

var latencyHistory = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
sparkConfig = {height: 43, width: 100, fillColor: false, normalRangeMin: "0", normalRangeMax: "30", normalRangeColor: "#FFFFFF"};

socket.onmessage = function(event) {
	// Check string is safe to parse before parsing into JSON format
	if (stringIsJSON(event.data)) {
		message = JSON.parse(event.data)

		// Print all messages to console for debugging. Exclude echo messages.
		if (message.command != "echo") {
			console.log(message)
		}

		// Get handle on main player.
		var mainPlayer = document.getElementById("mainPlayer");

		// If server sent an echo request
		if (message.command == "echo") {
			// Send echo back
			socket.send(JSON.stringify({
				command: "echoAck"
			}))

			// Extract latency and viewer count from the server's original echo
			latency = message.previousLatency;
			sessionViewers = message.sessionViewers;

			// Put new statistics on the page
			updateHeaderMessage();

			latencyHistory.shift();
			latencyHistory[latencyHistory.length] = latency;
			$('.latencySparkLine').sparkline(latencyHistory, sparkConfig);
		}

		// First message from server. Set local UUID for all future communication to server
		if (message.command == "setUUID") {
			uuid = message.uuid;

			console.log("Got UUID from server. Need focus before session can start.")
			// Create focus-grabbing screen

			var keepAliveBodge = setInterval(function() {
				socket.send(JSON.stringify({
					command: "echoBodge"
				}));
			}, 5000)
			document.getElementById("warning").innerHTML = "<br/><br/><br/><center>Click to start.</center>"
			document.addEventListener("click", function() {
				socket.send(JSON.stringify({
					command: "joinSession",
					token: sessionToken,
				}));
				hadFocus = 1;
				document.getElementById("warning").innerHTML = ""
				document.removeEventListener("click", arguments.callee)
				clearInterval(keepAliveBodge);
			})
			
		}

		// Set the media source - first main update from server. May need to be split out later
		if (message.command == "setMediaSource") {
			// Set session information
			mainPlayer.src = message.sourceURL;
			mainPlayer.preload = "auto";
			sessionToken = message.token

			// Set initial media time
			mainPlayer.currentTime = message.time;

			// Set player state
			if (message.state == 0) {
				mainPlayer.pause()
				playing = 0;
			} else if (message.state == 1) {
				// Set time and start media playback
				mainPlayer.currentTime = message.time;
				mainPlayer.play().then(function() {
					playing = 1;
				}, function() {
					playing = 0;
					//alert("Playback paused. Tab must get focus.")
					//location.reload();
				})
			}

			// Set the window URL get parameter to match the correct token as if the form was filled out correctly
			window.history.replaceState({}, document.title, "/" + "player.html?t=" + sessionToken);

			// Update header message div
			updateHeaderMessage();
		}

		// Pause media
		if (message.command == "pauseMedia") {


			// Set time and stop media playback
			mainPlayer.currentTime = message.time;
			mainPlayer.pause();
			playing = 0;
		}

		// Play media
		if (message.command == "playMedia") {


			// Set time and start media playback
			mainPlayer.currentTime = message.time;
			mainPlayer.play().then(function() {
				playing = 1;
			}, function() {
				playing = 0;
				//alert("Playback paused. Tab must get focus.")
				//location.reload();
			})
		}

		// Seek to new time
		if (message.command == "seek") {
			mainPlayer.currentTime = message.time;
		}
	}
};

// Reload page in 0-2 seconds to reduce server load
function reloadPageStaggered() {
	console.log("Staggered reload procedure")
	document.getElementById("headerMessage").style.visibility = "hidden";

	setTimeout(function() {
		location.reload();
	}, (Math.random() * 2000))
}

// If the socket closes
socket.onclose = function(event) {
	console.log(event)
	if (event.wasClean) {

	} else {

	}

	// Stop the video now we're out of sync
	mainPlayer.pause();
	mainPlayer.style.display  = "none"

	reloadPageStaggered()
};

// On socket error
socket.onerror = function(error) {
	console.log("Socket error")
	reloadPageStaggered();
};
