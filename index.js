function pasteToken() {

    // Request access to clipboard contents
    navigator.clipboard.readText().then((value) => {

        // If clipboard contents contains two dashes ("a-b-c")
        if ((value.match(/-/g) || []).length == 2) {

            // Paste the clipboard contents into the text box
            document.getElementById("tokenEntry").value = value.trim();
        
            document.getElementById("tokenForm").submit();

        } else {

            // The clipboard doesn't contain a token

        }
    });
}