import os
from flask_script import Manager

from app import app

app.config.from_object(os.environ['APP_SETTINGS'])

manager = Manager(app)


if __name__ == '__main__':
    manager.run()
