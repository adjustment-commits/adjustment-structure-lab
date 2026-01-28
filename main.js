const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const angleDisplay = document.getElementById("angleDisplay");

/* ———————–
Utility
———————– */

function vector(a,b){
return {x:b.x-a.x,y:b.y-a.y};
}

function magnitude(v){
return Math.sqrt(v.xv.x+v.yv.y);
}

function dot(a,b){
return a.xb.x+a.yb.y;
}

function angleBetween(v1,v2){
const cos = dot(v1,v2)/(magnitude(v1)magnitude(v2));
const rad = Math.acos(Math.min(Math.max(cos,-1),1));
return rad180/Math.PI;
}

/* ———————–
MediaPipe Pose
———————– */

const pose = new Pose({
locateFile: (file)=>https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}
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

camera.start();

/* ———————–
Main
———————– */

function onResults(results){

canvasElement.width = videoElement.videoWidth;
canvasElement.height = videoElement.videoHeight;

canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);

if(!results.poseLandmarks) return;

drawConnectors(canvasCtx,results.poseLandmarks,POSE_CONNECTIONS,
{color:"#555",lineWidth:2});

drawLandmarks(canvasCtx,results.poseLandmarks,
{color:"#22c55e",lineWidth:1});

/* landmarks */
const LShoulder = results.poseLandmarks[11];
const RShoulder = results.poseLandmarks[12];
const RElbow = results.poseLandmarks[14];

/* Thorax Vector (Left Shoulder -> Right Shoulder) */
const thorax = vector(LShoulder,RShoulder);

/* Arm Vector (Right Shoulder -> Right Elbow) */
const arm = vector(RShoulder,RElbow);

/* Angle */
const sepAngle = angleBetween(thorax,arm);
angleDisplay.textContent = sepAngle.toFixed(1)+"°";

/* Draw vectors */
drawLine(LShoulder,RShoulder,"#38bdf8");
drawLine(RShoulder,RElbow,"#facc15");
}

/* ———————–
Drawing Helpers
———————– */

function drawLine(a,b,color){
canvasCtx.beginPath();
canvasCtx.moveTo(a.xcanvasElement.width,a.ycanvasElement.height);
canvasCtx.lineTo(b.xcanvasElement.width,b.ycanvasElement.height);
canvasCtx.strokeStyle=color;
canvasCtx.lineWidth=4;
canvasCtx.stroke();
}
