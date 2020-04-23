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
function updateHeaderMessage() {
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
	// Check string is safe to parse before parsing into JSON format
	if (stringIsJSON(event.data)) {
		message = JSON.parse(event.data)

		// Print all messages to console for debugging. Exclude echo messages.
		if (message.command != "echo") {
			console.log(message)
		}

		// Get handle on main player.
		var mainPlayer = document.getElementById("mainPlayer");

		// Media player pause event
		mainPlayer.onpause = function(e) {
			console.log("Pause event")

			// If event was generated locally by user
			if (!surpressEventTransmission) {
				// Transmit event to server
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestPauseMedia",
					time: mainPlayer.currentTime,
				}));
			}
		};

		// Media player play event
		mainPlayer.onplay = function(e) {
			console.log("Play event")
			// If event was generated locally by user
			if (! surpressEventTransmission) {
				// If the delay period before local media playback has elapsed
				if (delayedPlay == 1) {
					// Reset flag
					delayedPlay = 0;
					// Continue with event as usual
					return;
				}

				// Try and stop the media player playing but probably won't work
				e.preventDefault()
				// Make sure the following pause isn't transmitted
				surpressEventTransmission = 1;
				// Pause temporarily
				mainPlayer.pause()

				// Wait 2x the connection latency before playing the video locally
				var delay = (latency * 2);
				setTimeout(function() {
					delayedPlay = 1;
					// If the socket is connected
					if (socket.readyState === socket.OPEN) {
						// Play locally
						mainPlayer.play();
						surpressEventTransmission = 0; // not sure about this
					}
				}, delay)

				// Send event to server
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestPlayMedia",
					time: mainPlayer.currentTime,
				}));
			}
		};

		// Media player seek event
		mainPlayer.onseeked = function() {
			console.log("Seek event")
			// If event was generated locally by user
			if (!surpressEventTransmission) {
				// Transmit event to server
				socket.send(JSON.stringify({
					uuid: uuid,
					command: "requestSeek",
					time: mainPlayer.currentTime,
				}));
			}
		};

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
		}

		// First message from server. Set local UUID for all future communication to server
		if (message.command == "setUUID") {
			uuid = message.uuid;

			// Reply with join session request and token
			socket.send(JSON.stringify({
				command: "joinSession",
				token: sessionToken,
			}));
		}

		// Set the media source - first main update from server. May need to be split out later
		if (message.command == "setMediaSource") {
			// Set session information
			mainPlayer.src = message.sourceURL;
			sessionToken = message.token

			// Set initial media time
			mainPlayer.currentTime = message.time;

			// Set player state
			if (message.state == 0) {
				mainPlayer.pause()
			} else if (message.state == 1) {
				mainPlayer.play()
			}
			// Ensure the event doesn't get sent back out to the server - it already knows!
			surpressEventTransmission = 1;

			// Set the window URL get parameter to match the correct token as if the form was filled out correctly
			window.history.replaceState({}, document.title, "/" + "player.html?t=" + sessionToken);

			// Update header message div
			updateHeaderMessage();
		}

		// Pause media
		if (message.command == "pauseMedia") {
			// Ensure the pause event doesn't get sent back out to the server - it already knows!
			surpressEventTransmission = 1;

			// Set time and stop media playback
			mainPlayer.currentTime = message.time;
			mainPlayer.pause();
		}

		// Play media
		if (message.command == "playMedia") {
			// Ensure the play event doesn't get sent back out to the server - it already knows!
			surpressEventTransmission = 1;

			// Set time and start media playback
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
