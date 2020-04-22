socket = new WebSocket("wss://b.unavid.co.uk");

latency = 0;
uuid = 0;
sessionViewers = 1
sessionToken = "0"

const queryString = window.location.search;
const parameters = new URLSearchParams(queryString);
sessionToken = parameters.get("t")
if (sessionToken == null) {
    sessionToken = "0"
}
sessionToken = sessionToken.toLowerCase().replace(/[^a-z-]/g, "");
//console.log(sessionToken)
//window.history.replaceState({}, document.title, "/" + sessionToken); // Looks nice but counterintuative

/*
Can redirect to different page on reload
window.onbeforeunload = function() {
    window.setTimeout(function () {
        window.location = "player.html?t=" + sessionToken
    }, 0);
window.onbeforeunload = null; // necessary to prevent infinite loop, that kills your browser
}*/

function updateStatus() {
	// Update the session token span if it's changed
    oldSessionToken = document.getElementById("sessionToken").innerHTML;
    if (oldSessionToken != sessionToken) {
        document.getElementById("sessionToken").innerHTML = sessionToken;
    }

	// Update the session viewer count
	document.getElementById("sessionViewers").innerHTML = sessionViewers - 1;

	// Update the latency
	document.getElementById("sessionLatency").innerHTML = latency;
}

surpressEventTransmission = 1;

$( document ).ready(function() {
    jQuery(document.body).on("click", function(event) {
        surpressEventTransmission = 0;
    });
});

socket.onopen = function(e) {
    //writeStatus("Connected. Waiting for instructions from puppet master.")
};

socket.onmessage = function(event) {
    message = JSON.parse(event.data)
    if (message.command != "echo") {
        console.log(message)
    }

    var mainPlayer = document.getElementById("mainPlayer");

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
                return
            }
            socket.send(JSON.stringify({
                uuid: uuid,
                  command: "requestPlayMedia",
                  time: mainPlayer.currentTime,
            }))

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

  if (message.command == "seek") {
      mainPlayer.currentTime = message.time;
  }
};

socket.onclose = function(event) {
  if (event.wasClean) {
    setTimeout(function() {
        location.reload();
    }, 1000)
  } else {
    //writeStatus("Connection load. Reloading...")
    //window.location.href = "index.html";
    mainPlayer.pause();
    mainPlayer.style.display  = "none"

    setTimeout(function() {
        location.reload();
    }, 1000)
  }
};

socket.onerror = function(error) {
    setTimeout(function() {
        location.reload();
    }, 1000)
};
