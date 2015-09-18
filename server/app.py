import pusher
import secret
import json

from flask import Flask # requires `pip install flask`
from flask import render_template
from flask import request
app = Flask(__name__)

p = pusher.Pusher(
    app_id=secret.pusher['app_id'],
    key=secret.pusher['key'],
    secret=secret.pusher['secret']
    )

@app.route("/notification")
def trigger_notification():
    p.trigger('git_notifications', 'push', {'user': 'kklin', 'repo': 'test', 'message': 'hello world'})
    return "Notification triggered!"

# someone pushed to Git
@app.route("/git", methods=['POST'])
def push_notification():
    parsed = json.loads(request.data)
    repo = parsed.get('repository',{}).get('full_name','NO_REPO')
    for commit in parsed.get('commits',[]):
        p.trigger('git_notifications', 'push', {'user': commit.get('author',{}).get('username','NO_USERNAME'),
                                                'repo': repo,
                                                'message': commit.get('message','NO_MESSAGE')})
    return "Success"

if __name__ == "__main__":
    app.run(debug=True)
