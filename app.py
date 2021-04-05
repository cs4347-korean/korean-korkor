import os
from flask import Flask, render_template, request, jsonify, make_response
from base64 import b64encode
import json, requests, re
from kaldialign import align
from datetime import datetime
import librosa
import soundfile as sf
import subprocess

app = Flask(__name__)

app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
google_api_key = os.environ['GOOGLE_API_KEY']

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/record")
def record():
    return render_template("record.html")

@app.route("/upload", methods=['POST'])
def upload():
    wav_file = request.files['file']
    canonical = request.form['canonical'].strip()

    # Create the AUDIO_INFO file in test_prod
    f = open("../kaldi/egs/zeroth_korean/s5/test_prod/AUDIO_INFO", "w")
    f.write("SPEAKERID|NAME|SEX|SCRIPTID|DATASET\n")
    f.write("117|EugeneTan|m|003|test_prod\n")
    f.close()
    print('Created audio info')
    
    # Create a directory containing the audio and the canonical text
    f = open("../kaldi/egs/zeroth_korean/s5/test_prod/new/003/117/117_003.trans.txt", "w")
    f.write("117_003_0008 " + canonical + "\n")
    f.close()
    print('Created canonical transcript')

    # Do the necessary conversion: 44.1kHz wav -> 16kHz flac
    data, samplingrate = librosa.load(wav_file, sr=16000)  # Downsampling
    sf.write('../kaldi/egs/zeroth_korean/s5/test_prod/new/003/117/117_003_0008.flac', data, samplingrate, format='flac')  # Save FLAC in the right directory
    print('Created FLAC file')

    # Remove data/new
    os.system("rm -r /home/sadm/Desktop/kaldi/egs/zeroth_korean/s5/data/new")
    print('Removed data/new')

    # Execute run_test_audio_gmm.sh
    os.chdir("../kaldi/egs/zeroth_korean/s5")
    subprocess.call("./run_test_audio_gmm.sh")
    os.chdir("../../../../korean-korkor")
    print('Done executing bash')

    # Read ROS, AR and PTR
    f = open("../kaldi/egs/zeroth_korean/s5/exp/tri4_new_align/rate_evaluation.txt", "r")
    arr = f.read().split("\n")
    stats = {}
    stats['ROS'] = float(arr[0][4:])
    stats['AR'] = float(arr[1][3:])
    stats['PTR'] = float(arr[2][4:])
    f.close()

    # Read transcription
    f = open("../kaldi/egs/zeroth_korean/s5/exp/tri4/decode_tgsmall_new/one_best_transcription.txt", "r")
    arr = f.read()
    stats['transcription'] = arr[13:-1]  # Trim 13-letter code and ending line break
    f.close()

    # Get duration
    f = open("../kaldi/egs/zeroth_korean/s5/data/new/utt2dur", "r")
    arr = f.read()
    stats['duration'] = float(arr[13:-1])  # Similar format to transcription
    f.close()

    # Get pure hangeul
    cleaned_canonical = ""
    for char in canonical:
        if re.match("[\uac00-\ud7a3]", char):
            cleaned_canonical += char
    
    # For Google STT API
    '''
    base64_str = b64encode(wav_file.read()).decode('utf-8')
    url = 'https://speech.googleapis.com/v1p1beta1/speech:recognize?key=' + google_api_key
    json_body = {
        "audio": {
            "content": base64_str
        },
        "config": {
            "enableAutomaticPunctuation": False,
            "encoding": "LINEAR16",
            "languageCode": "ko-KR",
            "model": "default"
        }
    }

    res = requests.post(url, data=json.dumps(json_body))
    
    # Get the transcription with the highest confidence
    trans = res.json()['results'][0]['alternatives'][0]['transcript']
    conf = res.json()['results'][0]['alternatives'][0]['confidence']
    '''

    # Using kaldi results
    trans = stats['transcription']
    conf = 1  # Kaldi does not generate confidence

    # Clean transcript
    cleaned_trans = ""
    for char in trans:
        if re.match("[\uac00-\ud7a3]", char):
            cleaned_trans += char

    matched_text = align(cleaned_canonical, cleaned_trans, "*")

    # Count the number of correct characters
    correct = 0
    for pair in matched_text:
    	if pair[0] == pair[1]:
    		correct += 1
    score = correct/len(matched_text)

    # Calculate WPM and words correct per minute
    wpm = len(cleaned_trans)/(stats['duration']/60)
    wcpm = correct/(stats['duration']/60)

    to_return = {
        "transcription": trans,
        "confidence": conf,
        "matched_text": matched_text,
        "score": score,
        "ROS": stats["ROS"],
        "AR": stats["AR"],
        "PTR": stats["PTR"],
        "WPM": wpm,
        "WCPM": wcpm,
    }

    # Save file in database for analysis purpose
    filename = datetime.today().strftime('%Y-%m-%d_%H:%M:%S')
    with open('audio/' + filename + '.wav', 'wb') as audio:
        wav_file.save(audio)
    print('Saved audio file')
    
    return make_response(jsonify(to_return), 200)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=80)
