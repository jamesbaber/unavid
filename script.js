socket = new WebSocket("wss://b.unavid.co.uk");

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

// Set the status line above the video
function updateStatus() {
	// Get current session token from page
	oldSessionToken = document.getElementById("sessionToken").innerHTML;
	// Only update if it's changed to stop the deselection issue
	if (oldSessionToken != sessionToken) {
		document.getElementById("sessionToken").innerHTML = sessionToken;
	}

	// Update the session viewer (peers) count
	document.getElementById("sessionViewers").innerHTML = sessionViewers - 1;

	// Update the latency
	document.getElementById("sessionLatency").innerHTML = latency;
}

surpressEventTransmission = 1;
// If click event occurs anywhere on body
$( document ).ready(function() {
	jQuery(document.body).on("click", function(event) {
		// Set flag to allow video events to be transmitted to server
		surpressEventTransmission = 0;
	});
});

// When connection opens
socket.onopen = function(e) {
	document.getElementById("headerMessage").style.visibility = "visible";
};

socket.onmessage = function(event) {
	if (stringIsJSON(event.data)) {
		message = JSON.parse(event.data)

		// Print all messages to console for debugging. Exclude echo messages.
		if (message.command != "echo") {
			console.log(message)
		}

		// Get handle on main player.
		var mainPlayer = document.getElementById("mainPlayer");

		// When media player pauses
		mainPlayer.onpause = function(e) {
			console.log("Pause event")

			if (! surpressEventTransmission) {
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestPauseMedia",
					time: mainPlayer.currentTime,
				}));
				surpressEventTransmission = 0;
			}
		};

		delayedPlay = 0
		mainPlayer.onplay = function(e) {
			console.log("Play event")

			if (! surpressEventTransmission) {
				if (delayedPlay == 1) {
					delayedPlay = 0;
					return;
				}
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestPlayMedia",
					time: mainPlayer.currentTime,
				}));

				e.preventDefault()
				surpressEventTransmission = 1;
				mainPlayer.pause()


				var delay = (latency * 2);

				setTimeout(function() {
					delayedPlay = 1;
					if (socket.readyState === socket.OPEN) {
						mainPlayer.play();
						surpressEventTransmission = 0;
					}
				}, delay)
			}
		};

		mainPlayer.onseeked = function() {
			console.log("Seek event")

			if (! surpressEventTransmission) {
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestSeek",
					time: mainPlayer.currentTime,
				}));
				surpressEventTransmission = 0;
			}
		};

		if (message.command == "echo") {
			socket.send(JSON.stringify({
				command: "echoAck"
			}))
			latency = message.previousLatency,
			sessionViewers = message.sessionViewers
			updateStatus();
		}

		if (message.command == "setUUID") {
			uuid = message.uuid;
			socket.send(JSON.stringify({
				command: "joinSession",
				token: sessionToken,
			}));
		}

		if (message.command == "setMediaSource") {
			mainPlayer.src = message.sourceURL;
			sessionToken = message.token

			mainPlayer.currentTime = message.time;
			if (message.state == 0) {
				mainPlayer.pause()
			} else if (message.state == 1) {
				mainPlayer.play()
			}
			console.log(mainPlayer.readyState)
			window.history.replaceState({}, document.title, "/" + "player.html?t=" + sessionToken);
			updateStatus();
		}

		if (message.command == "pauseMedia") {
			surpressEventTransmission = 1;
			mainPlayer.currentTime = message.time;
			mainPlayer.pause();
		}

		if (message.command == "playMedia") {
			surpressEventTransmission = 1;
			mainPlayer.currentTime = message.time;
			mainPlayer.play();
		}

		// Seek to new time
		if (message.command == "seek") {
			mainPlayer.currentTime = message.time;
		}
	}
};

// Reload page in 0-2 seconds to reduce server load
function reloadPageStaggered() {
	document.getElementById("headerMessage").style.visibility = "hidden";

	setTimeout(function() {
		location.reload();
	}, (Math.random() * 2000))
}

// If the socket closes
socket.onclose = function(event) {
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
	reloadPageStaggered();
};
