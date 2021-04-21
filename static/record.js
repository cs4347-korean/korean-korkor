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

// Sample change button
var sample1Button = document.getElementById("sample1");
var sample2Button = document.getElementById("sample2");
var sample3Button = document.getElementById("sample3");

sample1Button.addEventListener("click", changeToSampleOne);
sample2Button.addEventListener("click", changeToSampleTwo);
sample3Button.addEventListener("click", changeToSampleThree);

function changeToSampleOne() {
	document.getElementById("canonical").innerHTML = "제 가족은 모두 여덟 명이에요. 부모님, 누나, 형, 남동생 두 명, 여동생 한 명이 있어요.";
	sample1Button.classList.add("active");
	sample2Button.classList.remove("active");
	sample3Button.classList.remove("active");
}

function changeToSampleTwo() {
	document.getElementById("canonical").innerHTML = "집에 부모님, 저, 동생이 있어요. 하지만 누나는 지금 일본에 있어요.";
	sample1Button.classList.remove("active");
	sample2Button.classList.add("active");
	sample3Button.classList.remove("active");
}

function changeToSampleThree() {
	document.getElementById("canonical").innerHTML = "누나는 회사원이에요. 형은 요리사예요. 저, 제 동생은 모두 대학교에 다녀요.";
	sample1Button.classList.remove("active");
	sample2Button.classList.remove("active");
	sample3Button.classList.add("active");
}

var blob;

function startRecording() {
	console.log("recordButton clicked");
	document.getElementById("instruction").innerHTML = 'Your result will appear here when you upload your recording!';
	document.getElementById("instruction2").innerHTML = 'Your result will appear here when you upload your recording!';
	document.getElementById("recordingContainer").innerHTML = '';

	document.getElementById("transcription").innerHTML = '';
	document.getElementById("user-transcription").innerHTML = '';

	document.getElementById("transcription-phoneme").innerHTML = '';
	document.getElementById("user-transcription-phoneme").innerHTML = '';
	
	document.getElementById("ros").innerHTML = '';
	document.getElementById("ar").innerHTML = '';
	document.getElementById("ptr").innerHTML = '';
	document.getElementById("wpm").innerHTML = '';
	document.getElementById("wcpm").innerHTML = '';

	document.getElementById("google-transcription").innerHTML = '';
	document.getElementById("google-user-transcription").innerHTML = '';

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
	var finalText = '<strong>Original text: </strong>';

	// Process the text
	for (let i = 0; i < list.length; i++) {
		var pair = list[i]
		if (pair[0] == pair[1]) {
			finalText += '<strong class="text-success">' + pair[0] + '</strong>'
		} else {
			finalText += '<strong class="text-danger">' + pair[0] + '</strong>'
		}
	}

	var googleList = json.google_matched_text;
	var finalGoogleText = '<strong>Original text: </strong>';

	// Process the text
	for (let i = 0; i < googleList.length; i++) {
		var pair = googleList[i]
		if (pair[0] == pair[1]) {
			finalGoogleText += '<strong class="text-success">' + pair[0] + '</strong>'
		} else {
			finalGoogleText += '<strong class="text-danger">' + pair[0] + '</strong>'
		}
	}

	var phonemeList = json.matched_phonemes;
	var finalPhoneme = '<strong>Original text: </strong>';

	// Process the text
	for (let i = 0; i < phonemeList.length; i++) {
		var pair = phonemeList[i]
		if (pair[0] == pair[1]) {
			finalPhoneme =+ '<strong class="text-success">' + pair[0] + '</strong>'
		} else {
			finalPhoneme += '<strong class="text-danger">' + pair[0] + '</strong>'
		}
	}

	document.getElementById("instruction").innerHTML = '';
	document.getElementById("instruction2").innerHTML = '';
	document.getElementById("recordingContainer").innerHTML = '';
	
	document.getElementById("transcription").innerHTML = finalText;
	document.getElementById("user-transcription").innerHTML = '<strong>What you read: </strong>' + json.transcription;
	
	document.getElementById("transcription-phoneme").innerHTML = finalPhoneme;
	document.getElementById("user-transcription-phoneme").innerHTML = '<strong>What you read: </strong>' + json.phoneme_transcription;

	document.getElementById("ros").innerHTML = '<strong>Rate of Speech: </strong>' + Math.round(json.ROS * 100) / 100;
	document.getElementById("ar").innerHTML = '<strong>Articulation Rate: </strong>' + Math.round(json.AR * 100) / 100;
	document.getElementById("ptr").innerHTML = '<strong>Phonation Time Ratio: </strong>' + Math.round(json.PTR * 100) / 100;
	document.getElementById("wpm").innerHTML = '<strong>Word Count Per Minute: </strong>' + Math.round(json.WPM * 100) / 100;
	document.getElementById("wcpm").innerHTML = '<strong>Word Correct Per Minute : </strong>' + Math.round(json.WCPM * 100) / 100;

	document.getElementById("google-transcription").innerHTML = finalGoogleText;
	document.getElementById("google-user-transcription").innerHTML = '<strong>What you read: </strong>' + json.google_transcription;
}

function showError() {
	document.getElementById("instruction").innerHTML = 'An error has occurred. Please try recording again!';
	document.getElementById("instruction2").innerHTML = 'An error has occurred. Please try recording again!';
	document.getElementById("recordingContainer").innerHTML = '';

	document.getElementById("transcription").innerHTML = '';
	document.getElementById("user-transcription").innerHTML = '';
	
	document.getElementById("transcription-phoneme").innerHTML = '';
	document.getElementById("user-transcription-phoneme").innerHTML = '';	
	
	document.getElementById("ros").innerHTML = '';
	document.getElementById("ar").innerHTML = '';
	document.getElementById("ptr").innerHTML = '';
	document.getElementById("wpm").innerHTML = '';
	document.getElementById("wcpm").innerHTML = '';

	document.getElementById("google-transcription").innerHTML = '';
	document.getElementById("google-user-transcription").innerHTML = '';
}
