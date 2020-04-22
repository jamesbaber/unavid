socket = new WebSocket("wss://b.unavid.co.uk");

function setStatus(st) {
  document.getElementById("message").innerHTML = st
}

socket.onopen = function(e) {
  setStatus("Connected!")
  socket.send(JSON.stringify() {
    command: "requestCreateSession"
  });
};

socket.onmessage = function(event) {
  setStatus("Message!")
  message = JSON.parse(event.data)
};

socket.onclose = function(event) {
  if (event.wasClean) {
    alert("Conn closed");
  } else {
    alert("Conn dead");
  }
};

socket.onerror = function(error) {
  alert(error.message);
};
