import os
import traceback
from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit
import uuid 
from time import sleep

# Directory paths to important folders
static = os.path.join(os.path.dirname(__file__), 'static')
generated_dir = os.path.join(os.path.dirname(__file__), '.generated')
os.makedirs(generated_dir, exist_ok=True) # ensure the generated dir exists

app = Flask(__name__, static_url_path="", static_folder="static")
app.config['SECRET_KEY'] = 'secret!'


socket = SocketIO(app)
socket.init_app(app, cors_allowed_origins="*")

PROGRESS_UPDATE_DELAY_IN_S = 1

video_generation_requests = {}

@app.route('/')
def index():
    return send_from_directory(static, 'index.html')

@app.route('/research')
def research_page():
    return send_from_directory(static, 'research.html')

@app.route('/product')
def product_page():
    return send_from_directory(static, 'product.html')

@app.route('/examples')
def examples_page():
    return send_from_directory(static, 'examples.html')

@app.route("/request-video-generation", methods=["POST"])
def request_video_generation():
    uid = str(uuid.uuid1())
    prompt = request.get_data()
    video_generation_requests[uid] = prompt
    return uid

@app.route("/cancel-video-generation", methods=["POST"])
def cancel_video_generation():
    uid = str(request.get_data(), 'UTF-8')
    print(uid)
    if uid in video_generation_requests:
        video_generation_requests.pop(uid)
        print(video_generation_requests.get(uid))
    return ""

@app.route("/get-generated-video")
def download_generated_video():
    uid = str(request.get_data(), 'UTF-8')
    # generated_file_name = f"{uid}.mp4"
    generated_file_name = "testvideo.mp4"
    return send_from_directory(generated_dir, generated_file_name)


def ensure_request_not_cancelled(uid):
    if uid in video_generation_requests: return True
    message = {}
    message["type"] = "cancelled"
    message["message"] = "The video generation request has been cancelled!"
    socket.emit("video-generation-status", message)
    return False

@socket.on('video-generation-request')
def video_generation_request(uid):  

    if uid not in video_generation_requests:
        message = {}
        message["type"] = "error"
        message["message"] = "Unable to find request ID"
        socket.emit("video-generation-status", message)
        return
    

    progress = 0
    queue_wait = 5 # Fetch the latest number of waiting requests

    try:
        # Simulate waiting in a queue
        while ensure_request_not_cancelled(uid):
            if queue_wait == 0: break
            message = {}
            message["type"] = "queue"
            message["message"] = "Waiting for other videos to complete..."
            message["pending"] = queue_wait
            socket.emit("video-generation-status", message)        
            sleep(PROGRESS_UPDATE_DELAY_IN_S)
            if not ensure_request_not_cancelled(uid): break
            queue_wait -= 1

        # Temporarily simulate progress (until the model is ready for integration)
        while ensure_request_not_cancelled(uid):        
            if progress > 100: break
            message = {}
            message["type"] = "progress"
            message["message"] = "Generating video from given prompt...."
            message["progress"] = progress
            socket.emit("video-generation-status", message)
            sleep(PROGRESS_UPDATE_DELAY_IN_S)
            progress += 10

        if not ensure_request_not_cancelled(uid): return
        
        # Let's assume that the video has been generated here, so now we'll just be notifying the user
        # about the progress
        message = {}
        message["type"] = "completed"
        message["url"] = "/testvideo.mp4" # /get-generated-video
        socket.emit("video-generation-status", message)
    except:
        traceback.print_exc()
        message = {}
        message["type"] = "error"
        message["message"] = "An unexpected error occurred while generating the video"
        socket.emit("video-generation-status", message)


if __name__ == "__main__":
    socket.run(app, debug=True)