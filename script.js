socket = new WebSocket("wss://b.unavid.co.uk");

latency = 0;
uuid = 0;
sessionViewers = 1

function writeStatus(message) {
  document.getElementById("header").innerHTML = message
}

function updateStatus() {
    sessionToken = "correct-horse-battery-staple";
    message = "This is " + sessionToken + ", you are one of " + sessionViewers + " viewers. Latency to server is " + latency + "ms"
    writeStatus(message);
}

surpressEventTransmission = 1;

$( document ).ready(function() {
    jQuery(document.body).on('click', function(event) {
        surpressEventTransmission = 0;
    });
});

socket.onopen = function(e) {
    socket.send(JSON.stringify({
        command: "requestCreateSession"
    }));

    writeStatus("Connected. Waiting for instructions from puppet master.")
};

socket.onmessage = function(event) {
    message = JSON.parse(event.data)
    //console.log(message)

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
            surpressEventTransmission = 0;

            e.preventDefault()
            setTimeout(function() {
                delayedPlay = 1;
                if (socket.readyState === socket.OPEN) {
                    mainPlayer.play();
                }
            }, (latency * 2) / 1000)
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
    }
  if (message.command == "setMediaSource") {
      mainPlayer.src = message.sourceurl;
      mainPlayer.pause();
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
    writeStatus("Connection load. Reloading...")
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
