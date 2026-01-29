const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const angleDisplay = document.getElementById("angleDisplay");
const startBtn = document.getElementById("startBtn");
const loadVideoBtn = document.getElementById("loadVideoBtn");
const resetBtn = document.getElementById("resetBtn");
const videoInput = document.getElementById("videoInput");

/* ===============================
Utility
=============================== */

function vector(a,b){
return { x: b.x - a.x, y: b.y - a.y };
}

function magnitude(v){
return Math.sqrt(v.x * v.x + v.y * v.y);
}

function dot(a,b){
return a.x * b.x + a.y * b.y;
}

function angleBetween(v1,v2){
const cos = dot(v1,v2) / (magnitude(v1) * magnitude(v2));
const rad = Math.acos(Math.min(Math.max(cos,-1),1));
return rad * 180 / Math.PI;
}

/* ===============================
MediaPipe Pose
=============================== */

const pose = new Pose({
locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
modelComplexity:1,
smoothLandmarks:true,
enableSegmentation:false,
minDetectionConfidence:0.5,
minTrackingConfidence:0.5
});

pose.onResults(onResults);

const camera = new Camera(videoElement,{
onFrame: async()=>{
await pose.send({image:videoElement});
},
width:640,
height:480
});

/* ===============================
Camera Start
=============================== */

startBtn.addEventListener("click",()=>{
camera.start();
startBtn.style.display="none";
});

/* ===============================
Reset
=============================== */

resetBtn.addEventListener("click",()=>{
  location.reload();
});

/* ===============================
Load Video
=============================== */

loadVideoBtn.addEventListener("click",()=>{
videoInput.click();
});

videoInput.addEventListener("change",(e)=>{
const file = e.target.files[0];
if(!file) return;

const url = URL.createObjectURL(file);
videoElement.src = url;
videoElement.play();
processVideo();
});

async function processVideo(){
if(videoElement.paused || videoElement.ended) return;
await pose.send({image:videoElement});
requestAnimationFrame(processVideo);
}

/* ===============================
Main
=============================== */

function onResults(results){

canvasElement.width = videoElement.videoWidth;
canvasElement.height = videoElement.videoHeight;

canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);

if(!results.poseLandmarks) return;

drawConnectors(
canvasCtx,
results.poseLandmarks,
POSE_CONNECTIONS,
{color:"#555",lineWidth:2}
);

drawLandmarks(
canvasCtx,
results.poseLandmarks,
{color:"#22c55e",lineWidth:1}
);

const LShoulder = results.poseLandmarks[11];
const RShoulder = results.poseLandmarks[12];
const RElbow    = results.poseLandmarks[14];

const thorax = vector(LShoulder,RShoulder);
const arm    = vector(RShoulder,RElbow);

const sepAngle = angleBetween(thorax,arm);
angleDisplay.textContent = sepAngle.toFixed(1) + "°";

drawLine(LShoulder,RShoulder,"#38bdf8");
drawLine(RShoulder,RElbow,"#facc15");
}

/* ===============================
Drawing Helpers
=============================== */

function drawLine(a,b,color){
canvasCtx.beginPath();
canvasCtx.moveTo(a.x * canvasElement.width,  a.y * canvasElement.height);
canvasCtx.lineTo(b.x * canvasElement.width,  b.y * canvasElement.height);
canvasCtx.strokeStyle = color;
canvasCtx.lineWidth = 4;
canvasCtx.stroke();
}
