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
console.log(sessionToken)
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

    staticNew = "This is " + sessionToken + ", you are one of "
    staticOld = document.getElementById("static").innerHTML
    if (staticNew != staticOld) {
        document.getElementById("static").innerHTML = staticNew;
    }

    document.getElementById("dynamic").innerHTML =  sessionViewers + " viewers. Latency to server is " + latency + "ms"
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
    console.log(message)

    var mainPlayer = document.getElementById("mainPlayer");

    mainPlayer.onpause = function(e) {
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
      mainPlayer.pause();
      sessionToken = message.token
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
    window.location.href = "index.html";
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
};
