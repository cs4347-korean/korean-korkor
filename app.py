import os
from flask import Flask, render_template, request, jsonify, make_response
from base64 import b64encode
import json, requests, re
from kaldialign import align
from datetime import datetime

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
    f = request.files['file']
    base64_str = b64encode(f.read()).decode('utf-8')

    canonical = request.form['canonical'].strip()

    # Get pure hangeul
    cleaned_canonical = ""
    for char in canonical:
        if re.match("[\uac00-\ud7a3]", char):
            cleaned_canonical += char

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


    to_return = {
        "transcription": trans,
        "confidence": conf,
        "matched_text": matched_text,
        "score": score
    }

    # Save file in database for analysis purpose
    filename = datetime.today().strftime('%Y-%m-%d_%H:%M:%S')
    with open('audio/' + filename + '.wav', 'wb') as audio:
        f.save(audio)
    print('Saved audio file')

    return make_response(jsonify(to_return), 200)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=80)
