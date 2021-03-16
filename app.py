import os, requests
from flask import Flask, render_template

app = Flask(__name__)

app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

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
	print("receive upload request")
	# TODO: Process audio
	return 'Success', 200

if __name__ == "__main__":
    app.run(debug=True)
