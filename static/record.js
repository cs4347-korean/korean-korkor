// Credit: https://github.com/addpipe/simple-recorderjs-demo

//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var uploadButton = document.getElementById("uploadButton");

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
uploadButton.addEventListener("click", uploadRecording);

var blob;

function startRecording() {
	console.log("recordButton clicked");
	document.getElementById("recordingContainer").innerHTML = '';
	document.getElementById("transcription").innerHTML = 'Your result will appear here when you upload your recording!';
	document.getElementById("confidence").innerHTML = '';

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	recordButton.disabled = true;
	stopButton.disabled = false;
	uploadButton.disabled = true;

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
		audioContext = new AudioContext();

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels: 1})

		//start the recording process
		rec.record()

		document.getElementById("recordingContainer").innerHTML = 'Recording in progress...';

		console.log("Recording started");
	}).catch(function(err) {
		console.log(err);
	  	//enable the record button if getUserMedia() fails
    	recordButton.disabled = false;
    	stopButton.disabled = true;
	});
}

function stopRecording() {
	console.log("stopButton clicked");

	//disable the stop button, enable the record too allow for new recordings
	stopButton.disabled = true;
	recordButton.disabled = false;
	uploadButton.disabled = false;
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
}

async function uploadRecording() {
	console.log("uploadButton clicked");

	var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
            if (xmlhttp.status == 200) {
                console.log('200 success returned')
                var json = JSON.parse(xmlhttp.responseText);
                showResults(json);
            }
            else if (xmlhttp.status == 400) {
                console.log('There was an error 400');
                showError();
            }
            else {
                console.log('something else other than 200 was returned');
                showError();
            }
        }
    };
	
	var fd = new FormData();
	var url = document.getElementsByTagName("audio")[0].getAttribute("src");
	let blob = await fetch(url).then(r => r.blob());
	fd.append('file', blob);
	var canonical = document.getElementById("canonical").innerHTML
	fd.append('canonical', canonical)
	
	xmlhttp.open("POST", "/upload", true);
	xmlhttp.send(fd);
	
	document.getElementById("recordingContainer").innerHTML = 'Uploading succeeded! Loading for results below...';
	recordButton.disabled = false;
	stopButton.disabled = true;
	uploadButton.disabled = true;
}

function createDownloadLink(blob) {
	var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var div = document.createElement('div');

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//add the new audio element to li
	div.appendChild(au);

	//add the li element to the ol
	document.getElementById("recordingContainer").innerHTML = '';
	document.getElementById("recordingContainer").append(div);
}

function showResults(json) {
	var list = json.matched_text;
	var canonical = document.getElementById('canonical').innerHTML;
	var korRegex = "[\uac00-\ud7a3]";
	var finalText = '<strong>Transcription: </strong>';
	var listCount = 0;

	// Process the text
	for (let i = 0; i < canonical.length; i++) {
		var currChar = canonical[i];
		if (currChar.match(korRegex)) {  // Only match the Korean characters
			var pair = list[listCount];
			if (pair[0] == pair[1]) {
				finalText += pair[0]
			} else {
				finalText += '<strong class="text-danger">' + pair[0] + '</strong>'
			}

			listCount++;
		} else {  // It is a punctuation, space, etc
			finalText += currChar
		}
	}
	
	document.getElementById("transcription").innerHTML = finalText;
	document.getElementById("confidence").innerHTML = '<strong>Confidence: </strong>' + json.confidence;
	document.getElementById("recordingContainer").innerHTML = '';
}

function showError() {
	document.getElementById("transcription").innerHTML = 'An error has occurred. Please try recording again!';
	document.getElementById("confidence").innerHTML = '';
	document.getElementById("recordingContainer").innerHTML = '';
}