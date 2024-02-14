let isGenerating = false; 

let promptInputField = document.getElementById("prompt-input-field");     
let generateButton = document.getElementById("generate-button");
let videoLoaderMessage = document.getElementById("video-loader-message");
let progressPercentage = document.getElementById("progress-percentage");

let mainVideoFrame = document.getElementById("main-video-frame");
let progressLoaderContent = document.getElementById("progress-loader-content");

let circularProgressBar = document.getElementById("progress-bar");

let currentSocket; 

let currentRequestId = "";

promptInputField.focus();

promptInputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        onGenerateButtonClicked();
    }
});
  

document.getElementById("cta-button").onclick = function () {
    // TODO: Animate the sparkling icon in the prompt box
    promptInputField.focus();
}

generateButton.onclick = onGenerateButtonClicked;

function onGenerateButtonClicked() {

    if (isGenerating) {
        cancelVideoGeneration();
        return;
    }

    startVideoGeneration();
}

for (const element of document.getElementsByClassName('bubble')) {
    element.onclick = function () {
        promptInputField.value = element.textContent;
        onGenerateButtonClicked();
    }
}

async function cancelVideoGeneration() {
    // Attempt to cancel video generation
    await (await fetch('cancel-video-generation', {
        method: 'POST',
        headers: {'Content-Type':'Text/plain; charset=us-ascii'},
        body: currentRequestId
    }));
    generateButton.innerHTML = "Cancelling";
}

function updateCircularProgress(progress) {
    circularProgressBar.style.background = `radial-gradient(closest-side, #111 79%, transparent 80% 100%), conic-gradient(hotpink ${progress}%, pink 0)`
}

function getPortNumber() {
    if (window.location.port != "") return window.location.port;
    
    if (window.location.protocol.startsWith("https")) return "443";
    return "80";
}

async function startVideoGeneration() {
    // Validate the prompt
    if (promptInputField.value.trim() == "") {
        alert("Please enter some prompt before proceeding!");
        return;
    }

    isGenerating = true;

    // Update/animate the UI as required
    document.getElementById("user-prompt-box").classList.add("user-prompt-box-expanded");
    document.getElementById("main-background-message").style.animation = "fadeOutDisappear 0.5s ease forwards";
    document.getElementById("main-user-prompt-text").style.animation = "fadeOutDisappear 0.5s ease forwards";
    document.getElementById("suggestions-box").style.animation = "fadeOutDisappear 0.5s ease forwards";
    document.getElementById("video-loader-box").style.animation = "videoBoxExpand 0.7s ease forwards";        

    progressLoaderContent.style.display = "block";
    mainVideoFrame.style.display = "none";
    mainVideoFrame.src="";

    videoLoaderMessage.innerHTML = "Waiting for response from server...";
    progressPercentage.innerHTML = "--";

    document.getElementById("video-loader-box").addEventListener("animationend", () => {
        document.getElementById("video-loader-box-content").style.display = "flex";
    });

    generateButton.innerHTML = "Cancel";
    generateButton.style.backgroundColor = "#DC3545";

    promptInputField.disabled = true;

    currentRequestId = await (await fetch('request-video-generation', {
        method: 'POST',
        headers: {'Content-Type':'Text/plain; charset=us-ascii'},
        body: promptInputField.value
    })).text();

    currentSocket = io.connect(location.hostname);
    
    currentSocket.on("connect", function(data){
        console.log("listening connected...");
        currentSocket.emit("video-generation-request", currentRequestId);
    });

    let queueCounter = -1;

    currentSocket.on(`video-generation-status-${currentRequestId}`, function(data) {                
        // console.log(data);

        if (data.type == "queue") {

            if (queueCounter == -1) queueCounter = data.pending;

            let cProgress = (1 - (data.pending / queueCounter)) * 100;

            videoLoaderMessage.innerHTML = data.message;
            progressPercentage.innerHTML = `${data.pending}/${queueCounter}`;
            updateCircularProgress(cProgress);

            return;
        }

        if (data.type == "progress") {

            videoLoaderMessage.innerHTML = data.message;
            progressPercentage.innerHTML = `${data.progress}%`;

            updateCircularProgress(data.progress);

            return;
        }

        if (data.type == "completed") {

            let videoUrl = data.url;

            progressLoaderContent.style.display = "none";
            mainVideoFrame.style.display = "block";
            mainVideoFrame.src = videoUrl;
            
            isGenerating = false;

            generateButton.innerHTML = "Generate";
            generateButton.style.backgroundColor = "#B95BDA";                

            promptInputField.disabled = false;

            return;
        }

        if (data.type == "error") {                    
            videoLoaderMessage.innerHTML = data.message;
            progressPercentage.innerHTML = ": /";

            // Perform remaining UI changes etc.
            isGenerating = false;                    

            generateButton.innerHTML = "Generate";
            generateButton.style.backgroundColor = "#B95BDA";                

            promptInputField.disabled = false;

            return;                    
        }


        if (data.type == "cancelled") {
            
            progressPercentage.innerHTML = "?";
            videoLoaderMessage.innerHTML = data.message;

            // Perform remaining UI changes etc.
            isGenerating = false;

            generateButton.innerHTML = "Generate";
            generateButton.style.backgroundColor = "#B95BDA";                

            promptInputField.disabled = false;

            return;
        }

    });
}

