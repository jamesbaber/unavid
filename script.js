socket = new WebSocket("wss://b.unavid.co.uk");

function writeStatus(message) {
  document.getElementById("header").innerHTML = message
}

function updateStatus() {
    sessionToken = "correct-horse-battery-staple";
    sessionViewerCount = 69;
    message = "This is " + sessionToken + ", you are one of " + sessionViewerCount + " viewers."
    writeStatus(message);
}

// Deduplication and echo removal
ignoreCommand = 0;
function setIgnore() {
    ignoreCommand = 1;
    setTimeout(function() {
        ignoreCommand = 0;
    }, 200)
}



socket.onopen = function(e) {
    socket.send(JSON.stringify({
        command: "requestCreateSession"
    }));

    writeStatus("Connected. Waiting for instructions from puppet master.")
};

socket.onmessage = function(event) {
    message = JSON.parse(event.data)

    var mainPlayer = document.getElementById("mainPlayer");

    mainPlayer.onpause = function() {
        if (ignoreCommand == 0) {
            socket.send(JSON.stringify({
                command: "requestPauseMedia"
            }));
        }
    };

    mainPlayer.onplay = function() {
        if (ignoreCommand == 0) {
            socket.send(JSON.stringify({
                  command: "requestPlayMedia"
            }))
        }
    };

    mainPlayer.onseeked = function() {
        if (ignoreCommand == 0) {
            socket.send(JSON.stringify({
                command: "requestSeek",
                time: mainPlayer.currentTime,
            }));
        }
    };




  if (message.command == "setMediaSource") {
      setIgnore();
      mainPlayer.src = message.sourceurl;
      mainPlayer.pause();
      updateStatus();
  }
  if (message.command == "pauseMedia") {
      mainPlayer.pause();
      setIgnore();
  }
  if (message.command == "playMedia") {
      mainPlayer.play();
      setIgnore();
  }

  if (message.command == "seek") {
      setIgnore();
      mainPlayer.currentTime = message.time;
  }
};

socket.onclose = function(event) {
  if (event.wasClean) {
    window.location.href = "index.html";
  } else {
    writeStatus("Connection error")
    //window.location.href = "index.html";
  }
};

socket.onerror = function(error) {
};
